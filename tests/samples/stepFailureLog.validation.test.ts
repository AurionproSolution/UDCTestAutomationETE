/**
 * Validates numbered [STEP] logs and [FAIL] summary block (step-failure-reporter).
 * Run: npx playwright test tests/samples/stepFailureLog.validation.test.ts --project=samples
 */

import { expect, test } from "@playwright/test";
import { logTestStep } from "../../utils/testStepLog";

test.describe("Step failure log validation @sample", () => {
  test("passing test emits numbered steps only", async () => {
    logTestStep("Validation: step one");
    logTestStep("Validation: step two");
    logTestStep("Validation: step three");
    expect(1).toBe(1);
  });

  test("failing test emits numbered steps and FAIL summary", async () => {
    logTestStep("Validation: before soft assert");
    expect.soft(false, "Validation soft failure A").toBe(true);
    logTestStep("Validation: after soft assert");
    expect.soft(false, "Validation soft failure B").toBe(true);
    logTestStep("Validation: before hard fail");
    expect(true, "Validation hard failure").toBe(false);
  });
});
