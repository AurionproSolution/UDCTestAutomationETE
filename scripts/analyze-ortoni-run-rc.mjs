import fs from "fs";
import path from "path";

const runDir = process.argv[2];
if (!runDir) {
  console.error("Usage: node analyze-ortoni-run-rc.mjs <run-folder-or-index.html>");
  process.exit(1);
}

let indexPath = runDir;
let attachmentsRoot = path.join(runDir, "ortoni-data", "attachments");
if (runDir.endsWith("index.html")) {
  indexPath = runDir;
  attachmentsRoot = path.join(path.dirname(runDir), "ortoni-data", "attachments");
} else if (!fs.existsSync(attachmentsRoot)) {
  attachmentsRoot = path.join(runDir, "ortoni-data", "attachments");
}

const categories = new Map();
const bySpec = new Map();
const byUdp = new Map();
const failures = [];
let flakyFromHtml = [];
let summaryFromHtml = null;

function categorize(msg) {
  const m = msg.replace(/\u001b\[[0-9;]*m/g, "");
  if (/timeout|exceeded/i.test(m)) return "timeout";
  if (/Target page, context or browser has been closed/i.test(m)) return "browser_closed";
  if (/MFA|auth|login|session|storageState/i.test(m)) return "auth_session";
  if (/toBeVisible|not visible|waiting for locator/i.test(m)) return "locator_visibility";
  if (/toBeEnabled|disabled/i.test(m)) return "element_disabled";
  if (/toMatch|toBe\(|Expected:|Received:/i.test(m)) return "assertion_mismatch";
  if (/strict mode violation/i.test(m)) return "strict_mode";
  if (/EPERM|ENOENT|network|ECONNREFUSED/i.test(m)) return "infra";
  if (/fixture/i.test(m)) return "fixture";
  return "other";
}

function bump(map, key, item) {
  if (!map.has(key)) map.set(key, []);
  map.get(key).push(item);
}

function parseErrorContext(html) {
  const nameM = html.match(/<li>Name:\s*([^<]+)/i);
  const name = nameM
    ? nameM[1].replace(/&gt;/g, ">").replace(/&amp;/g, "&").trim()
    : "unknown";
  const locM = html.match(/<li>Location:\s*([^<]+)/i);
  const location = locM ? locM[1].trim() : "";
  const preBlocks = [...html.matchAll(/<pre><code>([\s\S]*?)<\/code><\/pre>/g)].map((x) =>
    x[1]
      .replace(/&#039;/g, "'")
      .replace(/&quot;/g, '"')
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/&amp;/g, "&"),
  );
  const errText = preBlocks.join("\n---\n").slice(0, 4000);
  const udpM = name.match(/UDP-T\d+/);
  const udp = udpM ? udpM[0] : null;
  const specM = name.match(/([^\\>]+\.test\.ts)/);
  const spec = specM ? specM[1].replace(/\\/g, "/") : "unknown";
  return { name, location, errText, udp, spec };
}

// Parse index.html if present (failures + flaky metadata)
if (fs.existsSync(indexPath) && indexPath.endsWith(".html")) {
  const html = fs.readFileSync(indexPath, "utf8");
  const sm = html.match(/"pass":(\d+),"fail":(\d+).*?"flaky":(\d+).*?"total":(\d+)/);
  if (sm) summaryFromHtml = { pass: +sm[1], fail: +sm[2], flaky: +sm[3], total: +sm[4] };

  const flakyRe =
    /"title"\s*:\s*"((?:\\.|[^"\\])*)"[\s\S]{0,2000}?"flaky"\s*:\s*"(expected|unexpected|yes|true)"/gi;
  let fm;
  while ((fm = flakyRe.exec(html)) !== null) {
    let title;
    try {
      title = JSON.parse(`"${fm[1]}"`);
    } catch {
      title = fm[1];
    }
    flakyFromHtml.push(title);
  }

  // Also parse failed tests from embedded JSON when attachments incomplete
  const failRe =
    /"title"\s*:\s*"((?:\\.|[^"\\])*)"[\s\S]{0,12000}?"status"\s*:\s*"(failed|timedOut)"/g;
  const seenFail = new Set();
  let m;
  while ((m = failRe.exec(html)) !== null) {
    let title;
    try {
      title = JSON.parse(`"${m[1]}"`);
    } catch {
      title = m[1];
    }
    if (seenFail.has(title)) continue;
    seenFail.add(title);
    const tail = html.slice(m.index, m.index + 15000);
    const errM = tail.match(/"errors"\s*:\s*\[\s*"((?:\\.|[^"\\])*)"/);
    let errText = "";
    if (errM) {
      try {
        errText = JSON.parse(`"${errM[1]}"`).slice(0, 2000);
      } catch {
        errText = errM[1].slice(0, 2000);
      }
    }
    if (!failures.find((f) => f.name === title)) {
      const cat = categorize(errText);
      const udpM = title.match(/UDP-T\d+/);
      const specM = title.match(/([A-Za-z0-9_./-]+\.test\.ts)/);
      failures.push({
        name: title,
        location: "",
        errText,
        udp: udpM?.[0],
        spec: specM?.[1] ?? "unknown",
        cat,
        source: "html",
      });
      bump(categories, cat, title);
      if (udpM) bump(byUdp, udpM[0], title);
      bump(bySpec, specM?.[1] ?? "unknown", title);
    }
  }
}

// Walk attachments (ground truth for artifacts)
let attachFail = 0;
let attachPass = 0;
if (fs.existsSync(attachmentsRoot)) {
  for (const id of fs.readdirSync(attachmentsRoot)) {
    const r0 = path.join(attachmentsRoot, id, "retry-0");
    if (!fs.existsSync(r0)) continue;
    const files = fs.readdirSync(r0);
    const failed = files.some((f) => f.startsWith("test-failed"));
    if (failed) attachFail++;
    else attachPass++;

    const ecPath = path.join(r0, "error-context.html");
    if (!failed && !fs.existsSync(ecPath)) continue;

    let parsed = { name: id, location: "", errText: "", udp: null, spec: "unknown" };
    if (fs.existsSync(ecPath)) {
      parsed = parseErrorContext(fs.readFileSync(ecPath, "utf8"));
    } else if (failed) {
      parsed.errText = "test-failed screenshot present (no error-context.html)";
    }

    const cat = categorize(parsed.errText);
    const key = parsed.name;
    if (failures.some((f) => f.name === key && f.source === "attachment")) continue;
    if (failed || parsed.errText.length > 20) {
      failures.push({ ...parsed, cat, source: "attachment" });
      bump(categories, cat, key);
      if (parsed.udp) bump(byUdp, parsed.udp, key);
      bump(bySpec, parsed.spec, key);
    }
  }
}

// Dedupe failures by normalized title (prefer attachment)
const deduped = new Map();
for (const f of failures) {
  const k = f.name.replace(/\s+/g, " ").slice(0, 200);
  const prev = deduped.get(k);
  if (!prev || f.source === "attachment") deduped.set(k, f);
}

const uniqueFailures = [...deduped.values()];

console.log("=== RUN ANALYSIS ===");
console.log("Run path:", runDir);
console.log("index.html:", fs.existsSync(indexPath) ? "yes" : "NO (attachments-only mode)");
if (summaryFromHtml) {
  console.log(
    `Summary (from HTML): pass=${summaryFromHtml.pass} fail=${summaryFromHtml.fail} flaky=${summaryFromHtml.flaky} total=${summaryFromHtml.total}`,
  );
}
if (fs.existsSync(attachmentsRoot)) {
  console.log(`Attachments: ${attachFail} failed artifacts, ${attachPass} non-failed retry-0 folders`);
}
console.log(`Unique failures parsed: ${uniqueFailures.length}`);
console.log(`Flaky entries (from HTML): ${flakyFromHtml.length}`);
if (flakyFromHtml.length) {
  console.log("\nFlaky tests:");
  for (const t of [...new Set(flakyFromHtml)].slice(0, 30)) console.log("  -", t);
}

console.log("\n=== ROOT CAUSE CATEGORIES ===");
const sortedCats = [...categories.entries()].sort((a, b) => b[1].length - a[1].length);
for (const [cat, items] of sortedCats) {
  console.log(`  ${cat}: ${items.length}`);
}

console.log("\n=== TOP SPECS BY FAILURE COUNT ===");
const sortedSpecs = [...bySpec.entries()].sort((a, b) => b[1].length - a[1].length);
for (const [spec, items] of sortedSpecs.slice(0, 20)) {
  console.log(`  ${items.length.toString().padStart(4)}  ${spec}`);
}

console.log("\n=== TOP UDP IDs BY FAILURE COUNT ===");
const sortedUdp = [...byUdp.entries()].sort((a, b) => b[1].length - a[1].length);
for (const [udp, items] of sortedUdp.slice(0, 25)) {
  console.log(`  ${items.length.toString().padStart(4)}  ${udp}`);
}

console.log("\n=== SAMPLE FAILURES PER CATEGORY (first 2 each) ===");
for (const [cat] of sortedCats) {
  const samples = uniqueFailures.filter((f) => f.cat === cat).slice(0, 2);
  console.log(`\n-- ${cat} --`);
  for (const s of samples) {
    console.log(s.udp ?? s.name.slice(0, 80));
    console.log(s.errText.slice(0, 500).replace(/\n/g, " "));
  }
}

// Write JSON summary for follow-up
const outPath = path.join(
  path.dirname(attachmentsRoot),
  "..",
  "failure-analysis-summary.json",
);
fs.writeFileSync(
  outPath,
  JSON.stringify(
    {
      runDir,
      summaryFromHtml,
      attachFail,
      attachPass,
      flaky: [...new Set(flakyFromHtml)],
      categories: Object.fromEntries(sortedCats.map(([k, v]) => [k, v.length])),
      topSpecs: sortedSpecs.slice(0, 30).map(([k, v]) => ({ spec: k, count: v.length })),
      topUdp: sortedUdp.slice(0, 50).map(([k, v]) => ({ id: k, count: v.length })),
      failures: uniqueFailures.map((f) => ({
        udp: f.udp,
        spec: f.spec,
        cat: f.cat,
        name: f.name.slice(0, 300),
        err: f.errText.slice(0, 800),
      })),
    },
    null,
    2,
  ),
);
console.log("\nWrote:", path.resolve(outPath));
