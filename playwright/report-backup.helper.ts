/**
 * Archives live report folders to results/report-YYYY-MM-DD_HH-mm-ss/ after each CLI run.
 * Live folders (ortoni-report/, my-report/) are unchanged.
 */

import * as fs from "fs";
import * as path from "path";

const RESULTS_ROOT = "results";
const LIVE_ORTONI = "ortoni-report";
const LIVE_PLAYWRIGHT_HTML = "my-report";
const ORTONI_INDEX = path.join(LIVE_ORTONI, "index.html");

function getPlaywrightVersion(): string | undefined {
  try {
    const pkgPath = path.join(
      process.cwd(),
      "node_modules",
      "@playwright",
      "test",
      "package.json",
    );
    if (!fs.existsSync(pkgPath)) {
      return undefined;
    }
    const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf-8")) as { version?: string };
    return pkg.version;
  } catch {
    return undefined;
  }
}

export function buildBackupFolderName(now = new Date()): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  const date = [
    now.getFullYear(),
    pad(now.getMonth() + 1),
    pad(now.getDate()),
  ].join("-");
  const time = [pad(now.getHours()), pad(now.getMinutes()), pad(now.getSeconds())].join(
    "-",
  );
  return `report-${date}_${time}`;
}

function resolveUniqueBackupDir(cwd: string, baseName: string): string {
  let candidate = path.join(cwd, RESULTS_ROOT, baseName);
  if (!fs.existsSync(candidate)) {
    return candidate;
  }
  let suffix = 2;
  while (fs.existsSync(path.join(cwd, RESULTS_ROOT, `${baseName}-${suffix}`))) {
    suffix += 1;
  }
  return path.join(cwd, RESULTS_ROOT, `${baseName}-${suffix}`);
}

function copyDirIfExists(source: string, destination: string): boolean {
  if (!fs.existsSync(source)) {
    return false;
  }
  fs.cpSync(source, destination, { recursive: true });
  return true;
}

export interface ArchiveReportsOptions {
  overallStatus?: string;
}

export interface ArchiveReportsResult {
  backupDir: string;
  backedUpOrtoni: boolean;
  backedUpPlaywrightHtml: boolean;
}

export function archiveReports(
  options: ArchiveReportsOptions = {},
): ArchiveReportsResult | null {
  const cwd = process.cwd();
  const ortoniIndexPath = path.join(cwd, ORTONI_INDEX);

  if (!fs.existsSync(ortoniIndexPath)) {
    return null;
  }

  const baseName = buildBackupFolderName();
  const backupDir = resolveUniqueBackupDir(cwd, baseName);
  fs.mkdirSync(backupDir, { recursive: true });

  const backedUpOrtoni = copyDirIfExists(
    path.join(cwd, LIVE_ORTONI),
    path.join(backupDir, LIVE_ORTONI),
  );
  const backedUpPlaywrightHtml = copyDirIfExists(
    path.join(cwd, LIVE_PLAYWRIGHT_HTML),
    path.join(backupDir, LIVE_PLAYWRIGHT_HTML),
  );

  const runInfo = {
    archivedAt: new Date().toISOString(),
    backupFolder: path.relative(cwd, backupDir).replace(/\\/g, "/"),
    testEnv: process.env.TEST_ENV ?? "qat",
    ci: process.env.CI === "true",
    playwrightVersion: getPlaywrightVersion(),
    nodeVersion: process.version,
    overallStatus: options.overallStatus ?? "unknown",
    backedUpOrtoni,
    backedUpPlaywrightHtml,
    note:
      "Full recursive copy of live report folders. Ortoni backup includes index.html, ortoni-data/ (screenshots, videos, traces), trace/ viewer assets, and ortoni-data-history.sqlite when present.",
  };

  fs.writeFileSync(
    path.join(backupDir, "run-info.json"),
    JSON.stringify(runInfo, null, 2),
    "utf-8",
  );

  return { backupDir, backedUpOrtoni, backedUpPlaywrightHtml };
}
