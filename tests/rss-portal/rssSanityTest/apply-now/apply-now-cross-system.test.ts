/**
 * RSS Sanity — Apply Now cross-system checks (URP-T85 – URP-T90, URP-T221 – URP-T223)
 * Zephyr: /RSS Sanity Suite/Apply Now/Others components
 * Source: Rss Apply Now Test cases.xlsx
 *
 * These cases require FIS Enterprise or post-submit verification outside the RSS portal UI.
 * Marked fixme until FIS automation or RSS Loans document verification is wired.
 */

import { test } from "../../../../fixtures/rssPortalTest";

test.describe("RSS Portal — Apply Now cross-system @rss @sanity", () => {
  test.fixme(
    "URP-T85 - Apply Now - Notes for New Co-Borrower added in FIS Enterprise",
    async () => {
      test.setTimeout(900_000);
    },
  );

  test.fixme(
    "URP-T86 - Apply Now - Notes for New Guarantor added in FIS Enterprise",
    async () => {
      test.setTimeout(900_000);
    },
  );

  test.fixme(
    "URP-T87 - Apply Now - Contract Submission Task in FIS Enterprise",
    async () => {
      test.setTimeout(900_000);
    },
  );

  test.fixme(
    "URP-T88 - Apply Now - Documents Upload visible on Loans tab after submit",
    async () => {
      test.setTimeout(900_000);
    },
  );

  test.fixme(
    "URP-T89 - Apply Now - AplyId verification mode on FIS Enterprise party",
    async () => {
      test.setTimeout(900_000);
    },
  );

  test.fixme(
    "URP-T90 - Apply Now - Email notification DPR note for Purchase through a Dealership",
    async () => {
      test.setTimeout(900_000);
    },
  );

  test.fixme(
    "URP-T221 - Apply Now - Check for Existing Guarantor Details update",
    async () => {
      test.setTimeout(900_000);
    },
  );

  test.fixme(
    "URP-T222 - Apply Now - Check if Borrower details are updating after submit",
    async () => {
      test.setTimeout(900_000);
    },
  );

  test.fixme(
    "URP-T223 - Apply Now - Check if Limited Company details are updating",
    async () => {
      test.setTimeout(900_000);
    },
  );
});
