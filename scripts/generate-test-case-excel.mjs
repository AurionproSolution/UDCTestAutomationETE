import * as XLSX from "xlsx";
import { mkdirSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const outDir = join(__dirname, "..", "docs");

const summaryHeaders = [
  "TC ID",
  "Test Case Name",
  "Test Objective",
  "Flow Steps",
  "Validation Points",
  "Assertion Style",
  "Test Type",
  "Automation Status",
  "Flow Automated",
  "Validations Automated",
  "Owner",
  "Test File",
  "Page Object",
  "Status",
  "Notes / Blocker",
];

const testCases = {
  TCC001: {
    flowSteps: [
      "Login (storageState) → Dashboard → select dealer Armstrong Prestige Wellington",
      "Open Quick Quote → assert QQ root and form visible",
      "Select product CSA-C-Assigned → assert related programs in dropdown",
      "Select program CSA Personal - MV Dealer",
      "Enter finance (Monthly, 9%, 36mo, $20k, 10% deposit, 0% balloon) → Calculate",
      "Assert calculation summary (Loan Amount, Total Payable); Create Quote and Add Comparison 2 enabled",
      "Print / Download buttons visible (trial click)",
      "Create Quote → Standard Quote → assert CSA / Credit Sale visible",
      "Asset Details: assert product/program and finance carried from Quick Quote",
      "Assert UDC establishment fee, loan dates; Calculate with blank origination; enter origination ref",
      "Assert dealer origination fee, PPSR, LMF; interest editable + brand hint; enter asset + vehicle data",
      "Expand dealer finance, PPSR count, Calculate; trade-in search opens; KID dialog open/close",
      "Next → Add Borrower: UDC #420 → Add New Customer (Individual)",
      "Personal Details: empty Save → required assert; invalid format → assert; fill valid → Next",
      "Address: physical empty → assert; fill + postal reuse; previous empty → assert (if visible); fill → Next",
      "Employment: current empty → assert; fill (<3yr) → previous section; previous empty → assert; fill → Next",
      "Financial Position: sections visible; fill assets/liabilities/income/expenditure; income decrease Yes/No conditional; essential outgoings → Next",
      "Reference: add contact, confirm, Submit → Upload step",
      "Notes: author/timestamp on cards; >1000 chars rejected; exactly 1000 saves; More link on long note",
      "Upload: JPG + PDF succeed; >20 MB rejected; Preview new tab; Download; Delete tile",
      "Documents tab: select Customer Quote Basic → Download → confirm parameters",
      "Add note, submit quote, complete originator declaration",
    ],
    validationPoints: [
      ["Quick Quote", "QQ root and form visible"],
      ["Quick Quote", "Product and program dropdowns visible"],
      ["Quick Quote", "Programs list non-empty with CSA-related options"],
      ["Quick Quote", "Calculation summary shows Loan Amount and Total Payable"],
      ["Quick Quote", "Create Quote visible after Calculate"],
      ["Quick Quote", "Add Comparison 2 enabled after Calculate"],
      ["Quick Quote", "Print and Download buttons visible"],
      ["Standard Quote", "Standard quote root and CSA / Credit Sale visible after Create Quote"],
      ["Asset Details", "Product and program carried from Quick Quote"],
      ["Asset Details", "Finance fields carried from Quick Quote (cash, term, frequency, interest)"],
      ["Asset Details", "UDC establishment fee pre-populated from program"],
      ["Asset Details", "Calculate allowed with blank origination reference"],
      ["Asset Details", "Dealer origination fee populated from program"],
      ["Asset Details", "PPSR count and fee line visible"],
      ["Asset Details", "Loan maintenance fee / LMF area visible"],
      ["Asset Details", "Interest rate editable; brand hierarchy hint if shown"],
      ["Asset Details", "Dealer finance expanded summary and PPSR count value"],
      ["Asset Details", "Trade-in search chooser opens from Asset Summary"],
      ["Personal Details", "Required fields on empty Save"],
      ["Personal Details", "Invalid format (mobile, email, licence, version)"],
      ["Physical Address", "Required fields on empty Save"],
      ["Previous Physical Address", "Required fields when section visible"],
      ["Current Employment", "Required fields on empty Save"],
      ["Current Employment", "Previous Employment section appears when tenure < 3 years"],
      ["Previous Employment", "Required fields on empty Save"],
      ["Financial Position (Individual)", "Section visibility"],
      ["Financial Position (Individual)", "Income decrease Yes → Details enabled; No → hidden/disabled"],
      ["Financial Position (Individual)", 'Essential Outgoings default type "Other"'],
      ["Notes", "Existing note cards show author and timestamp"],
      ["Notes", "Oversized note (>1000 chars) rejected on submit"],
      ["Notes", "Exactly 1000-char note saves; list shows More for long saved note"],
      ["Upload", "JPG and PDF uploads both visible"],
      ["Upload", "Oversize binary upload (>20 MB) rejected"],
      ["Upload", "Preview opens new tab; download starts; delete removes tile"],
      ["Completion", "Quote submit + originator declaration (POM action/wait chain)"],
    ],
    pageObjects: [
      ["DODashboardPage", "pages/do-portal/dashboard/DashboardPage.ts"],
      ["DOQuickQuotePage", "pages/do-portal/QuickQuote/QuickQuotePage.ts"],
      ["DOAssetDetailsPage", "pages/do-portal/StandardQuote/AssetDetails/AssetDetailsPage.ts"],
      ["DOAddAssetPage", "pages/do-portal/StandardQuote/AssetDetails/AddAssetPage.ts"],
      ["DOPersonalDetailsPage", "pages/do-portal/StandardQuote/CustomerDetails/personalDetails.ts"],
      ["DOAddressDetailsPage", "pages/do-portal/StandardQuote/CustomerDetails/addressDetails.ts"],
      ["DOEmploymentDetailsPage", "pages/do-portal/StandardQuote/CustomerDetails/employmentDetails.ts"],
      ["DOFinancialPositionPage", "pages/do-portal/StandardQuote/CustomerDetails/financialPosition.ts"],
      ["DOReferenceDetailsPage", "pages/do-portal/StandardQuote/CustomerDetails/referenceDetails.ts"],
      ["DOCustomerQuotePostSubmitPage", "pages/do-portal/StandardQuote/CustomerDetails/customerQuotePostSubmit.ts"],
    ],
    summary: {
      id: "TCC001",
      name: "DO Portal - CSA-C-Assigned Quick Quote to Standard Quote - Individual Borrower customer validations, asset carry-over and quote completion",
      objective:
        "Verify CSA-C-Assigned Quick Quote calculation and Create Quote handoff to Standard Quote with correct data carry-over; validate Individual Borrower customer details (required, format, conditional); validate post-submit notes and upload rules; complete quote submission.",
      assertionStyle:
        "expect.soft for Quick Quote / carry-over checks; hard expect() + Page Object expect* for customer and post-submit validations",
      testType: "Regression (E2E)",
      automationStatus: "Automated",
      flowAutomated: "Yes — Quick Quote through originator declaration",
      validationsAutomated:
        "Yes — QQ, asset carry-over, customer, notes, and upload validations all asserted",
      owner: "TBD",
      testFile: "tests/do-portal/Regression/CSA-C-Assigned_Regression.test.ts (lines 27–449)",
      status: "Implemented — tags @do @regression @TCC001",
      notes:
        "Auth via storageState (do-portal-auth.setup.ts). Dealer Armstrong Prestige Wellington selected. Payment schedule and term-max checks commented out. Asset value entered as $10,0000 (possible typo). ~30 min timeout.",
    },
  },
  TCC002: {
    flowSteps: [
      "Login (storageState) → Dashboard → select dealer Armstrong Prestige Wellington",
      "Open Quick Quote → assert QQ root and form visible",
      "Assert Calculate hidden or disabled until product/program selected",
      "Select product CSA-C-Assigned → assert related programs in dropdown",
      "Select program CSA Personal - MV Dealer → assert pricing fields visible",
      "Assert Calculate For locked (if p-disabled); payment read-only before first calculation",
      "Enter finance fields → first Calculate → assert summary, Create Quote, Add Comparison 2 enabled",
      "Assert Calculate For unlocks after first Calculate",
      "Deposit % → $ sync (10% → $2,000); deposit $ → $4,000 back-fill",
      "Calculate For = Cash Price → cash locked; Calculate → cash value populated",
      "Calculate For = Deposit → deposit %/$ locked until Calculate → values populated",
      "Calculate For = Balloon → balloon %/$ locked until Calculate → values populated",
      "Reset → assert cash price cleared; re-select product/program and Calculate",
      "Add Comparison 2 → assert 2 panels; QQ2 cash copied; Comparison 3 disabled until QQ2 calculated",
      "Calculate QQ2 → Add Comparison 3 → assert 3 panels; no Add Comparison 4 button",
      "Print / Download buttons visible (trial click)",
      "Create Quote → Standard Quote → assert CSA / Credit Sale visible",
      "Asset Details: assert product/program and finance carried from Quick Quote",
      "Assert UDC establishment fee; Calculate with blank origination; enter origination ref",
      "Assert dealer origination fee, PPSR, LMF; interest editable; enter 8.5% → brand hierarchy hint if shown",
    ],
    validationPoints: [
      ["Quick Quote", "QQ root and form visible"],
      ["Quick Quote", "Calculate hidden or disabled until product/program chosen"],
      ["Quick Quote", "Product and program dropdowns visible; programs list non-empty with CSA-related options"],
      ["Quick Quote", "Pricing fields visible after program selected (cash, deposit, interest, term, frequency)"],
      ["Quick Quote", "Calculate For disabled when host has p-disabled class"],
      ["Quick Quote", "Payment amount read-only or display-only before first calculation"],
      ["Quick Quote", "Calculation summary shows Loan Amount and Total Payable after first Calculate"],
      ["Quick Quote", "Create Quote visible; Add Comparison 2 enabled after Calculate"],
      ["Quick Quote", "Calculate For unlocks (not p-disabled) after first Calculate"],
      ["Quick Quote", "Deposit 10% syncs to ~$2,000 on $20,000 cash price"],
      ["Quick Quote", "Deposit $4,000 back-fill on deposit dollar field"],
      ["Quick Quote", "Calculate For Cash Price — cash input not editable; numeric value after Calculate"],
      ["Quick Quote", "Calculate For Deposit — deposit %/$ not editable until Calculate; values populated after"],
      ["Quick Quote", "Calculate For Balloon — balloon %/$ not editable until Calculate; values populated after"],
      ["Quick Quote", "Reset clears cash price field"],
      ["Quick Quote", "Add Comparison 2 creates second panel with copied cash price"],
      ["Quick Quote", "Add Comparison 3 disabled until Quick Quote 2 is calculated"],
      ["Quick Quote", "Max 3 Quick Quote panels; Add Comparison 4 button absent"],
      ["Quick Quote", "Print and Download buttons visible"],
      ["Standard Quote", "Standard quote root and CSA / Credit Sale visible after Create Quote"],
      ["Asset Details", "Product and program carried from Quick Quote"],
      ["Asset Details", "Finance fields carried from Quick Quote (cash, term, frequency, interest)"],
      ["Asset Details", "UDC establishment fee pre-populated from program"],
      ["Asset Details", "Calculate allowed with blank origination reference"],
      ["Asset Details", "Dealer origination fee populated from program"],
      ["Asset Details", "PPSR count and fee line visible"],
      ["Asset Details", "Loan maintenance fee / LMF area visible"],
      ["Asset Details", "Interest rate editable"],
      ["Asset Details", "Brand hierarchy or rate hint shown when interest changed to 8.5%"],
    ],
    pageObjects: [
      ["DODashboardPage", "pages/do-portal/dashboard/DashboardPage.ts"],
      ["DOQuickQuotePage", "pages/do-portal/QuickQuote/QuickQuotePage.ts"],
      ["DOAssetDetailsPage", "pages/do-portal/StandardQuote/AssetDetails/AssetDetailsPage.ts"],
    ],
    summary: {
      id: "TCC002",
      name: "DO Portal - CSA-C-Assigned Quick Quote to Standard Quote - Quick Quote calculation modes, comparison panels and Asset Details interest brand-hint checks (subset)",
      objective:
        "Verify CSA-C-Assigned Quick Quote UI rules (Calculate For modes, deposit sync, comparison panels, reset) and Create Quote handoff to Standard Quote with correct data carry-over; validate Asset Details fees, interest editability, and brand-hierarchy hint. Subset — stops before Customer Details.",
      assertionStyle:
        "expect.soft throughout; Page Object expect* helpers for QQ carry-over and Asset Details checks; no customer validations",
      testType: "Regression (E2E) — subset",
      automationStatus: "Automated",
      flowAutomated: "Yes — Quick Quote through Asset Details interest/brand-hint (no customer or quote submission)",
      validationsAutomated:
        "Yes — all in-scope QQ and Asset Details assertions; negative QQ paths (cash price, blank terms, term max, balloon sync) commented out",
      owner: "TBD",
      testFile: "tests/do-portal/Regression/CSA-C-Assigned_Regression.test.ts (lines 451–839)",
      status: "Implemented — tags @do @regression @TCC002",
      notes:
        "Auth via storageState (do-portal-auth.setup.ts). Dealer Armstrong Prestige Wellington selected. Subset test — ends at Asset Details; no customer flow or quote completion. Several PDF negative validations commented out. ~15 min timeout.",
    },
  },
  TCC003: {
    flowSteps: [
      "Login via shared auth → open dealer dashboard",
      "Create Standard Quote → CSA → product CSA-C-Assigned, program CSA Personal - MV Dealer",
      "Asset Details: origination ref, asset type/condition, asset summary (vehicle fields), finance terms, Calculate, Next",
      "Add Borrower: UDC customer #420 → Add New Customer (Individual)",
      "Personal Details: enter last name only → Next (lands on Address first)",
      "Address: empty required fields → Save → assert; fill physical + postal reuse; previous address empty → assert (if visible); fill previous → Next",
      "Employment → Next; Financial Position → Next; Reference → confirm + Submit (incomplete path)",
      "Toast mandatory-fields → navigate to Personal Details → assert required messages",
      "Enter invalid formats on Personal → Save → assert; fill valid Personal → Next → Address Next → Employment",
      "Employment: current empty → assert; fill current (<3 yrs) → previous section appears; previous empty → assert; fill previous → Next",
      "Financial Position: sections visible → Next → amount/income validations; fill assets, liabilities, income, expenditure, essential outgoings; income decrease Yes/No conditional → Next",
      "Reference: add contact, confirm, Submit → Upload step; verify Borrower row (Liza Marie Doe)",
      "Add Guarantor (Trust): UDC #420 → new Trust; partial save; submit from Contact Details → toast → Trust validations",
      "Trust invalid format (dropdowns selected, cleared fields) → assert; fill valid Trust → Next",
      "Trust Address: required after Save → assert; fill physical/previous/registered reuse → Next",
      "Trust Financial: profit declaration, net profit > 0, turnover/balances/assets/liabilities → Trustees → Next → Submit",
      "Upload doc, download from Documents, add note, submit quote, complete originator declaration",
    ],
    validationPoints: [
      ["Physical Address", "Required fields on empty Save"],
      ["Previous Physical Address", "Required fields when section visible"],
      ["Reference Submit", 'Toast: "Please confirm all the mandatory fields" (Individual)'],
      ["Personal Details", "Required field messages (post-submit redirect)"],
      ["Personal Details", "Invalid format (mobile, email, licence, version)"],
      ["Current Employment", "Required fields on empty Save"],
      ["Current Employment", "Previous Employment section appears when tenure < 3 years"],
      ["Previous Employment", "Required fields on empty Save"],
      ["Financial Position (Individual)", "Section visibility"],
      ["Financial Position (Individual)", "Amount/frequency/income-decrease required on Next"],
      ["Financial Position (Individual)", "Income decrease Yes → Details enabled; No → hidden/disabled"],
      ["Financial Position (Individual)", 'Essential Outgoings default type "Other"'],
      ["Post-submit", "Borrower row visible with role Borrower"],
      ["Reference Submit", "Toast: mandatory fields (Trust path)"],
      ["Trust Details", "Required messages after toaster path"],
      ["Trust Details", "Validation with dropdowns selected + invalid GST"],
      ["Trust Address", "Required validation after Save"],
      ["Trust Financial", "Profit declaration required"],
      ["Trust Financial", "Net profit last year must be > 0"],
      ["Trust Financial", "Balance year endings match turnover date (with fallback)"],
      ["Post-submit", "Guarantor row shows role Guarantor"],
      ["Upload", "Document uploaded successfully"],
      ["Completion", "Quote submit + originator declaration (POM action/wait chain)"],
    ],
    pageObjects: [
      ["DODashboardPage", "pages/do-portal/dashboard/DashboardPage.ts"],
      ["DOAssetDetailsPage", "pages/do-portal/StandardQuote/AssetDetails/AssetDetailsPage.ts"],
      ["DOAddAssetPage", "pages/do-portal/StandardQuote/AssetDetails/AddAssetPage.ts"],
      ["DOPersonalDetailsPage", "pages/do-portal/StandardQuote/CustomerDetails/personalDetails.ts"],
      ["DOAddressDetailsPage", "pages/do-portal/StandardQuote/CustomerDetails/addressDetails.ts"],
      ["DOEmploymentDetailsPage", "pages/do-portal/StandardQuote/CustomerDetails/employmentDetails.ts"],
      ["DOFinancialPositionPage", "pages/do-portal/StandardQuote/CustomerDetails/financialPosition.ts"],
      ["DOReferenceDetailsPage", "pages/do-portal/StandardQuote/CustomerDetails/referenceDetails.ts"],
      ["DOTrustDetailsPage", "pages/do-portal/StandardQuote/CustomerDetails/trustDetails.ts"],
      ["DOCustomerQuotePostSubmitPage", "pages/do-portal/StandardQuote/CustomerDetails/customerQuotePostSubmit.ts"],
    ],
    summary: {
      id: "TCC003",
      name: "DO Portal - CSA-C-Assigned Standard Quote - Individual Borrower and Trust Guarantor customer validations and quote completion",
      objective:
        "Verify mandatory-field, invalid-format, and conditional validations on Customer Details for a new Individual Borrower and new Trust Guarantor on CSA-C-Assigned Standard Quote; confirm valid data completes the quote with correct roles, upload/download, note, and submission.",
      assertionStyle:
        "Hard expect() (Playwright) + Page Object expect* helpers; no expect.soft in this test",
      testType: "Regression (E2E)",
      automationStatus: "Automated",
      flowAutomated: "Yes — full path from dashboard through quote submission",
      validationsAutomated:
        "Yes — all in-scope customer/trust validations asserted; asset/finance steps are setup-only (no negative asset validations)",
      owner: "TBD",
      testFile: "tests/do-portal/Regression/CSA-C-Assigned_Regression.test.ts (lines 841–1203)",
      status: "Implemented — tags @do @regression @TCC003",
      notes:
        "Auth via shared storageState (do-portal-auth.setup.ts). Previous Physical Address validations run only if section visible. Trust balance year-endings use fallback fill if auto-sync fails. Asset value entered as $10,0000 (possible typo). Individual Personal Details required validations reached via skip-ahead + Submit path.",
    },
  },
};

function buildSummaryRow(tc) {
  const { flowSteps, validationPoints, pageObjects, summary: s } = tc;
  return [
    s.id,
    s.name,
    s.objective,
    flowSteps.map((step, i) => `${i + 1}. ${step}`).join("\n"),
    validationPoints.map((v, i) => `${i + 1}. ${v[0]} — ${v[1]}`).join("\n"),
    s.assertionStyle,
    s.testType,
    s.automationStatus,
    s.flowAutomated,
    s.validationsAutomated,
    s.owner,
    s.testFile,
    pageObjects.map(([name]) => name).join(", "),
    s.status,
    s.notes,
  ];
}

function writeWorkbook(tcId, tc) {
  const outPath = join(outDir, `${tcId}_test_case_documentation.xlsx`);
  const wb = XLSX.utils.book_new();

  const summarySheet = XLSX.utils.aoa_to_sheet([summaryHeaders, buildSummaryRow(tc)]);
  summarySheet["!cols"] = summaryHeaders.map((h) => ({ wch: Math.min(Math.max(h.length, 18), 60) }));
  XLSX.utils.book_append_sheet(wb, summarySheet, "Summary");

  const flowSheet = XLSX.utils.aoa_to_sheet([
    ["Step #", "Flow Step"],
    ...tc.flowSteps.map((step, i) => [i + 1, step]),
  ]);
  flowSheet["!cols"] = [{ wch: 8 }, { wch: 120 }];
  XLSX.utils.book_append_sheet(wb, flowSheet, "Flow Steps");

  const validationSheet = XLSX.utils.aoa_to_sheet([
    ["#", "Area", "What is validated"],
    ...tc.validationPoints.map((row, i) => [i + 1, ...row]),
  ]);
  validationSheet["!cols"] = [{ wch: 5 }, { wch: 35 }, { wch: 70 }];
  XLSX.utils.book_append_sheet(wb, validationSheet, "Validation Points");

  const poSheet = XLSX.utils.aoa_to_sheet([["Page Object", "File Path"], ...tc.pageObjects]);
  poSheet["!cols"] = [{ wch: 32 }, { wch: 75 }];
  XLSX.utils.book_append_sheet(wb, poSheet, "Page Objects");

  XLSX.writeFile(wb, outPath);
  console.log(`Created: ${outPath}`);
}

mkdirSync(outDir, { recursive: true });

const tcId = (process.argv[2] || "TCC001").toUpperCase();
const tc = testCases[tcId];

if (!tc) {
  console.error(`Unknown test case ID: ${tcId}. Available: ${Object.keys(testCases).join(", ")}`);
  process.exit(1);
}

writeWorkbook(tcId, tc);
