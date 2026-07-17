use std::collections::BTreeMap;
use std::fs;
use std::ops::Range;
use std::path::{Path, PathBuf};
use std::sync::Mutex;
use std::time::SystemTime;

use anyhow::{Context, Result, anyhow, bail};
use base64::Engine as _;
use base64::engine::general_purpose::STANDARD as BASE64;
use clap::Parser;
use hmac::{Hmac, KeyInit, Mac};
use md5::{Digest, Md5};
use serde::{Deserialize, Serialize};
use serde_json::Value;
use sha2::Sha256;

const LARA_BASE_URL: &str = "https://api.laratranslate.com";
/// Number of source strings sent per `/v2/translate` call, to keep request bodies small.
const TRANSLATE_BATCH_SIZE: usize = 100;
const MANIFEST_FILE_NAME: &str = "translation-status.json";

#[derive(Parser)]
pub struct TranslationSyncArgs {
    /// Path to the source locale file (keyed English strings), relative to the repo root.
    #[arg(long, default_value = "locales/en.json")]
    pub source: PathBuf,
    /// Directory to write translated locale files into (defaults to the source file's directory).
    #[arg(long)]
    pub out_dir: Option<PathBuf>,
    /// Target language codes to translate into.
    #[arg(long, value_delimiter = ',', default_value = "es,fr,de,ja")]
    pub targets: Vec<String>,
}

/// Read the source locale file, translate every string leaf into each target
/// language via the Lara API, and write `locales/<target>.json` files that
/// mirror the source key tree exactly.
pub async fn run(args: TranslationSyncArgs) -> Result<()> {
    let key_id = std::env::var("LARA_ACCESS_KEY_ID")
        .context("LARA_ACCESS_KEY_ID must be set (see .env.local)")?;
    let key_secret = std::env::var("LARA_ACCESS_KEY_SECRET")
        .context("LARA_ACCESS_KEY_SECRET must be set (see .env.local)")?;

    run_with(args, LARA_BASE_URL, LaraCredentials { key_id, key_secret }).await
}

/// Lara access-key credentials (id + secret) read from the environment.
struct LaraCredentials {
    key_id: String,
    key_secret: String,
}

async fn run_with(
    args: TranslationSyncArgs,
    base_url: &str,
    credentials: LaraCredentials,
) -> Result<()> {
    let raw = fs::read_to_string(&args.source)
        .with_context(|| format!("read {}", args.source.display()))?;
    let source: Value =
        serde_json::from_str(&raw).with_context(|| format!("parse {}", args.source.display()))?;
    let source_hash = sha256_hex(raw.as_bytes());

    let plan = plan_translation(&source);
    if plan.leaves.is_empty() {
        println!("no translatable strings found in {}", args.source.display());
        return Ok(());
    }
    warn_on_passthrough(plan.skipped);

    let out_dir = resolve_out_dir(&args);
    fs::create_dir_all(&out_dir)
        .with_context(|| format!("create_dir_all {}", out_dir.display()))?;

    let manifest_path = out_dir.join(MANIFEST_FILE_NAME);
    let mut manifest = load_manifest(&manifest_path, &args.source)?;
    manifest.source_sha256 = source_hash.clone();

    let client = LaraClient::new(base_url.to_string(), credentials)?;
    let ctx = SyncContext {
        client: &client,
        plan: &plan,
        source: &source,
        out_dir: &out_dir,
        manifest_path: &manifest_path,
        source_hash: &source_hash,
    };
    sync_targets(&ctx, &args.targets, &mut manifest).await
}

/// The classified source leaves plus the inputs derived from them once and
/// shared across every target locale: the masked texts to send to Lara and the
/// count of pass-through (untranslated) strings.
struct TranslationPlan {
    leaves: Vec<LeafPlan>,
    masked_texts: Vec<String>,
    skipped: usize,
}

/// Classify every source string leaf and derive the masked texts plus the
/// pass-through count for the whole run.
fn plan_translation(source: &Value) -> TranslationPlan {
    let mut leaves = Vec::new();
    plan_leaves(source, &mut leaves);

    let skipped = leaves
        .iter()
        .filter(|l| matches!(l, LeafPlan::PassThrough(_)))
        .count();

    let masked_texts = leaves
        .iter()
        .filter_map(|l| match l {
            LeafPlan::Translatable { masked, .. } => Some(masked.clone()),
            LeafPlan::PassThrough(_) => None,
        })
        .collect();

    TranslationPlan {
        leaves,
        masked_texts,
        skipped,
    }
}

/// Warn once that ICU plural/select strings were left untranslated.
fn warn_on_passthrough(skipped: usize) {
    if skipped > 0 {
        println!(
            "warning: {skipped} string(s) use ICU plural/select syntax and were left \
             untranslated (English) in every locale — they mix translatable text with \
             format keywords and need a human translator, not raw MT"
        );
    }
}

/// Resolve the directory locale files are written into: the explicit
/// `--out-dir`, else the source file's parent, else the current directory.
fn resolve_out_dir(args: &TranslationSyncArgs) -> PathBuf {
    args.out_dir
        .clone()
        .or_else(|| args.source.parent().map(PathBuf::from))
        .unwrap_or_else(|| PathBuf::from("."))
}

/// Shared, read-only context for translating one run's worth of target locales.
struct SyncContext<'a> {
    client: &'a LaraClient,
    plan: &'a TranslationPlan,
    source: &'a Value,
    out_dir: &'a Path,
    manifest_path: &'a Path,
    source_hash: &'a str,
}

/// Translate and write each requested target locale, updating the manifest as
/// each one succeeds or fails. Stops and returns the error on the first failure
/// (after recording it), matching the original per-target loop behaviour.
async fn sync_targets(
    ctx: &SyncContext<'_>,
    targets: &[String],
    manifest: &mut TranslationStatusManifest,
) -> Result<()> {
    for target in targets {
        if manifest.is_translated_at(target, ctx.source_hash) {
            let source_hash = ctx.source_hash;
            println!(
                "skipping '{target}': already translated at current en.json hash \
                 ({source_hash}) — no Lara call made"
            );
            continue;
        }

        match translate_and_write_locale(ctx, target).await {
            Ok(count) => {
                let skipped = ctx.plan.skipped;
                println!(
                    "wrote {} ({count} strings translated, {skipped} passed through, target '{target}')",
                    ctx.out_dir.join(format!("{target}.json")).display()
                );
                manifest.mark_translated(target, ctx.source_hash);
                save_manifest(ctx.manifest_path, manifest)?;
            }
            Err(err) => {
                manifest.mark_failed(target, &err.to_string());
                save_manifest(ctx.manifest_path, manifest)?;
                return Err(err);
            }
        }
    }

    Ok(())
}

/// Translate every masked leaf into `target` and write `out_dir/<target>.json`.
/// Returns the number of strings sent to Lara on success.
async fn translate_and_write_locale(ctx: &SyncContext<'_>, target: &str) -> Result<usize> {
    let masked_texts = &ctx.plan.masked_texts;
    let leaves = &ctx.plan.leaves;

    let mut translated_masked = Vec::with_capacity(masked_texts.len());
    for chunk in masked_texts.chunks(TRANSLATE_BATCH_SIZE) {
        let mut batch = ctx
            .client
            .translate_batch(chunk, target)
            .await
            .with_context(|| format!("translate batch to '{target}'"))?;
        translated_masked.append(&mut batch);
    }
    if translated_masked.len() != masked_texts.len() {
        bail!(
            "lara returned {} translations for {} source strings (target '{target}')",
            translated_masked.len(),
            masked_texts.len()
        );
    }

    let mut translated_iter = translated_masked.into_iter();
    let mut final_texts = Vec::with_capacity(leaves.len());
    for leaf in leaves {
        match leaf {
            LeafPlan::Translatable { tokens, .. } => {
                let masked_result = translated_iter
                    .next()
                    .expect("translated count matches masked text count");
                let unmasked = unmask_placeholders(&masked_result, tokens)
                    .with_context(|| format!("target '{target}'"))?;
                final_texts.push(unmasked);
            }
            LeafPlan::PassThrough(text) => final_texts.push(text.clone()),
        }
    }

    let mut iter = final_texts.into_iter();
    let rebuilt = rebuild_with_texts(ctx.source, &mut iter);
    let json = serde_json::to_string_pretty(&rebuilt)?;
    let out_path = ctx.out_dir.join(format!("{target}.json"));
    fs::write(&out_path, format!("{json}\n"))
        .with_context(|| format!("write {}", out_path.display()))?;
    Ok(masked_texts.len())
}

/// Tracks, per target locale, whether `locales/<lang>.json` reflects a real
/// Lara translation of the current `en.json` or is still an untranslated
/// placeholder — so reruns don't re-spend translation quota on locales
/// that are already up to date.
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
struct TranslationStatusManifest {
    source_file: String,
    source_sha256: String,
    locales: BTreeMap<String, LocaleStatus>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(tag = "status")]
enum LocaleStatus {
    #[serde(rename = "translated")]
    Translated {
        #[serde(rename = "translatedAtSourceSha256")]
        translated_at_source_sha256: String,
        #[serde(default, skip_serializing_if = "Option::is_none")]
        note: Option<String>,
    },
    #[serde(rename = "placeholder")]
    Placeholder {
        #[serde(skip_serializing_if = "Option::is_none")]
        note: Option<String>,
    },
}

impl TranslationStatusManifest {
    fn is_translated_at(&self, locale: &str, source_hash: &str) -> bool {
        matches!(
            self.locales.get(locale),
            Some(LocaleStatus::Translated { translated_at_source_sha256, .. })
                if translated_at_source_sha256 == source_hash
        )
    }

    fn mark_translated(&mut self, locale: &str, source_hash: &str) {
        self.locales.insert(
            locale.to_string(),
            LocaleStatus::Translated {
                translated_at_source_sha256: source_hash.to_string(),
                note: None,
            },
        );
    }

    /// Record a failed translate attempt for `locale`. If the locale was
    /// previously translated successfully, the real (if now stale) `<locale>.json`
    /// on disk must not be mislabeled as untranslated placeholder content —
    /// the `Translated` status and its last-good hash are kept, with only a
    /// failure note attached. Only locales with no prior successful
    /// translation get the "identical to en.json" placeholder framing.
    fn mark_failed(&mut self, locale: &str, error: &str) {
        let previous_hash = match self.locales.get(locale) {
            Some(LocaleStatus::Translated {
                translated_at_source_sha256,
                ..
            }) => Some(translated_at_source_sha256.clone()),
            _ => None,
        };

        let status = match previous_hash {
            Some(translated_at_source_sha256) => LocaleStatus::Translated {
                translated_at_source_sha256,
                note: Some(format!("Re-sync failed: {error}")),
            },
            None => LocaleStatus::Placeholder {
                note: Some(format!(
                    "Identical to en.json — translation failed: {error}"
                )),
            },
        };

        self.locales.insert(locale.to_string(), status);
    }
}

fn load_manifest(path: &Path, source_file: &Path) -> Result<TranslationStatusManifest> {
    if !path.exists() {
        return Ok(TranslationStatusManifest {
            source_file: source_file.display().to_string(),
            source_sha256: String::new(),
            locales: BTreeMap::new(),
        });
    }
    let raw = fs::read_to_string(path).with_context(|| format!("read {}", path.display()))?;
    serde_json::from_str(&raw).with_context(|| format!("parse {}", path.display()))
}

fn save_manifest(path: &Path, manifest: &TranslationStatusManifest) -> Result<()> {
    let json = serde_json::to_string_pretty(manifest)?;
    fs::write(path, format!("{json}\n")).with_context(|| format!("write {}", path.display()))
}

/// Hex-encoded SHA-256 digest, used to detect whether `en.json` changed since
/// a locale was last translated.
fn sha256_hex(bytes: &[u8]) -> String {
    Sha256::digest(bytes)
        .iter()
        .map(|b| format!("{b:02x}"))
        .collect()
}

/// A source string leaf, classified for MT safety.
enum LeafPlan {
    /// Safe to send to Lara: braces (if any) are simple `{name}` interpolation,
    /// masked with sentinel tokens and restored verbatim after translation.
    Translatable { masked: String, tokens: Vec<String> },
    /// Contains ICU plural/select/number/date syntax (a top-level `{...}` group
    /// with a comma). That syntax interleaves translatable text with
    /// untranslatable format keywords (`plural`, `=0`, `other`, ...), which
    /// naive masking cannot safely separate — left as English for a human
    /// translator instead of risking silently broken pluralization.
    PassThrough(String),
}

/// Depth-first walk classifying every string leaf, in source key order.
fn plan_leaves(value: &Value, out: &mut Vec<LeafPlan>) {
    match value {
        Value::String(s) => out.push(match mask_simple_placeholders(s) {
            Some((masked, tokens)) => LeafPlan::Translatable { masked, tokens },
            None => LeafPlan::PassThrough(s.clone()),
        }),
        Value::Object(map) => {
            for v in map.values() {
                plan_leaves(v, out);
            }
        }
        Value::Array(items) => {
            for v in items {
                plan_leaves(v, out);
            }
        }
        _ => {}
    }
}

/// Rebuild a `Value` with the same shape as `template`, substituting each
/// string leaf with the next translated string. `texts` must yield exactly as
/// many items as `template` has string leaves.
fn rebuild_with_texts(template: &Value, texts: &mut std::vec::IntoIter<String>) -> Value {
    match template {
        Value::String(_) => Value::String(
            texts
                .next()
                .expect("translated text count matches source leaf count"),
        ),
        Value::Object(map) => {
            let mut out = serde_json::Map::new();
            for (k, v) in map {
                out.insert(k.clone(), rebuild_with_texts(v, texts));
            }
            Value::Object(out)
        }
        Value::Array(items) => {
            Value::Array(items.iter().map(|v| rebuild_with_texts(v, texts)).collect())
        }
        other => other.clone(),
    }
}

/// Byte ranges (inclusive of braces) of every top-level `{...}` group in `text`.
/// Nested braces (e.g. inside an ICU plural arm) are absorbed into their
/// enclosing top-level group rather than reported separately.
fn top_level_brace_spans(text: &str) -> Vec<Range<usize>> {
    let mut scanner = BraceScanner::default();
    for (i, ch) in text.char_indices() {
        scanner.feed(i, ch);
    }
    scanner.spans
}

/// Incremental brace-nesting tracker for [`top_level_brace_spans`]. Keeping the
/// per-character branches in dedicated methods flattens the scan loop.
#[derive(Default)]
struct BraceScanner {
    spans: Vec<Range<usize>>,
    depth: usize,
    start: usize,
}

impl BraceScanner {
    /// Feed one character (at byte `index`) into the scan.
    fn feed(&mut self, index: usize, ch: char) {
        match ch {
            '{' => self.open(index),
            '}' if self.depth > 0 => self.close(index, ch),
            _ => {}
        }
    }

    fn open(&mut self, index: usize) {
        if self.depth == 0 {
            self.start = index;
        }
        self.depth += 1;
    }

    fn close(&mut self, index: usize, ch: char) {
        self.depth -= 1;
        if self.depth == 0 {
            self.spans.push(self.start..index + ch.len_utf8());
        }
    }
}

/// Mask simple `{name}`-style placeholders with opaque sentinels so MT can't
/// reorder or mangle them, returning the masked text plus the original tokens
/// in order. Returns `None` if any top-level brace group contains a comma
/// (ICU plural/select/number/date syntax), which is not safe to blind-mask.
fn mask_simple_placeholders(text: &str) -> Option<(String, Vec<String>)> {
    let spans = top_level_brace_spans(text);
    if spans.iter().any(|span| text[span.clone()].contains(',')) {
        return None;
    }

    let mut masked = String::new();
    let mut tokens = Vec::new();
    let mut cursor = 0;
    for span in spans {
        masked.push_str(&text[cursor..span.start]);
        masked.push_str(&format!("@@PH{}@@", tokens.len()));
        tokens.push(text[span.clone()].to_string());
        cursor = span.end;
    }
    masked.push_str(&text[cursor..]);
    Some((masked, tokens))
}

/// Replace each `@@PH<n>@@` sentinel in `masked` with its original token.
/// Errors if the translation dropped a sentinel, which would otherwise
/// silently ship a string missing its interpolation placeholder.
fn unmask_placeholders(masked: &str, tokens: &[String]) -> Result<String> {
    let mut out = masked.to_string();
    for (i, token) in tokens.iter().enumerate() {
        let sentinel = format!("@@PH{i}@@");
        if !out.contains(&sentinel) {
            bail!("lara translation dropped placeholder token {sentinel} (expected {token})");
        }
        out = out.replacen(&sentinel, token, 1);
    }
    Ok(out)
}

#[derive(Deserialize)]
struct LaraAuthResponse {
    token: String,
}

#[derive(Deserialize)]
struct LaraTranslateResult {
    translation: LaraTranslationField,
}

#[derive(Deserialize)]
#[serde(untagged)]
enum LaraTranslationField {
    Many(Vec<String>),
    One(String),
}

struct LaraClient {
    http: reqwest::Client,
    base_url: String,
    credentials: LaraCredentials,
    // Cached for the process lifetime: this is a one-shot CLI run over a small
    // locale set, so a token expiring mid-run (rather than being refreshed) is
    // an accepted limitation, not handled with 401-triggered re-auth.
    token: Mutex<Option<String>>,
}

impl LaraClient {
    fn new(base_url: String, credentials: LaraCredentials) -> Result<Self> {
        let http = reqwest::Client::builder()
            .build()
            .context("build http client")?;
        Ok(Self {
            http,
            base_url,
            credentials,
            token: Mutex::new(None),
        })
    }

    async fn ensure_token(&self) -> Result<String> {
        if let Some(token) = self.token.lock().expect("token mutex poisoned").clone() {
            return Ok(token);
        }
        let token = self.authenticate().await?;
        *self.token.lock().expect("token mutex poisoned") = Some(token.clone());
        Ok(token)
    }

    /// Exchange the access key id/secret for a bearer token via the signed
    /// `POST /v2/auth` handshake (Lara access-key auth scheme).
    async fn authenticate(&self) -> Result<String> {
        let path = "/v2/auth";
        let body = serde_json::json!({ "id": self.credentials.key_id });
        let body_str = serde_json::to_string(&body).context("encode lara auth body")?;
        let content_md5 = BASE64.encode(Md5::digest(body_str.as_bytes()));
        let date = httpdate::fmt_http_date(SystemTime::now());
        let content_type = "application/json";
        let signature = sign_challenge(
            &self.credentials.key_secret,
            &SignatureChallenge {
                method: "POST",
                path,
                content_md5: &content_md5,
                content_type,
                date: &date,
            },
        )?;

        let response = self
            .http
            .post(format!("{}{path}", self.base_url))
            .header("Content-Type", content_type)
            .header("X-Lara-Date", &date)
            .header("Content-MD5", &content_md5)
            .header("Authorization", format!("Lara:{signature}"))
            .body(body_str)
            .send()
            .await
            .context("lara auth request")?;

        let status = response.status();
        let text = response.text().await.context("read lara auth response")?;
        if !status.is_success() {
            bail!("lara auth failed ({status}): {text}");
        }
        let parsed: LaraAuthResponse =
            serde_json::from_str(&text).context("parse lara auth response")?;
        Ok(parsed.token)
    }

    async fn translate_batch(&self, texts: &[String], target: &str) -> Result<Vec<String>> {
        let token = self.ensure_token().await?;
        let body = serde_json::json!({
            "q": texts,
            "source": "en",
            "target": target,
            "multiline": true,
        });

        let response = self
            .http
            .post(format!("{}/v2/translate", self.base_url))
            .bearer_auth(&token)
            .json(&body)
            .send()
            .await
            .context("lara translate request")?;

        let status = response.status();
        let text = response
            .text()
            .await
            .context("read lara translate response")?;
        if !status.is_success() {
            bail!("lara translate failed ({status}): {text}");
        }

        // The endpoint responds with newline-delimited JSON; the final
        // non-empty line carries the complete result.
        let last_line = text
            .lines()
            .rev()
            .find(|line| !line.trim().is_empty())
            .ok_or_else(|| anyhow!("empty lara translate response"))?;
        let raw: Value =
            serde_json::from_str(last_line).context("parse lara translate response line")?;
        let payload = raw.get("data").cloned().unwrap_or(raw);
        let result: LaraTranslateResult =
            serde_json::from_value(payload).context("decode lara translate result")?;

        Ok(match result.translation {
            LaraTranslationField::Many(v) => v,
            LaraTranslationField::One(s) => vec![s],
        })
    }
}

/// The canonical request fields signed into a `Lara:` signature challenge.
struct SignatureChallenge<'a> {
    method: &'a str,
    path: &'a str,
    content_md5: &'a str,
    content_type: &'a str,
    date: &'a str,
}

/// Build the `Lara:` request signature: base64(HMAC-SHA256(secret, challenge)),
/// where challenge is `METHOD\nPATH\nContent-MD5\nContent-Type\nDate`.
fn sign_challenge(secret: &str, challenge: &SignatureChallenge<'_>) -> Result<String> {
    let SignatureChallenge {
        method,
        path,
        content_md5,
        content_type,
        date,
    } = challenge;
    let challenge = format!("{method}\n{path}\n{content_md5}\n{content_type}\n{date}");
    let mut mac = Hmac::<Sha256>::new_from_slice(secret.as_bytes())
        .map_err(|err| anyhow!("hmac init failed: {err}"))?;
    mac.update(challenge.as_bytes());
    Ok(BASE64.encode(mac.finalize().into_bytes()))
}

#[cfg(test)]
mod tests {
    use super::*;
    use serde_json::json;
    use tempfile::tempdir;
    use wiremock::matchers::{method, path};
    use wiremock::{Mock, MockServer, ResponseTemplate};

    #[test]
    fn cli_parses_default_targets() {
        let cli = TranslationSyncArgs::parse_from(["translation-sync"]);
        assert_eq!(cli.source, PathBuf::from("locales/en.json"));
        assert_eq!(cli.targets, vec!["es", "fr", "de", "ja"]);
        assert!(cli.out_dir.is_none());
    }

    #[test]
    fn extract_and_rebuild_round_trips_nested_shape() {
        let source = json!({
            "shell": {
                "commandPalette": {
                    "searchPlaceholder": "Search commands...",
                }
            },
            "workspace": {
                "foundation": {
                    "chooseType": "Choose a type"
                },
                "count": 3,
                "flags": [true, false]
            }
        });

        let mut leaves = Vec::new();
        plan_leaves(&source, &mut leaves);
        let texts: Vec<String> = leaves
            .iter()
            .map(|l| match l {
                LeafPlan::Translatable { masked, .. } => masked.clone(),
                LeafPlan::PassThrough(s) => s.clone(),
            })
            .collect();
        assert_eq!(texts, vec!["Search commands...", "Choose a type"]);

        let translated: Vec<String> = texts.iter().map(|t| format!("[{t}]")).collect();
        let mut iter = translated.into_iter();
        let rebuilt = rebuild_with_texts(&source, &mut iter);

        assert_eq!(
            rebuilt["shell"]["commandPalette"]["searchPlaceholder"],
            json!("[Search commands...]")
        );
        assert_eq!(
            rebuilt["workspace"]["foundation"]["chooseType"],
            json!("[Choose a type]")
        );
        assert_eq!(rebuilt["workspace"]["count"], json!(3));
        assert_eq!(rebuilt["workspace"]["flags"], json!([true, false]));
    }

    #[test]
    fn sign_challenge_is_deterministic_for_same_inputs() {
        let challenge = SignatureChallenge {
            method: "POST",
            path: "/v2/auth",
            content_md5: "md5hash",
            content_type: "application/json",
            date: "Wed, 21 Oct 2015 07:28:00 GMT",
        };
        let a = sign_challenge("secret", &challenge).expect("sign");
        let b = sign_challenge("secret", &challenge).expect("sign");
        assert_eq!(a, b);
    }

    #[test]
    fn mask_simple_placeholders_protects_single_variable() {
        let (masked, tokens) = mask_simple_placeholders("As of {timestamp}").expect("simple");
        assert_eq!(masked, "As of @@PH0@@");
        assert_eq!(tokens, vec!["{timestamp}"]);

        // Simulate MT translating the surrounding text but preserving the sentinel.
        let translated = masked.replace("As of", "À partir de");
        let restored = unmask_placeholders(&translated, &tokens).expect("unmask");
        assert_eq!(
            restored,
            "À partir de @@PH0@@".replace("@@PH0@@", "{timestamp}")
        );
    }

    #[test]
    fn mask_simple_placeholders_handles_plain_text() {
        let (masked, tokens) = mask_simple_placeholders("Search commands...").expect("plain");
        assert_eq!(masked, "Search commands...");
        assert!(tokens.is_empty());
    }

    #[test]
    fn mask_simple_placeholders_rejects_icu_plural_syntax() {
        let icu =
            "{count, plural, =0 {No selection} one {# item selected} other {# items selected}}";
        assert!(mask_simple_placeholders(icu).is_none());
    }

    #[test]
    fn unmask_placeholders_errors_when_sentinel_is_dropped() {
        let err = unmask_placeholders("plain text with no sentinel", &["{name}".to_string()])
            .expect_err("should fail");
        assert!(err.to_string().contains("dropped placeholder token"));
    }

    async fn mock_auth_endpoint(server: &MockServer) {
        Mock::given(method("POST"))
            .and(path("/v2/auth"))
            .respond_with(
                ResponseTemplate::new(200).set_body_json(json!({ "token": "fake-jwt-token" })),
            )
            .mount(server)
            .await;
    }

    #[tokio::test]
    async fn translate_batch_authenticates_then_parses_ndjson_result() {
        let server = MockServer::start().await;
        mock_auth_endpoint(&server).await;

        Mock::given(method("POST"))
            .and(path("/v2/translate"))
            .respond_with(ResponseTemplate::new(200).set_body_raw(
                format!(
                    "{}\n",
                    json!({
                        "contentType": "text/plain",
                        "sourceLanguage": "en",
                        "translation": ["Bonjour", "Au revoir"]
                    })
                ),
                "application/json",
            ))
            .mount(&server)
            .await;

        let client = LaraClient::new(
            server.uri(),
            LaraCredentials {
                key_id: "key-id".into(),
                key_secret: "key-secret".into(),
            },
        )
        .expect("build client");

        let result = client
            .translate_batch(&["Hello".to_string(), "Goodbye".to_string()], "fr")
            .await
            .expect("translate batch");

        assert_eq!(result, vec!["Bonjour", "Au revoir"]);
    }

    #[tokio::test]
    async fn translate_batch_errors_when_auth_fails() {
        let server = MockServer::start().await;

        Mock::given(method("POST"))
            .and(path("/v2/auth"))
            .respond_with(ResponseTemplate::new(401).set_body_json(json!({
                "type": "AuthenticationError",
                "message": "invalid access key"
            })))
            .mount(&server)
            .await;

        let client = LaraClient::new(
            server.uri(),
            LaraCredentials {
                key_id: "bad-id".into(),
                key_secret: "bad-secret".into(),
            },
        )
        .expect("build client");

        let err = client
            .translate_batch(&["Hello".to_string()], "fr")
            .await
            .expect_err("should fail");
        assert!(err.to_string().contains("lara auth failed"));
    }

    #[tokio::test]
    async fn run_with_bails_when_translation_count_mismatches_source() {
        let server = MockServer::start().await;
        mock_auth_endpoint(&server).await;

        Mock::given(method("POST"))
            .and(path("/v2/translate"))
            .respond_with(ResponseTemplate::new(200).set_body_raw(
                format!(
                    "{}\n",
                    json!({
                        "contentType": "text/plain",
                        "sourceLanguage": "en",
                        // Two source strings go in; only one comes back.
                        "translation": ["Bonjour"]
                    })
                ),
                "application/json",
            ))
            .mount(&server)
            .await;

        let dir = tempdir().expect("tempdir");
        let source_path = dir.path().join("en.json");
        fs::write(
            &source_path,
            json!({ "a": "Hello", "b": "Goodbye" }).to_string(),
        )
        .expect("write source");

        let args = TranslationSyncArgs {
            source: source_path,
            out_dir: Some(dir.path().join("out")),
            targets: vec!["fr".to_string()],
        };

        let err = run_with(
            args,
            &server.uri(),
            LaraCredentials {
                key_id: "key-id".into(),
                key_secret: "key-secret".into(),
            },
        )
        .await
        .expect_err("should bail on count mismatch");
        assert!(err.to_string().contains("lara returned"));
    }

    #[tokio::test]
    async fn run_with_writes_translated_and_passthrough_locale_file() {
        let server = MockServer::start().await;
        mock_auth_endpoint(&server).await;

        Mock::given(method("POST"))
            .and(path("/v2/translate"))
            .respond_with(ResponseTemplate::new(200).set_body_raw(
                format!(
                    "{}\n",
                    json!({
                        "contentType": "text/plain",
                        "sourceLanguage": "en",
                        "translation": ["Bonjour @@PH0@@"]
                    })
                ),
                "application/json",
            ))
            .mount(&server)
            .await;

        let dir = tempdir().expect("tempdir");
        let source_path = dir.path().join("en.json");
        fs::write(
            &source_path,
            json!({
                "greeting": "Hello {name}",
                "selection": "{count, plural, =0 {No selection} other {# selected}}"
            })
            .to_string(),
        )
        .expect("write source");
        let out_dir = dir.path().join("out");

        let args = TranslationSyncArgs {
            source: source_path,
            out_dir: Some(out_dir.clone()),
            targets: vec!["fr".to_string()],
        };

        run_with(
            args,
            &server.uri(),
            LaraCredentials {
                key_id: "key-id".into(),
                key_secret: "key-secret".into(),
            },
        )
        .await
        .expect("run_with");

        let written = fs::read_to_string(out_dir.join("fr.json")).expect("read fr.json");
        let value: Value = serde_json::from_str(&written).expect("parse fr.json");
        assert_eq!(value["greeting"], json!("Bonjour {name}"));
        assert_eq!(
            value["selection"],
            json!("{count, plural, =0 {No selection} other {# selected}}")
        );
    }

    #[tokio::test]
    async fn run_with_skips_locale_already_translated_at_current_hash() {
        // No mocks mounted: if the skip logic fails to trigger, the unmatched
        // request to this server will fail loudly rather than silently pass.
        let server = MockServer::start().await;

        let dir = tempdir().expect("tempdir");
        let source_path = dir.path().join("en.json");
        let source_contents = json!({ "greeting": "Hello" }).to_string();
        fs::write(&source_path, &source_contents).expect("write source");
        let source_hash = sha256_hex(source_contents.as_bytes());

        let out_dir = dir.path().join("out");
        fs::create_dir_all(&out_dir).expect("mkdir out");
        let manifest = json!({
            "sourceFile": "locales/en.json",
            "sourceSha256": source_hash,
            "locales": {
                "es": {
                    "status": "translated",
                    "translatedAtSourceSha256": source_hash
                }
            }
        });
        fs::write(out_dir.join(MANIFEST_FILE_NAME), manifest.to_string()).expect("write manifest");

        let args = TranslationSyncArgs {
            source: source_path,
            out_dir: Some(out_dir.clone()),
            targets: vec!["es".to_string()],
        };

        run_with(
            args,
            &server.uri(),
            LaraCredentials {
                key_id: "key-id".into(),
                key_secret: "key-secret".into(),
            },
        )
        .await
        .expect("run_with should succeed without calling Lara");

        assert!(
            !out_dir.join("es.json").exists(),
            "skip should not write es.json"
        );
    }

    #[tokio::test]
    async fn run_with_updates_manifest_on_success_and_on_failure() {
        let server = MockServer::start().await;
        mock_auth_endpoint(&server).await;

        Mock::given(method("POST"))
            .and(path("/v2/translate"))
            .respond_with(ResponseTemplate::new(200).set_body_raw(
                format!(
                    "{}\n",
                    json!({
                        "contentType": "text/plain",
                        "sourceLanguage": "en",
                        "translation": ["Hola"]
                    })
                ),
                "application/json",
            ))
            .up_to_n_times(1)
            .mount(&server)
            .await;

        // The second /v2/translate call (for "fr") gets no matching mock and
        // fails, simulating a quota error partway through a run.
        let dir = tempdir().expect("tempdir");
        let source_path = dir.path().join("en.json");
        fs::write(&source_path, json!({ "greeting": "Hello" }).to_string()).expect("write source");
        let out_dir = dir.path().join("out");

        let args = TranslationSyncArgs {
            source: source_path,
            out_dir: Some(out_dir.clone()),
            targets: vec!["es".to_string(), "fr".to_string()],
        };

        let err = run_with(
            args,
            &server.uri(),
            LaraCredentials {
                key_id: "key-id".into(),
                key_secret: "key-secret".into(),
            },
        )
        .await
        .expect_err("fr should fail with no matching mock");
        assert!(err.to_string().contains("translate batch"));

        let manifest_raw =
            fs::read_to_string(out_dir.join(MANIFEST_FILE_NAME)).expect("read manifest");
        let manifest: TranslationStatusManifest =
            serde_json::from_str(&manifest_raw).expect("parse manifest");

        assert!(out_dir.join("es.json").exists());
        assert!(matches!(
            manifest.locales.get("es"),
            Some(LocaleStatus::Translated { .. })
        ));
        assert!(matches!(
            manifest.locales.get("fr"),
            Some(LocaleStatus::Placeholder { note: Some(_) })
        ));
    }

    #[tokio::test]
    async fn run_with_failed_resync_does_not_downgrade_previously_translated_locale() {
        let server = MockServer::start().await;
        mock_auth_endpoint(&server).await;
        // No /v2/translate mock mounted — the resync attempt fails.

        let dir = tempdir().expect("tempdir");
        let source_path = dir.path().join("en.json");
        let new_source = json!({ "greeting": "Hello again" }).to_string();
        fs::write(&source_path, &new_source).expect("write source");

        let out_dir = dir.path().join("out");
        fs::create_dir_all(&out_dir).expect("mkdir out");
        // A real (if now stale) Spanish translation from an earlier en.json hash.
        fs::write(
            out_dir.join("es.json"),
            json!({ "greeting": "Hola" }).to_string(),
        )
        .expect("write existing es.json");
        let manifest = json!({
            "sourceFile": "locales/en.json",
            "sourceSha256": "old-hash",
            "locales": {
                "es": { "status": "translated", "translatedAtSourceSha256": "old-hash" }
            }
        });
        fs::write(out_dir.join(MANIFEST_FILE_NAME), manifest.to_string()).expect("write manifest");

        let args = TranslationSyncArgs {
            source: source_path,
            out_dir: Some(out_dir.clone()),
            targets: vec!["es".to_string()],
        };

        let err = run_with(
            args,
            &server.uri(),
            LaraCredentials {
                key_id: "key-id".into(),
                key_secret: "key-secret".into(),
            },
        )
        .await
        .expect_err("resync should fail with no matching mock");
        assert!(err.to_string().contains("translate batch"));

        let manifest_raw =
            fs::read_to_string(out_dir.join(MANIFEST_FILE_NAME)).expect("read manifest");
        let manifest: TranslationStatusManifest =
            serde_json::from_str(&manifest_raw).expect("parse manifest");

        match manifest.locales.get("es") {
            Some(LocaleStatus::Translated {
                translated_at_source_sha256,
                note,
            }) => {
                assert_eq!(
                    translated_at_source_sha256, "old-hash",
                    "hash should stay at the last successful translation"
                );
                let note = note.as_ref().expect("failure note present");
                assert!(
                    !note.contains("Identical to en.json"),
                    "note must not falsely claim untranslated placeholder content: {note}"
                );
            }
            other => {
                panic!("expected locale to remain Translated after a failed resync, got {other:?}")
            }
        }

        // The failed resync must not have touched the real translation on disk.
        let es_contents = fs::read_to_string(out_dir.join("es.json")).expect("read es.json");
        assert!(es_contents.contains("Hola"));
    }
}
