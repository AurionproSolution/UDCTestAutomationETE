/**
 * Cross-check: public `async` methods in BasePage subclasses should contain an early
 * `this.logStep(` or `this.log(` (within the first few executable lines; allows const setup).
 *
 * Excludes: pages/Samples/pinterestPage.ts (sample, not BasePage in practice)
 *
 * Usage: node scripts/check-pom-step-logs.mjs
 */

import fs from "fs";
import path from "path";

const pagesRoot = path.join(process.cwd(), "pages");
const EXCLUDE_FILES = new Set([
  path.join(pagesRoot, "Samples", "pinterestPage.ts").toLowerCase(),
]);

function walkDir(dir, acc = []) {
  for (const name of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, name.name);
    if (name.isDirectory()) walkDir(p, acc);
    else if (name.isFile() && name.name.endsWith(".ts")) acc.push(p);
  }
  return acc;
}

function fileExtendsBasePage(text) {
  const lines = text.split(/\r?\n/);
  for (const ln of lines) {
    const t = ln.replace(/^\s*/, "");
    if (t.startsWith("//")) continue;
    if (/export\s+class\s+\w+.*extends\s+BasePage\b/.test(t)) return true;
  }
  return false;
}

function isSignatureCloseLine(ln) {
  return (
    /^\s*\)\s*:\s*.+\{\s*$/.test(ln) ||
    /^\s*\)\s*\{\s*$/.test(ln) ||
    /^\s*\}\)\s*:\s*.+\{\s*$/.test(ln)
  );
}

function isSingleLineAsyncOpen(ln) {
  return /^  async (?!private)(\w+)\(/.test(ln) && /\)\s*(:\s*.+)?\s*\{\s*$/.test(ln);
}

function bodyHasEarlyLog(lines, startIdx, maxScan = 18) {
  const joined = [];
  for (let i = startIdx; i < Math.min(startIdx + maxScan, lines.length); i++) {
    const t = lines[i].trim();
    if (t === "" || t.startsWith("//")) continue;
    if (t.startsWith("/*")) continue;
    if (t.startsWith("*")) continue;
    joined.push(t);
    if (/this\.logStep\(/.test(t) || /this\.log\(/.test(t)) {
      return { ok: true, firstLogLine: i + 1 };
    }
    if (/^\}/.test(t)) break;
  }
  return { ok: false, firstCodeLines: joined.slice(0, 5) };
}

function scanFile(filePath) {
  const rel = path.relative(process.cwd(), filePath);
  if (EXCLUDE_FILES.has(filePath.toLowerCase())) return [];

  const text = fs.readFileSync(filePath, "utf8");
  if (!fileExtendsBasePage(text)) return [];

  const lines = text.split(/\r?\n/);
  const issues = [];

  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    const m = line.match(/^  async (?!private)(\w+)\(/);
    if (!m) {
      i++;
      continue;
    }

    const method = m[1];
    let braceLine = -1;

    if (isSingleLineAsyncOpen(line)) {
      braceLine = i;
    } else {
      for (let j = i + 1; j < Math.min(i + 140, lines.length); j++) {
        if (isSignatureCloseLine(lines[j])) {
          braceLine = j;
          break;
        }
      }
    }

    if (braceLine === -1) {
      issues.push({ method, problem: "could_not_find_opening_brace" });
      i++;
      continue;
    }

    const check = bodyHasEarlyLog(lines, braceLine + 1);
    if (!check.ok) {
      issues.push({
        method,
        problem: "no_logStep_or_log_in_early_body",
        preview: check.firstCodeLines?.join(" | ") ?? "",
      });
    }

    i = braceLine + 1;
  }

  return issues.length ? [{ file: rel, issues }] : [];
}

const files = walkDir(pagesRoot);
const all = [];
for (const f of files) {
  all.push(...scanFile(f));
}

if (all.length === 0) {
  console.log(
    "OK: Every public async method in BasePage subclasses under pages/ has this.logStep( or this.log( in the opening lines of the body.",
  );
  process.exit(0);
}

console.log("Gaps (public async methods without early this.logStep / this.log):\n");
for (const { file, issues } of all) {
  console.log(file);
  for (const it of issues) {
    console.log(`  - ${it.method}: ${it.problem}${it.preview ? ` | ${it.preview}` : ""}`);
  }
  console.log("");
}
process.exit(1);
