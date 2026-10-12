import fs from "fs";

const reportPath = process.argv[2];
const html = fs.readFileSync(reportPath, "utf8");

const statsMatch = html.match(
  /"totalTests"\s*:\s*(\d+)[\s\S]{0,200}?"passed"\s*:\s*(\d+)[\s\S]{0,200}?"failed"\s*:\s*(\d+)/,
);
if (statsMatch) {
  console.log(
    `Summary: total=${statsMatch[1]} passed=${statsMatch[2]} failed=${statsMatch[3]}\n`,
  );
}

const re =
  /"title"\s*:\s*"((?:\\.|[^"\\])*)"[\s\S]{0,5000}?"status"\s*:\s*"(failed|unexpected)"/g;
const seen = new Set();
const failures = [];

let m;
while ((m = re.exec(html)) !== null) {
  let title;
  try {
    title = JSON.parse(`"${m[1]}"`);
  } catch {
    title = m[1];
  }
  const key = `${m[2]}::${title}`;
  if (seen.has(key)) continue;
  seen.add(key);

  const tail = html.slice(m.index, m.index + 8000);
  const errM = tail.match(
    /"error(?:Message|Stack)?"\s*:\s*"((?:\\.|[^"\\])*)"/,
  );
  let err = "";
  if (errM) {
    try {
      err = JSON.parse(`"${errM[1]}"`).replace(/\u001b\[[0-9;]*m/g, "");
    } catch {
      err = errM[1];
    }
  }
  failures.push({ status: m[2], title, err });
}

console.log(`Unique failed/unexpected tests: ${failures.length}\n`);

const focus =
  process.argv[3] === "--all"
    ? () => true
    : (f) =>
        /UDP-T|Standard Quote|authenticate DO/i.test(f.title) ||
        /AssetDetailsPage|StandardQuote_CSA/i.test(f.err);

for (const f of failures.filter(focus)) {
  console.log("---");
  console.log(`[${f.status}] ${f.title}`);
  console.log(f.err.slice(0, 1500));
  console.log("");
}
