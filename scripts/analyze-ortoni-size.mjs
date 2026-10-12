import fs from "fs";
import path from "path";

const root = path.resolve(process.argv[2] ?? "ortoni-report");
if (!fs.existsSync(root)) {
  console.log("No folder:", root);
  process.exit(0);
}

function dirSize(dir) {
  let bytes = 0;
  let files = 0;
  const byExt = new Map();
  const walk = (d) => {
    for (const ent of fs.readdirSync(d, { withFileTypes: true })) {
      const p = path.join(d, ent.name);
      if (ent.isDirectory()) walk(p);
      else {
        const st = fs.statSync(p);
        bytes += st.size;
        files++;
        const ext = path.extname(ent.name).toLowerCase() || "(no ext)";
        byExt.set(ext, (byExt.get(ext) ?? 0) + st.size);
      }
    }
  };
  walk(dir);
  return { bytes, files, byExt };
}

function fmt(mb) {
  return mb >= 1024 ? `${(mb / 1024).toFixed(2)} GB` : `${mb.toFixed(2)} MB`;
}

const runs = fs
  .readdirSync(root, { withFileTypes: true })
  .filter((e) => e.isDirectory())
  .map((e) => e.name);

const runStats = [];
for (const name of runs) {
  const full = path.join(root, name);
  const s = dirSize(full);
  runStats.push({ name, ...s });
}
runStats.sort((a, b) => b.bytes - a.bytes);

const total = dirSize(root);
console.log(`${path.basename(root)} total: ${fmt(total.bytes / 1024 / 1024)} (${total.files} files)\n`);
console.log("By extension (all runs):");
for (const [ext, b] of [...total.byExt.entries()].sort((a, b) => b[1] - a[1]).slice(0, 15)) {
  const pct = ((b / total.bytes) * 100).toFixed(1);
  console.log(`  ${ext.padEnd(12)} ${fmt(b / 1024 / 1024).padStart(10)}  (${pct}%)`);
}

console.log(`\nRuns: ${runStats.length}`);
for (const r of runStats.slice(0, 25)) {
  console.log(`  ${fmt(r.bytes / 1024 / 1024).padStart(10)}  ${String(r.files).padStart(5)} files  ${r.name}`);
}

function breakdownRun(runName) {
  const topPath = path.join(root, runName);
  if (!fs.existsSync(topPath)) return;
  console.log(`\n--- ${runName} ---`);
  const dataPath = path.join(topPath, "ortoni-data");
  if (fs.existsSync(dataPath)) {
    const att = path.join(dataPath, "attachments");
    if (fs.existsSync(att)) {
      const tests = fs.readdirSync(att, { withFileTypes: true }).filter((e) => e.isDirectory());
      const perTest = tests.map((t) => {
        const s = dirSize(path.join(att, t.name));
        return { id: t.name.slice(0, 12), ...s };
      });
      perTest.sort((a, b) => b.bytes - a.bytes);
      console.log(`  attachments: ${tests.length} test folders`);
      let zip = 0,
        webm = 0,
        png = 0;
      for (const [, b] of dirSize(dataPath).byExt) {
        /* noop */
      }
      const ds = dirSize(dataPath);
      for (const [ext, b] of ds.byExt) {
        if (ext === ".zip") zip = b;
        if (ext === ".webm") webm = b;
        if (ext === ".png") png = b;
      }
      console.log(
        `  ortoni-data: ${fmt(ds.bytes / 1024 / 1024)} — trace .zip ${fmt(zip / 1024 / 1024)}, video .webm ${fmt(webm / 1024 / 1024)}, png ${fmt(png / 1024 / 1024)}`,
      );
      console.log("  largest attachment folders:");
      for (const t of perTest.slice(0, 5)) {
        console.log(`    ${fmt(t.bytes / 1024 / 1024).padStart(10)}  ${t.id}…`);
      }
    }
  }
  const index = path.join(topPath, "index.html");
  if (fs.existsSync(index)) {
    console.log(`  index.html: ${fmt(fs.statSync(index).size / 1024 / 1024)}`);
  }
}

const sample = process.argv[3];
if (sample) {
  breakdownRun(sample);
} else {
  for (const r of runStats.filter((x) => x.name.startsWith("run-")).slice(0, 3)) {
    breakdownRun(r.name);
  }
  breakdownRun("run-1790678123121-68184");
  breakdownRun("run-1790598705900-1256");
}
