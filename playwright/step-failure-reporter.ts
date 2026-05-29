/**
 * Resets step context at test start and prints a [FAIL] summary block when a test does not pass.
 * Works with all tests (no fixture import required); register before ortoni-report in playwright.config.ts.
 */

import type {
  FullConfig,
  FullResult,
  Reporter,
  Suite,
  TestCase,
  TestResult,
} from "@playwright/test";
import { logFailureSummary, resetStepContext } from "../utils/testStepLog";

const FAILURE_STATUSES = new Set(["failed", "timedOut", "interrupted"]);

class StepFailureReporter implements Reporter {
  onBegin(_config: FullConfig, _suite: Suite): void {
    /* per-test reset happens in onTestBegin */
  }

  onTestBegin(_test: TestCase): void {
    resetStepContext();
  }

  onTestEnd(test: TestCase, result: TestResult): void {
    if (!FAILURE_STATUSES.has(result.status)) {
      return;
    }
    logFailureSummary(test, result);
  }

  onEnd(_result: FullResult): void {
    /* noop */
  }
}

export default StepFailureReporter;
