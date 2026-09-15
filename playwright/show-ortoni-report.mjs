/**
 * Opens the latest Ortoni report (flat or nested run-* folder).
 * Usage: node playwright/show-ortoni-report.mjs
 */

import { spawnSync } from "node:child_process";
import * as fs from "node:fs";
import * as path from "node:path";

const LIVE_ORTONI = "ortoni-report";
const INDEX = "index.html";

function statMtimeMs(filePath) {
  try {
    return fs.statSync(filePath).mtimeMs;
  } catch {
    return 0;
  }
}

function resolveOrtoniReportDir(cwd) {
  const ortoniRoot = path.join(cwd, LIVE_ORTONI);
  if (!fs.existsSync(ortoniRoot)) {
    return null;
  }

  const flat = path.join(ortoniRoot, INDEX);
  let best = fs.existsSync(flat) ? flat : null;
  let bestMtime = best ? statMtimeMs(best) : 0;

  const walk = (dir) => {
    let entries;
    try {
      entries = fs.readdirSync(dir, { withFileTypes: true });
    } catch {
      return;
    }
    for (const entry of entries) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        walk(full);
        continue;
      }
      if (entry.name !== INDEX) {
        continue;
      }
      const mtime = statMtimeMs(full);
      if (!best || mtime >= bestMtime) {
        best = full;
        bestMtime = mtime;
      }
    }
  };

  walk(ortoniRoot);
  return best ? path.dirname(best) : null;
}

const cwd = process.cwd();
const reportDir = resolveOrtoniReportDir(cwd);

if (!reportDir) {
  console.error(
    `Ortoni report not found. Run tests from the terminal without PLAYWRIGHT_SKIP_ORTONI=1, then retry.\nExpected: ${path.join(cwd, LIVE_ORTONI, "**", INDEX)}`,
  );
  process.exit(1);
}

const relative = path.relative(cwd, reportDir).replace(/\\/g, "/");
console.log(`Opening Ortoni report: ${relative}/`);

const preferredPort = Number.parseInt(process.env.PLAYWRIGHT_REPORT_PORT ?? "9323", 10);
const portCandidates = [
  preferredPort,
  preferredPort + 1,
  preferredPort + 2,
  preferredPort + 3,
];

let lastStatus = 1;
for (const port of portCandidates) {
  if (!Number.isFinite(port) || port <= 0) {
    continue;
  }
  const result = spawnSync(
    "npx",
    ["playwright", "show-report", relative, "--port", String(port)],
    { shell: true, cwd, encoding: "utf8", stdio: ["inherit", "inherit", "pipe"] },
  );
  lastStatus = result.status ?? 1;
  if (lastStatus === 0) {
    process.exit(0);
  }
  const stderr = `${result.stderr ?? ""}`;
  if (!/EADDRINUSE|address already in use/i.test(stderr)) {
    process.exit(lastStatus);
  }
  console.warn(`Port ${port} is in use; trying ${port + 1}...`);
}

console.error(
  "Could not start report server (ports in use). Close other Playwright report windows or run:\n" +
    `  npx playwright show-report ${relative} --port 9330`,
);
process.exit(lastStatus);
