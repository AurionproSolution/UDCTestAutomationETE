import fs from "fs";

const reportPath = process.argv[2];
const html = fs.readFileSync(reportPath, "utf8");

// Collect snippets around every "failed" status with nearby title/name
const re =
  /"(title|name|testCase)"\s*:\s*"((?:\\.|[^"\\])*)"\s*,[\s\S]{0,2500}?"status"\s*:\s*"failed"/g;
const failures = [];
let m;
while ((m = re.exec(html)) !== null) {
  let title;
  try {
    title = JSON.parse(`"${m[2]}"`);
  } catch {
    title = m[2];
  }
  const tail = html.slice(m.index, m.index + 3500);
  const errM = tail.match(/"error(?:Message|Stack)?"\s*:\s*"((?:\\.|[^"\\])*)"/);
  let err = "";
  if (errM) {
    try {
      err = JSON.parse(`"${errM[1]}"`).slice(0, 800);
    } catch {
      err = errM[1].slice(0, 800);
    }
  }
  failures.push({ title, err });
}

console.log(`Total failed entries parsed: ${failures.length}\n`);
for (const f of failures) {
  if (!/UDP-T36(60|62|64|70|75|76|78|93)/.test(f.title) && !/Standard Quote/i.test(f.title)) continue;
  console.log("---");
  console.log(f.title);
  if (f.err) console.log(f.err);
}

// If regex missed, dump any failed block containing UDP
for (const id of [
  "UDP-T3660",
  "UDP-T3662",
  "UDP-T3664",
  "UDP-T3670",
  "UDP-T3675",
  "UDP-T3676",
  "UDP-T3678",
  "UDP-T3693",
]) {
  let pos = 0;
  while (true) {
    const i = html.indexOf(id, pos);
    if (i < 0) break;
    const window = html.slice(Math.max(0, i - 800), i + 5000);
    if (window.includes('"status":"failed"') || window.includes('"status": "failed"')) {
      console.log(`\n>>> FAILED window for ${id}`);
      const errM = window.match(/"error(?:Message)?"\s*:\s*"((?:\\.|[^"\\])*)"/);
      if (errM) {
        try {
          console.log(JSON.parse(`"${errM[1]}"`).slice(0, 900));
        } catch {
          console.log(errM[1].slice(0, 900));
        }
      }
    }
    pos = i + id.length;
  }
}
