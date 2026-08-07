import type { CarOrVanAssetData, RepaymentCalculatorData } from "../../pages/rss-portal/Applynow/HowCanWeHelpIndividualPage";

/** Dealership list API can be slow — wait until the dropdown is enabled before selecting. */
export const APPLY_NOW_DEALERS_LOAD_TIMEOUT_MS = 300_000;

/** Preferred SIT dealer when listed under “used before”; QAT parties may need search fallback. */
export const APPLY_NOW_DEALERSHIP_USED_BEFORE = "1034401-1034401 -";

/** Search term for **Select Another UDC Dealership** when history list is empty. */
export const APPLY_NOW_DEALERSHIP_FALLBACK_SEARCH = "10";

export const APPLY_NOW_REPAYMENT: RepaymentCalculatorData = {
  deposit: "$0.02",
  termMonths: "24",
  frequency: "Monthly",
  balloon: "$1000",
};

export const APPLY_NOW_ASSET_CAR_OR_VAN: CarOrVanAssetData = {
  purchasePrice: "$50000",
  make: "TOYOTA",
  model: "COROLLA",
  rego: "ABC123",
  year: "2024",
};

export const APPLY_NOW_ASSET_CAR_OR_VAN_SECOND: CarOrVanAssetData = {
  purchasePrice: "$50000",
  make: "HONDA",
  model: "CIVIC",
  rego: "XYZ789",
  year: "2023",
};

export const APPLY_NOW_ASSET_CAR_OR_LIGHT_COMMERCIAL: CarOrVanAssetData = {
  purchasePrice: "$100000.00",
  make: "TOYOTA",
  model: "HILUX",
  rego: "COM123",
  year: "2025",
};

export const APPLY_NOW_ASSET_CAR_OR_LIGHT_COMMERCIAL_SECOND: CarOrVanAssetData = {
  purchasePrice: "$50000.00",
  make: "HONDA",
  model: "CIVIC",
  rego: "XYZ789",
  year: "2023",
};

export const APPLY_NOW_OTHERS_REASON =
  "Automation — other purchase reason for Apply Now Others flow.";

export const APPLY_NOW_NOTES = "Automation Apply Now notes.";

/** Business About You — profit last year. */
export const APPLY_NOW_BUSINESS_PROFIT_LAST_YEAR: "yes" | "no" = "yes";
export const APPLY_NOW_BUSINESS_NET_PROFIT_LAST_YEAR_USD = "$50000.00";

/** New co-borrower / guarantor identity for Add New flows. */
export const APPLY_NOW_NEW_PARTY = {
  firstName: "Auto",
  lastName: "SecondParty",
  email: "auto.secondparty@example.com",
  mobile: "0212345678",
  dateOfBirth: "01/01/1990",
} as const;
