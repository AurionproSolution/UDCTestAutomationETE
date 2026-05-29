/**
 * Injects `this.logStep("HumanizedName")` as the first statement in each public `async` method.
 *
 * Usage: node scripts/inject-pom-log-steps.mjs <path-to-ts-file>
 */

import fs from "fs";

const file = process.argv[2];
if (!file) {
  console.error("Usage: node scripts/inject-pom-log-steps.mjs <file.ts>");
  process.exit(1);
}

const lines = fs.readFileSync(file, "utf8").split(/\r?\n/);
const out = [];
let i = 0;

function camelToWords(name) {
  return name
    .replace(/([a-z\d])([A-Z])/g, "$1 $2")
    .replace(/([A-Z]+)([A-Z][a-z])/g, "$1 $2")
    .replace(/^./, (c) => c.toUpperCase())
    .trim();
}

/** Closing line of async signature: `): ... {` or `) {` */
function isSignatureCloseLine(ln) {
  return /^\s*\)\s*:\s*.+\{\s*$/.test(ln) || /^\s*\)\s*\{\s*$/.test(ln);
}

/** Single-line async method opening */
function isSingleLineAsyncOpen(ln) {
  return /\basync\s+\w+\s*\(/.test(ln) && /\)\s*(:\s*.+)?\s*\{\s*$/.test(ln);
}

while (i < lines.length) {
  const line = lines[i];
  const m = line.match(/^  async (?!private)(\w+)\(/);
  if (!m) {
    out.push(line);
    i++;
    continue;
  }

  const methodName = m[1];
  let braceLineIdx = -1;

  if (isSingleLineAsyncOpen(line)) {
    braceLineIdx = i;
  } else {
    for (let j = i + 1; j < Math.min(i + 120, lines.length); j++) {
      if (isSignatureCloseLine(lines[j])) {
        braceLineIdx = j;
        break;
      }
    }
  }

  if (braceLineIdx === -1) {
    out.push(line);
    i++;
    continue;
  }

  for (let k = i; k <= braceLineIdx; k++) {
    out.push(lines[k]);
  }

  const nextIdx = braceLineIdx + 1;
  const nextLine = lines[nextIdx];
  if (nextLine !== undefined && /^\s*this\.logStep\(/.test(nextLine)) {
    i = braceLineIdx + 1;
    continue;
  }
  if (nextLine !== undefined && /^\s*this\.log\(/.test(nextLine)) {
    i = braceLineIdx + 1;
    continue;
  }

  out.push(`    this.logStep("${camelToWords(methodName)}");`);
  i = braceLineIdx + 1;
}

const nextContent = out.join("\n");
const prev = fs.readFileSync(file, "utf8");
if (nextContent !== prev) {
  fs.writeFileSync(file, nextContent, "utf8");
  console.log(`Updated: ${file}`);
} else {
  console.log(`No changes: ${file}`);
}
