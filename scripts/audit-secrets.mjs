/**
 * Secrets audit — dealroom hardening safeguard.
 *
 *   npm run audit:secrets
 *
 * Scans every TRACKED file (git ls-files) for credential patterns and
 * exits nonzero when anything matches, so the check can gate CI and
 * pre-push hooks. Untracked artifacts (node_modules, dist, seed/out) are
 * excluded on purpose: the index itself is the contract for what ships.
 */

import { execFileSync } from 'node:child_process'

const PATTERNS = [
  { name: 'aws-access-key', re: /\bAKIA[0-9A-Z]{16}\b/ },
  { name: 'github-pat', re: /\bgh[pousr]_[A-Za-z0-9]{20,}\b/ },
  { name: 'openai-key', re: /\bsk-[A-Za-z0-9]{20,}\b/ },
  { name: 'stripe-key', re: /\bsk_live_[A-Za-z0-9]{16,}\b/ },
  { name: 'private-key-block', re: /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/ },
  { name: 'generic-secret-assign', re: /\b(?:api[_-]?key|secret|passwd|password|token)\s*[:=]\s*["'][^"']{12,}["']/i },
  { name: 'bearer-credential', re: /\bauthorization\s*:\s*["']\s*bearer\s+[A-Za-z0-9._-]{20,}/i },
  { name: 'npm-token', re: /\b\/\/registry\.npmjs\.org\/:_authToken=[A-Za-z0-9-]{20,}/ },
  { name: 'slack-webhook', re: /https:\/\/hooks\.slack\.com\/services\/T[A-Z0-9]+\/B[A-Z0-9]+\/[A-Za-z0-9]+/ },
]

/** Tracked files, newline-separated, UTF-8 paths. */
function trackedFiles() {
  return execFileSync('git', ['ls-files', '-z'], { encoding: 'utf8', maxBuffer: 1 << 26 })
    .split('\0')
    .filter(Boolean)
}

const findings = []
for (const file of trackedFiles()) {
  const buf = execFileSync('git', ['show', `:${file}`], { encoding: 'utf8', maxBuffer: 1 << 28, stdio: ['ignore', 'pipe', 'pipe'] })
  for (const { name, re } of PATTERNS) {
    if (re.test(buf)) {
      const lineNo = buf.split('\n').findIndex((l) => re.test(l)) + 1
      findings.push(`${name}  ${file}:${lineNo}`)
    }
  }
}

if (findings.length > 0) {
  console.error('SECRETS FOUND — do not push:')
  for (const f of findings) console.error('  - ' + f)
  process.exit(1)
}
console.log(`audit:secrets ok — ${trackedFiles().length} tracked files scanned, no credential patterns`)
