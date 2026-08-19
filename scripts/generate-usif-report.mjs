/**
 * Generates USIF bug-test observation report (Word .docx).
 * Usage: node scripts/generate-usif-report.mjs
 */
import fs from "fs";
import path from "path";
import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  HeadingLevel,
  ImageRun,
  Table,
  TableRow,
  TableCell,
  WidthType,
  BorderStyle,
  AlignmentType,
} from "docx";

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Z]:)/, "$1")), "..");
const TEST_RESULTS = path.join(ROOT, "test-results");
const OUT_DIR = path.join(ROOT, "reports");
const OUT_FILE = path.join(OUT_DIR, "USIF-Bug-Test-Observations-QAT.docx");

/** QAT run — 19 Aug 2026 (~32.4 min, workers=1, udc-chromium). */
const RUN_META = {
  environment: "QAT",
  portalUrl: "https://testportaludc.aurionpro.com/",
  dealer: "Armstrong Prestige Wellington",
  user: "DEEPAK.PARAMANICK",
  duration: "32.4 minutes",
  runDate: "19 August 2026",
  summary: "2 passed, 3 failed (exit code 1 — expected for open bug repro tests)",
};

const TESTS = [
  {
    id: "USIF-405",
    file: "USIF-405-decimalAmountDeletion.test.ts",
    title: "Decimal amount field deletion / caret at decimal (Home Ownership)",
    jira: "https://aurionprofintechsolutions.atlassian.net/browse/USIF-405",
    result: "Failed",
    verdict: "Bug reproduced",
    duration: "8.8 min",
    screenshotHint: "00cfe-ping-respect-caret-position",
    observation:
      "After entering Home Ownership amount 9999999999.99, backspace at the decimal position changed the integer from 9999999999 to 999999999 instead of removing only a fractional digit. UI showed $999,999,999.90 after failure. Confirms USIF-405 Issue 1.",
    error: "USIF-405: backspace at decimal changed integer (9999999999 → 999999999)",
  },
  {
    id: "USIF-420",
    file: "USIF-420-leftNavBrowserZoom.test.ts",
    title: "Left nav shifts when browser zoom 100% → 80%",
    jira: "https://aurionprofintechsolutions.atlassian.net/browse/USIF-420",
    result: "Passed",
    verdict: "No repro on QAT (review)",
    duration: "16.2 s",
    screenshotHint: "4363f--is-reduced-from-100-to-80",
    observation:
      "Left icon navigation X position drift and overlap with app-dashboard were within tolerance when zoom changed 100% → 80% via CDP. Test passed on QAT — defect may be fixed in this environment or assertion thresholds may need review.",
    error: "",
  },
  {
    id: "USIF-421",
    file: "USIF-421-tradeAmountAssetValue.test.ts",
    title: "Trade Amount not populating Asset Value on Add Trade",
    jira: "https://aurionprofintechsolutions.atlassian.net/browse/USIF-421",
    result: "Passed (test.fail)",
    verdict: "Bug still open (masked)",
    duration: "4.9 min",
    screenshotHint: "4d7c9-d-Trade-Amount-first-trade",
    observation:
      "Test uses test.fail(USIF_421_OPEN=true). Assertion failed internally (Asset Value not auto-populated from Trade Amount $5,000) but runner reports pass. Remove test.fail when USIF-421 is fixed.",
    error: "Internal assertion failed — masked by test.fail",
  },
  {
    id: "USIF-425",
    file: "USIF-425-copyPrimaryBorrowerStreetType.test.ts",
    title: "Copy Primary Borrower Address corrupts Street Type (Road → Broadway)",
    jira: "https://aurionprofintechsolutions.atlassian.net/browse/USIF-425",
    result: "Failed",
    verdict: "Bug reproduced",
    duration: "9.3 min",
    screenshotHint: "28b89-e-on-residential-and-postal",
    observation:
      "Primary borrower physical and postal addresses set to Street Type Road (manual Zephyr/Wellington). After co-borrower Copy primary borrower = Yes, physical Street Type remained Road but postal Street Type became Broadway. Confirms USIF-425.",
    error: 'Expected postal Street Type /^Road$/i — received "Broadway"',
  },
  {
    id: "USIF-431",
    file: "USIF-431-timeAtEmployment.test.ts",
    title: "Time at Employment mandatory for Retired / Beneficiary / Unemployed / Unknown",
    jira: "https://aurionprofintechsolutions.atlassian.net/browse/USIF-431",
    result: "Failed",
    verdict: "Bug reproduced",
    duration: "7.6 min",
    screenshotHint: "d6f04-eficiary-Unemployed-Unknown",
    observation:
      "For Retired / Beneficiary / Unemployed / Unknown occupations, employer name was optional but Save did not show mandatory validation for Time with Employer. Message 'Time with Employer is required' was not visible. Confirms USIF-431.",
    error: "getByText(/Time with Employe[e]?r is required/i) — element not found",
  },
];

function findScreenshot(hint) {
  if (!hint || !fs.existsSync(TEST_RESULTS)) return null;
  const dirs = fs.readdirSync(TEST_RESULTS, { withFileTypes: true }).filter((d) => d.isDirectory());
  const match = dirs.map((d) => d.name).find((name) => name.includes(hint));
  if (!match) return null;
  const dir = path.join(TEST_RESULTS, match);
  for (const name of ["test-failed-1.png", "test-finished-1.png"]) {
    const full = path.join(dir, name);
    if (fs.existsSync(full)) return full;
  }
  const anyPng = fs.readdirSync(dir).find((f) => f.endsWith(".png"));
  return anyPng ? path.join(dir, anyPng) : null;
}

function imageParagraph(imagePath, fallback) {
  if (!imagePath || !fs.existsSync(imagePath)) {
    return new Paragraph({
      children: [new TextRun({ text: fallback, italics: true, color: "666666" })],
      spacing: { after: 200 },
    });
  }
  return new Paragraph({
    children: [
      new ImageRun({
        data: fs.readFileSync(imagePath),
        transformation: { width: 520, height: 293 },
        type: "png",
      }),
    ],
    spacing: { after: 80 },
  });
}

function para(text, opts = {}) {
  return new Paragraph({ text, spacing: { after: opts.after ?? 100 }, ...opts });
}

function boldLabel(label, value) {
  return new Paragraph({
    children: [
      new TextRun({ text: label, bold: true }),
      new TextRun({ text: value }),
    ],
    spacing: { after: 80 },
  });
}

async function main() {
  const summaryRows = TESTS.map((t) =>
    new TableRow({
      children: [
        cell(t.id),
        cell(t.result),
        cell(t.verdict),
        cell(t.duration),
      ],
    }),
  );

  const children = [
    new Paragraph({
      text: "DO Portal — USIF Bug Test Observations (QAT)",
      heading: HeadingLevel.TITLE,
      spacing: { after: 200 },
    }),
    boldLabel("Environment: ", `${RUN_META.environment} — ${RUN_META.portalUrl}`),
    boldLabel("Dealer: ", RUN_META.dealer),
    boldLabel("User: ", RUN_META.user),
    boldLabel("Run date: ", RUN_META.runDate),
    boldLabel("Duration: ", RUN_META.duration),
    boldLabel("Overall: ", RUN_META.summary),
    para(""),
    new Paragraph({ text: "Executive Summary", heading: HeadingLevel.HEADING_1, spacing: { after: 150 } }),
    para(
      "Five automated USIF defect regression tests were executed on QAT DO Portal with one worker and manual MFA. Three tests failed as expected (bug still reproducible). USIF-421 passed via test.fail while the defect remains open. USIF-420 passed — manual verification recommended as the left-nav shift may be fixed on QAT.",
      { after: 200 },
    ),
    new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      rows: [
        new TableRow({
          children: [
            headerCell("Ticket"),
            headerCell("Result"),
            headerCell("Verdict"),
            headerCell("Duration"),
          ],
        }),
        ...summaryRows,
      ],
    }),
    para("", { after: 300 }),
  ];

  for (const t of TESTS) {
    const screenshot = findScreenshot(t.screenshotHint);
    children.push(
      new Paragraph({
        text: `${t.id} — ${t.title}`,
        heading: HeadingLevel.HEADING_1,
        spacing: { before: 240, after: 120 },
      }),
      boldLabel("Jira: ", t.jira),
      boldLabel("Test file: ", `tests/do-portal/doSanityTest/jira tickets/${t.file}`),
      boldLabel("Result: ", t.result),
      boldLabel("Verdict: ", t.verdict),
      boldLabel("Duration: ", t.duration),
      ...(t.error
        ? [boldLabel("Error / assertion: ", t.error)]
        : []),
      boldLabel("Observation: ", t.observation),
      para("Screenshot:", { after: 60 }),
      imageParagraph(screenshot, "Screenshot not found in test-results for this run."),
      para(""),
    );
  }

  children.push(
    new Paragraph({ text: "Interpretation Guide", heading: HeadingLevel.HEADING_1, spacing: { before: 240, after: 120 } }),
    para("• Failed on USIF-405, 425, 431 = defect still reproducible; automation is working as designed."),
    para("• Passed on USIF-421 = defect still open but masked by test.fail — remove flag when fixed."),
    para("• Passed on USIF-420 = no repro on QAT; confirm manually or tighten assertions if bug persists elsewhere."),
    para("• When a Jira is resolved, the corresponding test should pass without test.fail."),
    para("", { after: 120 }),
    para("Re-run command (QAT):", { after: 60 }),
    para(
      '$env:TEST_ENV="qat"; $env:PLAYWRIGHT_IDE="1"; npx playwright test "USIF-405-decimalAmountDeletion|USIF-420-leftNavBrowserZoom|USIF-421-tradeAmountAssetValue|USIF-425-copyPrimaryBorrowerStreetType|USIF-431-timeAtEmployment" --project=udc-chromium --workers=1',
      { after: 200 },
    ),
  );

  fs.mkdirSync(OUT_DIR, { recursive: true });
  const buffer = await Packer.toBuffer(new Document({ sections: [{ children }] }));
  fs.writeFileSync(OUT_FILE, buffer);
  console.log(`Report written: ${OUT_FILE}`);
}

function cell(text) {
  return new TableCell({
    children: [new Paragraph({ children: [new TextRun({ text: String(text) })] })],
    borders: tableBorders(),
  });
}

function headerCell(text) {
  return new TableCell({
    children: [
      new Paragraph({
        children: [new TextRun({ text, bold: true })],
        alignment: AlignmentType.CENTER,
      }),
    ],
    borders: tableBorders(),
  });
}

function tableBorders() {
  const b = { style: BorderStyle.SINGLE, size: 1, color: "CCCCCC" };
  return { top: b, bottom: b, left: b, right: b };
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
