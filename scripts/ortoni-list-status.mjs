import fs from "fs";
const h = fs.readFileSync(process.argv[2], "utf8");
const start = h.indexOf('"testResult"');
const chunk = h.slice(start, start + 300000);
const re =
  /"title":"((?:\\.|[^"\\])*)","status":"(failed|passed)"/g;
const byStatus = { failed: [], passed: [] };
let m;
while ((m = re.exec(chunk)) !== null) {
  let title;
  try {
    title = JSON.parse(`"${m[1]}"`);
  } catch {
    title = m[1];
  }
  if (!byStatus[m[2]].includes(title)) byStatus[m[2]].push(title);
}
console.log("FAILED:", byStatus.failed);
console.log("PASSED:", byStatus.passed);
