/**
 * Resolve Ortoni report paths whether output is flat (ortoni-report/index.html)
 * or nested (ortoni-report/run-{timestamp}-{pid}/index.html).
 */

import * as fs from "fs";
import * as path from "path";

export const LIVE_ORTONI = "ortoni-report";
export const ORTONI_INDEX_FILENAME = "index.html";

function statMtimeMs(filePath: string): number {
  try {
    return fs.statSync(filePath).mtimeMs;
  } catch {
    return 0;
  }
}

/**
 * Newest index.html under ortoni-report (flat or nested run-* subfolders; newest mtime wins).
 */
export function resolveOrtoniIndexPath(cwd = process.cwd()): string | null {
  const ortoniRoot = path.join(cwd, LIVE_ORTONI);
  if (!fs.existsSync(ortoniRoot)) {
    return null;
  }

  const flat = path.join(ortoniRoot, ORTONI_INDEX_FILENAME);
  let best: string | null = fs.existsSync(flat) ? flat : null;
  let bestMtime = best ? statMtimeMs(best) : 0;

  const walk = (dir: string): void => {
    let entries: fs.Dirent[];
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
      if (entry.name !== ORTONI_INDEX_FILENAME) {
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
  return best;
}

/** Directory passed to `playwright show-report` (folder containing index.html). */
export function resolveOrtoniReportDir(cwd = process.cwd()): string | null {
  const indexPath = resolveOrtoniIndexPath(cwd);
  return indexPath ? path.dirname(indexPath) : null;
}

/**
 * When Ortoni wrote under run-*, copy that run's assets to ortoni-report/ root so
 * ortoni-report/index.html and npm run report:ortoni work without nested paths.
 */
export function syncOrtoniReportEntryPoint(cwd = process.cwd()): string | null {
  const indexPath = resolveOrtoniIndexPath(cwd);
  if (!indexPath) {
    return null;
  }

  const ortoniRoot = path.join(cwd, LIVE_ORTONI);
  const flatIndex = path.join(ortoniRoot, ORTONI_INDEX_FILENAME);
  const runDir = path.dirname(indexPath);

  if (path.normalize(runDir) === path.normalize(ortoniRoot)) {
    return flatIndex;
  }

  let entries: fs.Dirent[];
  try {
    entries = fs.readdirSync(runDir, { withFileTypes: true });
  } catch {
    return null;
  }

  for (const entry of entries) {
    const src = path.join(runDir, entry.name);
    const dest = path.join(ortoniRoot, entry.name);
    if (entry.isDirectory()) {
      fs.cpSync(src, dest, { recursive: true, force: true });
    } else {
      fs.mkdirSync(path.dirname(dest), { recursive: true });
      fs.copyFileSync(src, dest);
    }
  }

  return fs.existsSync(flatIndex) ? flatIndex : indexPath;
}
