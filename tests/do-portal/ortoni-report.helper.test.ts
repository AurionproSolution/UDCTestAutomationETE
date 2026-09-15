/**
 * Unit tests for Ortoni path resolution (flat vs nested run-* folders).
 */

import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import { expect, test } from "@playwright/test";
import {
  resolveOrtoniIndexPath,
  resolveOrtoniReportDir,
  syncOrtoniReportEntryPoint,
} from "../../playwright/ortoni-report.helper";
import { archiveReports } from "../../playwright/report-backup.helper";

test.describe("ortoni-report.helper @unit", () => {
  const tempDirs: string[] = [];

  test.afterEach(() => {
    for (const dir of tempDirs.splice(0)) {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });

  function makeTempCwd(): string {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "ortoni-helper-"));
    tempDirs.push(dir);
    return dir;
  }

  test("resolves flat ortoni-report/index.html", () => {
    const cwd = makeTempCwd();
    const index = path.join(cwd, "ortoni-report", "index.html");
    fs.mkdirSync(path.dirname(index), { recursive: true });
    fs.writeFileSync(index, "<html></html>");

    expect(resolveOrtoniIndexPath(cwd)).toBe(index);
    expect(resolveOrtoniReportDir(cwd)).toBe(path.join(cwd, "ortoni-report"));
  });

  test("resolves nested ortoni-report/run-*/index.html", () => {
    const cwd = makeTempCwd();
    const nested = path.join(cwd, "ortoni-report", "run-123-456", "index.html");
    fs.mkdirSync(path.dirname(nested), { recursive: true });
    fs.writeFileSync(nested, "<html></html>");

    expect(resolveOrtoniIndexPath(cwd)).toBe(nested);
    expect(resolveOrtoniReportDir(cwd)).toBe(path.dirname(nested));
  });

  test("syncOrtoniReportEntryPoint copies nested run assets to ortoni-report root", () => {
    const cwd = makeTempCwd();
    const runDir = path.join(cwd, "ortoni-report", "run-999-1");
    fs.mkdirSync(runDir, { recursive: true });
    fs.writeFileSync(path.join(runDir, "index.html"), "<html>nested</html>");
    fs.mkdirSync(path.join(runDir, "ortoni-data"), { recursive: true });
    fs.writeFileSync(path.join(runDir, "ortoni-data", "shot.png"), "png");

    const synced = syncOrtoniReportEntryPoint(cwd);
    expect(synced).toBe(path.join(cwd, "ortoni-report", "index.html"));
    expect(fs.readFileSync(path.join(cwd, "ortoni-report", "index.html"), "utf-8")).toContain(
      "nested",
    );
    expect(fs.existsSync(path.join(cwd, "ortoni-report", "ortoni-data", "shot.png"))).toBeTruthy();
  });

  test("archiveReports succeeds when only nested Ortoni index exists", () => {
    const cwd = makeTempCwd();
    const runDir = path.join(cwd, "ortoni-report", "run-archive-1");
    fs.mkdirSync(runDir, { recursive: true });
    fs.writeFileSync(path.join(runDir, "index.html"), "<html>backup</html>");

    const originalCwd = process.cwd();
    process.chdir(cwd);
    try {
      const archived = archiveReports({ overallStatus: "passed" });
      expect(archived).not.toBeNull();
      expect(archived!.backedUpOrtoni).toBeTruthy();
      expect(fs.existsSync(path.join(cwd, "ortoni-report", "index.html"))).toBeTruthy();
      expect(
        fs.existsSync(path.join(archived!.backupDir, "ortoni-report", "index.html")),
      ).toBeTruthy();
    } finally {
      process.chdir(originalCwd);
    }
  });
});
