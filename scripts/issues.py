#!/usr/bin/env python3
"""
Single entrypoint for GitHub issue/project helpers (replaces multiple scripts).

Requires: GitHub CLI `gh` authenticated. Reads repo settings from env or git.

Usage:
  issues.py start <number>            # assign self, add in-progress, create branch
  issues.py mirror                    # write docs/issues/index.json mirror
  issues.py mirror --check            # exit non-zero if mirror stale vs GitHub

Env (optional):
  AIDEON_GH_REPO=owner/repo
"""
from __future__ import annotations
import argparse
import json
import os
import re
import subprocess
import sys
from pathlib import Path
from typing import Any


ROOT = Path(__file__).resolve().parent.parent
DOCS_ISSUES = ROOT / "docs" / "issues"
MIRROR_FILE = DOCS_ISSUES / "index.json"


def run(cmd: list[str], check: bool = True) -> subprocess.CompletedProcess[str]:
    return subprocess.run(cmd, check=check, text=True, capture_output=True)


def repo_slug() -> str:
    env_repo = os.environ.get("AIDEON_GH_REPO")
    if env_repo:
        return env_repo
    # Derive from git remote origin
    try:
        out = run(["git", "remote", "get-url", "origin"]).stdout.strip()
        m = re.search(r"[:/]([^/]+/[^/.]+)(?:\.git)?$", out)
        if m:
            return m.group(1)
    except Exception:
        pass
    raise SystemExit("AIDEON_GH_REPO not set and cannot derive from git remote")


def gh_json(args: list[str]) -> Any:
    cmd = ["gh", *args]
    res = run(cmd, check=True)
    return json.loads(res.stdout)


def cmd_start(args: argparse.Namespace) -> int:
    issue = str(args.number)
    repo = repo_slug()
    # Assign self and add in-progress label
    run(["gh", "issue", "edit", issue, "--repo", repo, "--add-assignee", "@me"], check=True)
    run(
        [
            "gh",
            "issue",
            "edit",
            issue,
            "--repo",
            repo,
            "--add-label",
            "status/in-progress",
        ],
        check=False,
    )
    # Get title for branch slug
    meta = gh_json(["issue", "view", issue, "--repo", repo, "--json", "title,number"])
    slug = re.sub(r"[^a-z0-9]+", "-", meta["title"].lower()).strip("-")
    branch = f"issue-{meta['number']}-{slug}"[:80]
    # Create/switch branch
    run(["git", "checkout", "-B", branch], check=True)
    print(f"[issues] started issue #{issue} on branch {branch}")
    return 0


def fetch_issues(repo: str) -> list[dict[str, Any]]:
    # Pull basic fields for mirror/check
    data = gh_json(
        [
            "issue",
            "list",
            "--repo",
            repo,
            "--state",
            "all",
            "--limit",
            "200",
            "--json",
            "number,title,state,labels,updatedAt,assignees,milestone",
        ]
    )
    # Normalize labels to names only
    for it in data:
        it["labels"] = sorted(
            [label.get("name") for label in it.get("labels", []) if isinstance(label, dict)]
        )
    return data


def cmd_mirror(args: argparse.Namespace) -> int:
    repo = repo_slug()
    try:
        live = fetch_issues(repo)
    except subprocess.CalledProcessError as exc:
        if args.check:
            # Non-blocking in CI/pre-push when gh is unavailable
            print(f"[issues] warn: gh failed in --check: {exc}", file=sys.stderr)
            return 0
        raise
    DOCS_ISSUES.mkdir(parents=True, exist_ok=True)
    if args.check:
        if not MIRROR_FILE.exists():
            print("[issues] mirror missing", file=sys.stderr)
            return 1
        try:
            cached = json.loads(MIRROR_FILE.read_text())
        except Exception:
            print("[issues] mirror unreadable", file=sys.stderr)
            return 1
        cached_map = {int(x["number"]): x for x in cached}
        changed = False
        for it in live:
            n = int(it["number"])
            c = cached_map.get(n)
            if (
                c is None
                or c.get("updatedAt") != it.get("updatedAt")
                or c.get("state") != it.get("state")
            ):
                changed = True
                break
        if changed:
            print("[issues] mirror stale", file=sys.stderr)
            return 1
        print("[issues] mirror up to date")
        return 0
    else:
        MIRROR_FILE.write_text(json.dumps(live, indent=2))
        print(f"[issues] wrote {MIRROR_FILE}")
        return 0


def main(argv: list[str]) -> int:
    ap = argparse.ArgumentParser(prog="issues")
    sub = ap.add_subparsers(dest="cmd", required=True)

    ap_start = sub.add_parser("start", help="assign, label, create/switch branch")
    ap_start.add_argument("number", type=int)
    ap_start.set_defaults(func=cmd_start)

    ap_mirror = sub.add_parser("mirror", help="mirror issues to docs/issues/index.json")
    ap_mirror.add_argument("--check", action="store_true", help="check if mirror is stale")
    ap_mirror.set_defaults(func=cmd_mirror)

    # Split: create child issues from items or a file and update parent checklist
    def cmd_split(ns: argparse.Namespace) -> int:
        repo = repo_slug()
        parent = str(ns.parent)
        items: list[str] = []
        if ns.items:
            items.extend(ns.items)
        if ns.file:
            fp = Path(ns.file)
            items.extend([ln.strip() for ln in fp.read_text().splitlines() if ln.strip()])
        if not items:
            print("[issues] no items provided", file=sys.stderr)
            return 1
        created: list[tuple[int, str]] = []
        for title in items:
            out = run(
                [
                    "gh",
                    "issue",
                    "create",
                    "--repo",
                    repo,
                    "--title",
                    title,
                    "--body",
                    f"Parent: #{parent}",
                    "--label",
                    "status/todo",
                    "--label",
                    "type/task",
                ],
                check=True,
            )
            m = re.search(r"/issues/(\d+)$", (out.stdout or out.stderr))
            if not m:
                print(f"[issues] created: {out.stdout.strip()}")
                continue
            num = int(m.group(1))
            created.append((num, title))
        # Update parent body with a checklist
        meta = gh_json(["issue", "view", parent, "--repo", repo, "--json", "body"])
        body = meta.get("body") or ""
        checklist = "\n".join([f"- [ ] #{n} {t}" for n, t in created])
        new_body = (
            body + ("\n\n### Subtasks\n" if "### Subtasks" not in body else "\n") + checklist + "\n"
        )
        run(["gh", "issue", "edit", parent, "--repo", repo, "--body", new_body], check=True)
        print(f"[issues] created {len(created)} subtasks under #{parent}")
        return 0

    ap_split = sub.add_parser("split", help="create child issues and update parent checklist")
    ap_split.add_argument("parent", type=int)
    ap_split.add_argument("--items", nargs="*", help="child issue titles")
    ap_split.add_argument("--file", help="file with one title per line")
    ap_split.set_defaults(func=cmd_split)

    # DoD: ensure a Definition of Done section exists
    DOD = (
        "\n\n### Definition of Done\n"
        "- CI: lint, typecheck, unit tests updated\n"
        "- Docs: user & dev docs updated (README/ADR/CHANGELOG)\n"
        "- Security: renderer IPC boundaries respected; no new ports\n"
        "- Performance: SLO notes or benches if applicable\n"
        "- UX: matches GitHub-inspired style (light/dark)\n"
        "- Packaging: macOS build verified (DMG/ZIP)\n"
        "- Tracking: PRs linked; Project Status updated; local mirror refreshed\n"
    )

    def cmd_dod(ns: argparse.Namespace) -> int:
        repo = repo_slug()
        issues = gh_json(
            [
                "issue",
                "list",
                "--repo",
                repo,
                "--label",
                "status/in-progress",
                "--state",
                "open",
                "--json",
                "number,body",
            ]
        )
        changed = 0
        for it in issues:
            n = str(it["number"])
            body = it.get("body") or ""
            if "### Definition of Done" in body:
                continue
            run(["gh", "issue", "edit", n, "--repo", repo, "--body", body + DOD], check=True)
            changed += 1
        print(f"[issues] ensured DoD on {changed} issues")
        return 0

    ap_dod = sub.add_parser("dod", help="ensure Definition of Done on in-progress issues")
    ap_dod.set_defaults(func=cmd_dod)

    ns = ap.parse_args(argv)
    return ns.func(ns)


if __name__ == "__main__":
    raise SystemExit(main(sys.argv[1:]))
