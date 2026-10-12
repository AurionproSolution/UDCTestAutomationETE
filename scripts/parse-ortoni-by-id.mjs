import fs from "fs";

const html = fs.readFileSync(process.argv[2], "utf8");

const ids = [
  "UDP-T4220",
  "UDP-T4233",
  "UDP-T4236",
  "UDP-T4255",
];

for (const id of ids) {
  let pos = 0;
  while (true) {
    const i = html.indexOf(id, pos);
    if (i < 0) break;
    const w = html.slice(i, i + 12000);
    if (!/failed|unexpected|timedOut|errorMessage/i.test(w)) {
      pos = i + id.length;
      continue;
    }
    console.log("\n==========", id, "==========");
    const statusM = w.match(/"status"\s*:\s*"([^"]+)"/);
    console.log("status:", statusM?.[1] ?? "?");

    for (const key of [
      "errorMessage",
      "message",
      "snippet",
      "stack",
      "error",
    ]) {
      const re = new RegExp(
        `"${key}"\\s*:\\s*"((?:\\\\.|[^"\\\\])*)"`,
        "i",
      );
      const m = w.match(re);
      if (m) {
        try {
          const text = JSON.parse(`"${m[1]}"`)
            .replace(/\u001b\[[0-9;]*m/g, "")
            .slice(0, 2000);
          console.log(`\n[${key}]\n${text}`);
        } catch {
          console.log(`\n[${key}]\n${m[1].slice(0, 500)}`);
        }
      }
    }
    pos = i + id.length;
    break;
  }
}

// List passed tests in same run
console.log("\n========== PASSED (title hints) ==========");
const passedRe =
  /"title"\s*:\s*"((?:\\.|[^"\\])*)"[\s\S]{0,800}?"status"\s*:\s*"passed"/g;
const passed = new Set();
let pm;
while ((pm = passedRe.exec(html)) !== null) {
  try {
    passed.add(JSON.parse(`"${pm[1]}"`));
  } catch {
    passed.add(pm[1]);
  }
}
for (const t of [...passed].sort()) {
  if (/UDP-T42|authenticate/i.test(t)) console.log("passed:", t);
}
