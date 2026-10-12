import fs from "fs";
import zlib from "zlib";

const reportHtml = process.argv[2];
if (!reportHtml) {
  console.error("Usage: node parse-playwright-html-report.mjs <index.html>");
  process.exit(1);
}

const html = fs.readFileSync(reportHtml, "utf8");
const m = html.match(
  /<template id="playwrightReportBase64">([\s\S]*?)<\/template>/,
);
if (!m) {
  console.error("playwrightReportBase64 template not found");
  process.exit(1);
}
const dataUri = m[1].trim();
const comma = dataUri.indexOf(",");
const base64 = comma >= 0 ? dataUri.slice(comma + 1) : dataUri;
const zipBuf = Buffer.from(base64, "base64");

function findEocd(buf) {
  for (let i = buf.length - 22; i >= 0; i--) {
    if (buf.readUInt32LE(i) === 0x06054b50) return i;
  }
  return -1;
}

function inflateEntry(buf, method, compressedSize, uncompressedSize) {
  const data = buf.subarray(0, compressedSize);
  if (method === 0) return data;
  if (method === 8) {
    return zlib.inflateRawSync(data, { maxOutputLength: uncompressedSize + 1024 });
  }
  throw new Error(`Unsupported compression method ${method}`);
}

function extractFile(zipBuf, name) {
  const eocd = findEocd(zipBuf);
  if (eocd < 0) throw new Error("EOCD not found");
  const cdSize = zipBuf.readUInt32LE(eocd + 12);
  const cdOffset = zipBuf.readUInt32LE(eocd + 16);
  let pos = cdOffset;
  const end = cdOffset + cdSize;
  while (pos < end) {
    if (zipBuf.readUInt32LE(pos) !== 0x02014b50) break;
    const method = zipBuf.readUInt16LE(pos + 10);
    const compressedSize = zipBuf.readUInt32LE(pos + 20);
    const uncompressedSize = zipBuf.readUInt32LE(pos + 24);
    const nameLen = zipBuf.readUInt16LE(pos + 28);
    const extraLen = zipBuf.readUInt16LE(pos + 30);
    const commentLen = zipBuf.readUInt16LE(pos + 32);
    const localHeaderOffset = zipBuf.readUInt32LE(pos + 42);
    const entryName = zipBuf.toString("utf8", pos + 46, pos + 46 + nameLen);
    if (entryName === name) {
      const lh = localHeaderOffset;
      const localNameLen = zipBuf.readUInt16LE(lh + 26);
      const localExtraLen = zipBuf.readUInt16LE(lh + 28);
      const dataStart = lh + 30 + localNameLen + localExtraLen;
      const chunk = zipBuf.subarray(dataStart, dataStart + compressedSize);
      return inflateEntry(chunk, method, compressedSize, uncompressedSize);
    }
    pos += 46 + nameLen + extraLen + commentLen;
  }
  return null;
}

const reportJsonBuf = extractFile(zipBuf, "report.json");
if (!reportJsonBuf) {
  console.error("report.json not in zip");
  process.exit(1);
}
const report = JSON.parse(reportJsonBuf.toString("utf8"));

const failed = [];
for (const file of report.files || []) {
  for (const test of file.tests || []) {
    for (const result of test.results || []) {
      if (result.status === "unexpected" || result.status === "failed") {
        const errors = (result.errors || [])
          .map((e) => e.message || String(e))
          .join("\n");
        failed.push({
          title: test.title,
          tags: test.tags,
          file: test.location?.file,
          line: test.location?.line,
          status: result.status,
          error: errors.slice(0, 2500),
        });
      }
    }
  }
}

console.log(JSON.stringify({ stats: report.stats, failed }, null, 2));
