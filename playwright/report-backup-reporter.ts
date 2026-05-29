/**
 * Runs after ortoni-report finishes writing; copies live folders to results/report-<timestamp>/.
 */

import type { FullResult, Reporter } from "@playwright/test";
import { archiveReports } from "./report-backup.helper";

function shouldSkipBackup(): boolean {
  return (
    process.env.PLAYWRIGHT_SKIP_REPORT_BACKUP === "1" ||
    process.env.PLAYWRIGHT_IDE === "1"
  );
}

class ReportBackupReporter implements Reporter {
  async onEnd(result: FullResult): Promise<void> {
    if (shouldSkipBackup()) {
      return;
    }

    const archived = archiveReports({ overallStatus: result.status });
    if (!archived) {
      console.log(
        "Report backup: skipped (ortoni-report/index.html not found — no Ortoni report to archive).",
      );
      return;
    }

    const relative = archived.backupDir.replace(/\\/g, "/");
    console.log(`Report backup: saved to ${relative}/`);
  }
}

export default ReportBackupReporter;
