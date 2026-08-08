# Security

DealRoom's hardening posture, audit results, and operational safeguards.

## Audit — 2026-08-09

Source-level audit of the working tree plus the dependency tree:

| Check | Result |
| --- | --- |
| Hardcoded credentials (API keys, tokens, private keys, passwords) | none found (78 tracked files scanned) |
| `.env` / credential files tracked in git | none |
| Unsafe rendering sinks (`dangerouslySetInnerHTML`, `innerHTML`, `eval`) | none — all output is React-escaped |
| Dependency vulnerabilities (`npm audit`, prod + dev) | 0 |
| Lockfile integrity (local/`file:` registry entries) | none |

## Credential handling

- The pipeline is fully deterministic and local: no API calls are made to
  produce a report.
- The optional LLM narrative upgrade (`upgradeNarrative`) never reads
  credentials itself. The host application injects a provider; the bundled
  `createHttpProvider` accepts an `apiKey` option that is used only for the
  `Authorization: Bearer` header of that request — it is never logged,
  stored, or shipped.
- `scripts/audit-secrets.mjs` (`npm run audit:secrets`) scans every
  tracked file for credential patterns and fails the run on a match. Run
  it in CI or a pre-push hook; it exits nonzero on any finding.

## Operational safeguards

- **No fabricated output:** a failed pipeline stage returns
  `{ ok: false, error }` — a report is never partially assembled.
- **Faithfulness gate:** provider-produced narratives that quote anything
  not present in the recorded evidence are rejected, not propagated.
- **Determinism:** identical inputs produce byte-identical reports
  (verified by the evaluation suite), which makes pipeline behavior
  auditable.
- **Sandboxed seed output:** the seed pipeline writes only under
  `seed/out/` from constants in the content model — no user-controlled
  paths are interpolated.
- **Explicit failure:** the HTTP provider aborts on timeout and fails
  loudly; it never degrades to a made-up narrative.

## Reporting

This is a portfolio project with fictional seed data. For a vulnerability
in the repository, open an issue in the GitHub repository (no security
mailbox is maintained for this project).
