/**
 * Human-readable step lines for IDE + Playwright HTML + reporters that capture stdout (e.g. Ortoni with stdIO).
 * Do not pass secrets (passwords, OTP, tokens) — only safe, high-level descriptions.
 *
 * Copy kept under `backup/utils` so `backup/tsconfig` rootDir stays self-contained.
 */

import { test } from "@playwright/test";
import type { TestCase, TestResult } from "@playwright/test/reporter";

const RECENT_STEP_BUFFER_SIZE = 5;
const STACK_PREVIEW_LINES = 5;

const STEP_LINE_RE = /\[STEP\] \[#(\d+)\] \[([^\]]+)\] (.+)/;

export type RecordedStep = {
  index: number;
  message: string;
  timestamp: string;
};

/** Per-worker counter for numbering; failure summary reads stdout/annotations (reporter runs out-of-process). */
let stepIndex = 0;

/** Clear step counter at test start (optional; reporter does not rely on in-memory recent steps). */
export function resetStepContext(): void {
  stepIndex = 0;
}

export function getStepContext(): {
  stepIndex: number;
  lastStep: RecordedStep | null;
  recentSteps: readonly RecordedStep[];
} {
  return { stepIndex, lastStep: null, recentSteps: [] };
}

function stripAnsi(text: string): string {
  return text.replace(/\u001b\[[0-9;]*m/g, "");
}

function stdoutChunks(result: TestResult): string[] {
  return (result.stdout ?? []).map((chunk) =>
    typeof chunk === "string" ? chunk : chunk.toString("utf8"),
  );
}

/** Parse numbered [STEP] lines captured in TestResult.stdout (available in reporter onTestEnd). */
export function parseStepsFromTestResult(result: TestResult): RecordedStep[] {
  const steps: RecordedStep[] = [];
  for (const chunk of stdoutChunks(result)) {
    for (const line of chunk.split(/\r?\n/)) {
      const m = line.match(STEP_LINE_RE);
      if (m) {
        steps.push({
          index: Number(m[1]),
          timestamp: m[2]!,
          message: m[3]!,
        });
      }
    }
  }
  return steps;
}

function stepsFromAnnotations(result: TestResult): RecordedStep[] {
  const stepAnnotations = (result.annotations ?? []).filter((a) => a.type === "step");
  return stepAnnotations.map((a, i) => ({
    index: i + 1,
    timestamp: "",
    message: a.description ?? "",
  }));
}

function resolveStepContext(result: TestResult): {
  lastStep: RecordedStep | null;
  recentSteps: RecordedStep[];
} {
  const parsed = parseStepsFromTestResult(result);
  const steps = parsed.length > 0 ? parsed : stepsFromAnnotations(result);
  if (steps.length === 0) {
    return { lastStep: null, recentSteps: [] };
  }
  const recentSteps = steps.slice(-RECENT_STEP_BUFFER_SIZE);
  return { lastStep: steps[steps.length - 1]!, recentSteps };
}

function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  const sec = Math.floor(ms / 1000);
  if (sec < 60) return `${sec}s`;
  const min = Math.floor(sec / 60);
  const remSec = sec % 60;
  return remSec > 0 ? `${min}m ${remSec}s` : `${min}m`;
}

function errorMessage(err: { message?: string; stack?: string } | undefined): string {
  if (!err) return "(no error message)";
  const msg = stripAnsi(err.message ?? "").trim();
  if (msg) return msg.split("\n")[0]!.trim();
  const stackLine = stripAnsi(err.stack ?? "")
    .split("\n")
    .find((l) => l.trim().length > 0);
  return stackLine?.trim() ?? "(no error message)";
}

function stackPreview(err: { stack?: string } | undefined): string | null {
  const lines = stripAnsi(err?.stack ?? "")
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);
  if (lines.length <= 1) return null;
  const preview = lines.slice(1, 1 + STACK_PREVIEW_LINES).join("\n       ");
  return preview || null;
}

function collectAssertionErrors(result: TestResult): string[] {
  const messages: string[] = [];
  const seen = new Set<string>();

  const add = (err: { message?: string } | undefined) => {
    if (!err?.message) return;
    const firstLine = stripAnsi(err.message).split("\n")[0]!.trim();
    if (!firstLine || seen.has(firstLine)) return;
    seen.add(firstLine);
    messages.push(firstLine);
  };

  add(result.error);
  for (const err of result.errors ?? []) {
    add(err);
  }

  return messages;
}

function failLine(text: string): void {
  console.log(`[FAIL] ${text}`);
}

function buildFailureSummaryText(
  test: TestCase,
  result: TestResult,
  ctx: ReturnType<typeof resolveStepContext>,
): string {
  const lines: string[] = [];
  const assertionErrors = collectAssertionErrors(result);

  lines.push(`Test: ${test.title}`);
  lines.push(`Status: ${result.status} | Duration: ${formatDuration(result.duration)}`);

  if (ctx.lastStep) {
    lines.push(`Last step [#${ctx.lastStep.index}]: ${ctx.lastStep.message}`);
  } else {
    lines.push("Last step: (none logged before failure)");
  }

  lines.push(`Reason: ${errorMessage(result.error)}`);

  const preview = stackPreview(result.error);
  if (preview) {
    lines.push(`Stack preview:\n       ${preview}`);
  }

  if (ctx.recentSteps.length > 0) {
    lines.push("Recent steps:");
    for (const s of ctx.recentSteps) {
      lines.push(`       #${s.index} ${s.message}`);
    }
  }

  if (assertionErrors.length > 1) {
    lines.push(`Assertion errors (${assertionErrors.length}):`);
    assertionErrors.forEach((msg, i) => lines.push(`       ${i + 1}) ${msg}`));
  } else if (assertionErrors.length === 1 && assertionErrors[0] !== errorMessage(result.error)) {
    lines.push(`Assertion error: ${assertionErrors[0]}`);
  }

  lines.push("Artifacts: see Ortoni Errors tab, Trace viewer, and failure screenshot");

  return lines.join("\n");
}

/**
 * Print a structured [FAIL] block to stdout (Ortoni Logs). Uses TestResult.stdout/annotations for step context.
 */
export function logFailureSummary(test: TestCase, result: TestResult): void {
  const ctx = resolveStepContext(result);
  const summaryText = buildFailureSummaryText(test, result, ctx);

  for (const line of summaryText.split("\n")) {
    failLine(line);
  }
}

/**
 * Logs one narrative step: prints to stdout and attaches a Playwright annotation when a test is active.
 */
export function logTestStep(message: string): void {
  stepIndex += 1;
  const ts = new Date().toISOString();
  const line = `[STEP] [#${stepIndex}] [${ts}] ${message}`;
  console.log(line);

  try {
    test.info().annotations.push({ type: "step", description: message });
  } catch {
    /* No active test worker (e.g. some tooling outside @playwright/test). */
  }
}
