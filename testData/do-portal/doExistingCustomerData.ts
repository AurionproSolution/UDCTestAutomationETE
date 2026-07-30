import { getCurrentEnv } from "../../config/env";
import type { DoExistingCustomerNumbers, DoExistingCustomerTestData } from "../types";
import existingCustomerData from "./existingCustomerData.json";

const data = existingCustomerData as DoExistingCustomerTestData;

type CustomerKey = keyof DoExistingCustomerNumbers;

const ENV_VAR_BY_KEY: Record<CustomerKey, string> = {
  individual: "UDC_EXISTING_CUSTOMER_NUMBER",
  secondIndividual: "UDC_EXISTING_SECOND_CUSTOMER_NUMBER",
  business: "UDC_EXISTING_BUSINESS_CUSTOMER_NUMBER",
  partnership: "UDC_EXISTING_PARTNERSHIP_CUSTOMER_NUMBER",
};

function readFromFile(key: CustomerKey): string {
  const env = getCurrentEnv();
  const fromEnv =
    data.environments?.[env]?.[key] ??
    data.environments?.qat?.[key] ??
    data.default?.[key];
  return (fromEnv ?? "").trim();
}

function readCustomerNumber(key: CustomerKey): string {
  const envOverride = process.env[ENV_VAR_BY_KEY[key]]?.trim();
  if (envOverride) {
    return envOverride;
  }
  return readFromFile(key);
}

/**
 * FIS existing UDC customer numbers for the active `TEST_ENV`.
 * Priority: env var (`UDC_EXISTING_*`) → `environments[TEST_ENV]` → `environments.qat` → `default`.
 */
export function getDoExistingCustomerNumbers(): DoExistingCustomerNumbers {
  return {
    individual: readCustomerNumber("individual"),
    secondIndividual: readCustomerNumber("secondIndividual"),
    business: readCustomerNumber("business"),
    partnership: readCustomerNumber("partnership"),
  };
}

/** @deprecated Prefer {@link getDoExistingCustomerNumbers}. */
export const EXISTING_UDC_INDIVIDUAL = readCustomerNumber("individual");
/** @deprecated Prefer {@link getDoExistingCustomerNumbers}. */
export const EXISTING_UDC_SECOND_INDIVIDUAL = readCustomerNumber("secondIndividual");
/** @deprecated Prefer {@link getDoExistingCustomerNumbers}. */
export const EXISTING_UDC_BUSINESS = readCustomerNumber("business");
/** @deprecated Prefer {@link getDoExistingCustomerNumbers}. */
export const EXISTING_UDC_PARTNERSHIP = readCustomerNumber("partnership");
