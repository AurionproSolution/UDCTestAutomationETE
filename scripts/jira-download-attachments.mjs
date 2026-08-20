/**
 * Download Jira issue attachments to docs/jira-intake/{KEY}/assets/
 *
 * Usage:
 *   node scripts/jira-download-attachments.mjs USIF-428
 *   node scripts/jira-download-attachments.mjs USIF-428 --skip-large
 *
 * Env: ATLASSIAN_EMAIL, ATLASSIAN_API_TOKEN
 * Optional: ATLASSIAN_SITE (default aurionprofintechsolutions.atlassian.net)
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");

const LARGE_BYTES = 50 * 1024 * 1024;

function parseArgs(argv) {
  const args = argv.slice(2);
  const issueKey = args.find((a) => !a.startsWith("--"));
  const skipLarge = args.includes("--skip-large");
  if (!issueKey) {
    console.error("Usage: node scripts/jira-download-attachments.mjs ISSUE_KEY [--skip-large]");
    process.exit(1);
  }
  return { issueKey: issueKey.toUpperCase(), skipLarge };
}

function authHeader() {
  const email = process.env.ATLASSIAN_EMAIL;
  const token = process.env.ATLASSIAN_API_TOKEN;
  if (!email || !token) {
    console.error(
      "Missing ATLASSIAN_EMAIL or ATLASSIAN_API_TOKEN.\n" +
        "Create an API token: https://id.atlassian.com/manage-profile/security/api-tokens",
    );
    process.exit(1);
  }
  const encoded = Buffer.from(`${email}:${token}`).toString("base64");
  return `Basic ${encoded}`;
}

async function fetchJson(url, headers) {
  const res = await fetch(url, { headers });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`HTTP ${res.status} ${url}\n${body.slice(0, 500)}`);
  }
  return res.json();
}

async function downloadFile(url, destPath, headers) {
  const res = await fetch(url, { headers });
  if (!res.ok) {
    throw new Error(`Download failed HTTP ${res.status}: ${url}`);
  }
  const buf = Buffer.from(await res.arrayBuffer());
  fs.writeFileSync(destPath, buf);
  return buf.length;
}

function sanitizeFilename(name) {
  return name.replace(/[<>:"/\\|?*]/g, "_");
}

async function main() {
  const { issueKey, skipLarge } = parseArgs(process.argv);
  const site = process.env.ATLASSIAN_SITE || "aurionprofintechsolutions.atlassian.net";
  const baseUrl = `https://${site}`;
  const headers = {
    Authorization: authHeader(),
    Accept: "application/json",
  };

  const outDir = path.join(ROOT, "docs", "jira-intake", issueKey, "assets");
  fs.mkdirSync(outDir, { recursive: true });

  const manifestPath = path.join(outDir, "manifest.json");
  let existingManifest = {};
  if (fs.existsSync(manifestPath)) {
    try {
      existingManifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
    } catch {
      existingManifest = {};
    }
  }

  const issue = await fetchJson(
    `${baseUrl}/rest/api/3/issue/${issueKey}?fields=attachment,summary`,
    headers,
  );
  const attachments = issue.fields?.attachment ?? [];
  const manifest = {
    issueKey,
    summary: issue.fields?.summary ?? "",
    downloadedAt: new Date().toISOString(),
    files: [],
  };

  console.log(`Issue ${issueKey}: ${attachments.length} attachment(s)`);

  for (const att of attachments) {
    const filename = sanitizeFilename(att.filename);
    const destPath = path.join(outDir, filename);
    const size = att.size ?? 0;

    if (skipLarge && size > LARGE_BYTES) {
      console.warn(`  SKIP (large ${(size / 1024 / 1024).toFixed(1)} MB): ${filename}`);
      manifest.files.push({
        filename,
        mimeType: att.mimeType,
        size,
        skipped: true,
        reason: "large",
      });
      continue;
    }

    const prev = existingManifest.files?.find((f) => f.filename === filename);
    if (prev && !prev.skipped && fs.existsSync(destPath) && fs.statSync(destPath).size === size) {
      console.log(`  OK (cached): ${filename}`);
      manifest.files.push({ ...prev, cached: true });
      continue;
    }

    if (size > LARGE_BYTES) {
      console.warn(`  WARN: downloading large file (${(size / 1024 / 1024).toFixed(1)} MB): ${filename}`);
    }

    console.log(`  Downloading: ${filename}`);
    const downloadedSize = await downloadFile(att.content, destPath, headers);
    manifest.files.push({
      filename,
      mimeType: att.mimeType,
      size: downloadedSize,
      localPath: path.relative(ROOT, destPath).replace(/\\/g, "/"),
      downloadedAt: new Date().toISOString(),
    });
  }

  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));
  console.log(`Manifest: ${path.relative(ROOT, manifestPath)}`);
}

main().catch((err) => {
  console.error(err.message || err);
  process.exit(1);
});
