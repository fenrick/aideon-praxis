# C4 Model Views

The Structurizr DSL source for Aideon Desktop's architecture views, and how to render them. These views are the
canonical diagrams of the system's shape; architecture documents reference them rather than redrawing the structure
_(Brown, The C4 Model for Visualising Software Architecture)_.

The single source is [`workspace.dsl`](./workspace.dsl). It is the design-time artefact; CI does not render diagrams.
Render locally only when a picture is needed for review or a document.

---

## The C4 levels used

The C4 model describes software at four levels of zoom. This workspace uses the first three; level 4 (code) is left to
the source and the per-module designs.

| Level                        | View                | What it shows                                                                                                                                                                      | Defined in `workspace.dsl` |
| ---------------------------- | ------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------- |
| **L1 — System Context**      | `system-context`    | The EA practitioner and the Aideon Desktop system as one box. Who uses it and what it is.                                                                                          | `systemContext aideon`     |
| **L2 — Container**           | `container`         | The renderer, the host, the domain engines, the canonical workspace folder, and the derived runtime — and the relationships between them, including the canonical→derived rebuild. | `container aideon`         |
| **L3 — Component (Host)**    | `host-components`   | Inside the host: the IPC and capability layer, workspace lifecycle, job orchestrator, event distribution, and the `engine` harness that wires the engines behind their traits.     | `component aideon.host`    |
| **L3 — Component (Engines)** | `engine-components` | Inside the domain engines: Praxis, Mneme, Metis, Chrona, Continuum, and the planned Lexis, Pylon, Sophia, and Kerux — behind traits, with Mneme as the only storage seam.          | `component aideon.engines` |

The two L3 views are where this workspace adds detail over the earlier two-view version: the host is decomposed to show
the engine harness, and the engines are decomposed to show the five current engines plus the four planned ones as
components. Planned engines are labelled `(planned)` in their names so a reader cannot mistake design intent for an
existing crate.

The container and component structure matches the crate dependency graph in
[`../module-dependency-map.md`](../module-dependency-map.md) and the boundary diagram in
[`../boundary/README.md`](../boundary/README.md); the three views are the same architecture at three zoom levels.

---

## A note on the word "viewpoint"

A C4 view is, in ISO/IEC/IEEE 42010:2022 terms, a **view** governed by an **architecture viewpoint (42010)**. This is
_not_ the product's **Viewpoint** (the bitemporal query frame). The 01-architecture [`README.md`](../README.md) §7 maps
these architecture viewpoints (42010) to stakeholders and concerns. Throughout this corpus the bare word **Viewpoint**
always means the product's query frame.

---

## How to render

Rendering is optional and local. Requirements: Java 17+ and Graphviz (`dot`).

**Option A — Structurizr CLI + PlantUML**

1. Download the Structurizr CLI to a temporary location:
   - macOS/Linux:
     - `TMP_ZIP=$(mktemp -t structurizr-cli.XXXXXX.zip)`
     - `curl -fSL -o "$TMP_ZIP" https://github.com/structurizr/cli/releases/latest/download/structurizr-cli.zip`
     - `mkdir -p .tools/structurizr-cli && unzip -q -o "$TMP_ZIP" -d .tools/structurizr-cli && rm -f "$TMP_ZIP"`
   - Windows (PowerShell):
     - `$tmp = New-TemporaryFile; Invoke-WebRequest -OutFile $tmp https://github.com/structurizr/cli/releases/latest/download/structurizr-cli.zip; Expand-Archive -Force $tmp .tools/structurizr-cli; Remove-Item $tmp`
2. Download PlantUML (or use a system package):
   - `mkdir -p .tools/plantuml && curl -fSL -o .tools/plantuml/plantuml.jar https://github.com/plantuml/plantuml/releases/latest/download/plantuml.jar`
3. Export to PlantUML and render PNGs:
   - `mkdir -p docs/01-architecture/c4/out/plantuml docs/01-architecture/c4/out/png`
   - `java -jar .tools/structurizr-cli/structurizr-cli-*.jar export -workspace docs/01-architecture/c4/workspace.dsl -format plantuml -output docs/01-architecture/c4/out/plantuml`
   - `java -Djava.awt.headless=true -jar .tools/plantuml/plantuml.jar -tpng docs/01-architecture/c4/out/plantuml/*.puml -o docs/01-architecture/c4/out/png`

**Option B — Docker**

- `docker run --rm -v "$PWD":/work ghcr.io/structurizr/cli:latest export -workspace /work/docs/01-architecture/c4/workspace.dsl -format plantuml -output /work/docs/01-architecture/c4/out/plantuml`
- Then render PNGs via a PlantUML container or local tools.

Outputs land under `docs/01-architecture/c4/out/` and are gitignored — they are generated, not committed.

---

## Files

- [`workspace.dsl`](./workspace.dsl) — the DSL source: System Context (L1), Container (L2), and two Component views
  (L3).
- `out/` — local exports (not committed).

---

## References & standards

_Normative for these diagrams:_

- Brown — **The C4 Model for Visualising Software Architecture**. _(view convention)_

_Informative:_

- **ISO/IEC/IEEE 42010:2022** — the architecture-viewpoint/view vocabulary these C4 views instantiate.

Full bibliography: [`../../02-standards/STANDARDS-REGISTER.md`](../../02-standards/STANDARDS-REGISTER.md).

## Related documents

| Document                                                     | What it covers                                                               |
| ------------------------------------------------------------ | ---------------------------------------------------------------------------- |
| [`../README.md`](../README.md)                               | The architecture layer index and the architecture-viewpoint (42010) mapping. |
| [`../module-dependency-map.md`](../module-dependency-map.md) | The crate dependency graph these views draw.                                 |
| [`../boundary/README.md`](../boundary/README.md)             | The boundary diagram at the same container level.                            |
