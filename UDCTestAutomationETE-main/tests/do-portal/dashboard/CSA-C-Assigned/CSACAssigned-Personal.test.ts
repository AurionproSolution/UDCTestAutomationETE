import { test } from "@playwright/test";

test("test", async ({ page }) => {
  // login page
  await page.goto(
    "https://aurpr-ia.assetfinance.myfis.cloud/IAUDCPortal/authentication/login",
  );
  await page.getByRole("button", { name: "Login with FIS" }).click();
  await page.getByRole("searchbox", { name: "Username" }).click();
  await page.getByRole("searchbox", { name: "Username" }).fill("pramod.more");
  await page.getByRole("searchbox", { name: "Username" }).press("Enter");
  await page.getByRole("button", { name: "Proceed" }).click();
  await page.getByRole("textbox", { name: "Password" }).click();
  await page.getByRole("textbox", { name: "Password" }).fill("Sanvi@123456");
  await page
    .getByRole("radio", { name: "Yes, this is my computer or" })
    .check();
  await page.getByRole("button", { name: "Sign in" }).click();
  await page.waitForTimeout(15000);
  // start page
  // await page.getByRole('link', { name: 'Quotes & Applications Quotes' }).click();
  // Dashboard Page
  await page.getByRole("button", { name: " + Create Standard Quote" }).click();
  await page
    .getByRole("dialog")
    .locator("div")
    .filter({ hasText: "Credit Sale Agreement Assured" })
    .click();
  //
  // await page.getByText('Credit Sale Agreement').click();
  //wait page.locator('#pn_id_387').getByRole('button', { name: 'dropdown trigger' }).click();
  await page.getByRole("link").nth(1).click();
  await page.getByRole("button", { name: " + Create Standard Quote" }).click();
  await page.waitForTimeout(10000);
  await page.getByRole("link", { name: "Credit Sale Agreement" }).click();
  await page.reload();
  await page.reload();
  await page
    .locator(
      `//span//label[contains(text(), 'Product')]/following-sibling::div//span`,
    )
    .click();
  await page.getByRole("option", { name: "CSA-C-Assigned" }).click();
  await page
    .locator(
      `//span//label[contains(text(), 'Program')]/following-sibling::div//span`,
    )
    .click();
  await page.getByText("CSA Personal - MV Dealer").click();
  await page
    .locator("text")
    .filter({ hasText: "Originator Reference" })
    .locator("#text")
    .click();
  await page
    .locator("text")
    .filter({ hasText: "Originator Reference" })
    .locator("#text")
    .fill("test");
  await page.locator('input[name="assetTypeDD"]').click();
  await page.getByRole("searchbox").click();
  await page.getByRole("searchbox").fill("car");
  await page.getByText("Car and Light Commercial /").click();
  await page.locator(`//div//span[contains(text(), 'Used')]`).click();
  await page.getByRole("option", { name: "Used" }).click();
  await page
    .getByRole("button", { name: "Asset, Insurance & Trade-in" })
    .click();
  await page.locator(".cursor-pointer.fa-pen-to-square").click();
  await page
    .getByRole("textbox", { name: "Asset Value* Sum Insured Net" })
    .click();
  await page
    .getByRole("textbox", { name: "Asset Value* Sum Insured Net" })
    .click();
  //await page.getByRole('textbox', { name: 'Asset Value* Sum Insured Net' }).press('ArrowRight');
  await page
    .getByRole("textbox", { name: "Asset Value* Sum Insured Net" })
    .fill("");
  const asset = page.getByRole("textbox", {
    name: "Asset Value* Sum Insured Net",
  });
  await asset.click();
  await asset.press("Control+A");
  await asset.press("Delete");
  // Type digits only
  await page.keyboard.insertText("100000");
  //  await page.getByRole('textbox', { name: 'Asset Value* Sum Insured Net' }).asset.press('Control+A');

  await page
    .locator("text")
    .filter({ hasText: "Make" })
    .locator("#text")
    .click();
  await page
    .locator("text")
    .filter({ hasText: "Make" })
    .locator("#text")
    .fill("a");
  await page
    .locator("text")
    .filter({ hasText: "Model" })
    .locator("#text")
    .click();
  await page
    .locator("text")
    .filter({ hasText: "Model" })
    .locator("#text")
    .fill("a");
  await page
    .locator("text")
    .filter({ hasText: "Variant" })
    .locator("#text")
    .click();
  await page
    .locator("text")
    .filter({ hasText: "Variant" })
    .locator("#text")
    .fill("a");
  await page
    .locator("text")
    .filter({ hasText: "Rego No." })
    .locator("#text")
    .click();
  await page
    .locator("text")
    .filter({ hasText: "Rego No." })
    .locator("#text")
    .fill("a");
  await page.getByRole("button", { name: "Submit" }).click();
  await page.getByRole("button", { name: "Close" }).click();
  await page
    .locator("percentage")
    .filter({ hasText: "Interest Rate" })
    .locator("#percent")
    .click();
  await page
    .locator("percentage")
    .filter({ hasText: "Interest Rate" })
    .locator("#percent")
    .press("ArrowRight");
  await page
    .locator("percentage")
    .filter({ hasText: "Interest Rate" })
    .locator("#percent")
    .fill("5");

  await page
    .locator("date")
    .filter({ hasText: "First Payment" })
    .getByLabel("Choose Date")
    .click();
  await page.getByText("30", { exact: true }).click();
  await page.getByRole("button", { name: "Calculate" }).click();
  await page.getByRole("button", { name: "Next" }).click();
  // await page.goto('https://testportaludc.aurionpro.com/dealer/standard-quote/create/5161');
  // await page.locator('.table-row').waitFor({ state: 'visible', timeout: 30000 });
  await page.waitForTimeout(20000);
  await page
    .getByRole("button", { name: " Add Borrowers / Guarantors" })
    .click();
  await page
    .locator("text")
    .filter({ hasText: "First Name" })
    .locator("#text")
    .click();
  await page
    .locator("text")
    .filter({ hasText: "First Name" })
    .locator("#text")
    .fill("REA");
  await page
    .locator("text")
    .filter({ hasText: "Last Name" })
    .locator("#text")
    .click();
  await page
    .locator("text")
    .filter({ hasText: "Last Name" })
    .locator("#text")
    .fill("Mote");
  await page.getByRole("button", { name: "Choose Date" }).click();
  await page.getByRole("gridcell", { name: "10" }).click();
  await page.getByRole("button", { name: "Search" }).click();
  await page.getByRole("button", { name: " Add New Customer" }).click();
  await page
    .locator(
      `//span//label[contains(text(), 'Title')]/following-sibling::div//span`,
    )
    .click();
  await page.getByRole("option", { name: "Mr", exact: true }).click();
  await page
    .locator(
      `//span//label[contains(text(), 'Gender')]/following-sibling::div//span`,
    )
    .click();
  await page.getByRole("option", { name: "Male", exact: true }).click();
  await page
    .locator(
      `//span//label[contains(text(), 'Marital Status')]/following-sibling::div//span`,
    )
    .click();
  await page.getByRole("option", { name: "Married", exact: true }).click();
  await page
    .locator(
      `//span//label[contains(text(), 'No. of Dependants')]/following-sibling::div//span`,
    )
    .click();
  await page.getByRole("option", { name: "0" }).click();
  await page.locator("#pn_id_1121 > .p-dropdown-trigger").click();
  await page.getByText("+61").click();
  await page.getByRole("textbox", { name: "Area code" }).click();
  await page.getByRole("textbox", { name: "Area code" }).fill("12");
  await page.getByRole("textbox", { name: "Phone number" }).click();
  await page.getByRole("textbox", { name: "Phone number" }).fill("123456");
  await page
    .locator('app-personal-detail-email-contact input[type="text"]')
    .click();
  await page
    .locator('app-personal-detail-email-contact input[type="text"]')
    .fill("test@gmail.com");
  await page.locator("#pn_id_1124 > .p-dropdown-trigger").click();
  await page.getByRole("option", { name: "None" }).click();
  await page.locator("#pn_id_1130 > .p-dropdown-trigger").click();
  await page.getByRole("option", { name: "Yes" }).click();
  await page.locator("#pn_id_1132 > .p-dropdown-trigger").click();
  await page.getByRole("option", { name: "New Zealand" }).click();
  await page.locator("#pn_id_1134 > .p-dropdown-trigger").click();
  await page.getByRole("option", { name: "New Zealand" }).click();
  await page.getByRole("button", { name: "Next" }).click();
  await page.locator('input[name="physicalSearchValue"]').click();
  await page.locator('input[name="physicalSearchValue"]').fill("auckland");
  await page.locator('input[name="physicalSearchValue"]').click();
  await page.locator('input[name="physicalSearchValue"]').fill("auck");
  await page.locator('input[name="physicalSearchValue"]').click();
  await page.locator('input[name="physicalSearchValue"]').press("Enter");
  await page
    .getByRole("option", { name: "1 Auckland Road, St Heliers," })
    .click();
  await page
    .locator("#pn_id_1149")
    .getByRole("button", { name: "dropdown trigger" })
    .click();
  await page.getByRole("option", { name: "Boarding" }).click();
  await page
    .locator("number")
    .filter({ hasText: "Time at Address" })
    .getByRole("spinbutton")
    .click();
  await page.locator(".col.mt-3").first().click();
  await page
    .getByRole("textbox", { name: "Building Name Floor Number" })
    .click();
  await page
    .getByRole("textbox", { name: "Building Name Floor Number" })
    .fill("a");
  await page
    .locator("#pn_id_1155")
    .getByRole("button", { name: "dropdown trigger" })
    .click();
  await page.getByRole("option", { name: "Floor" }).click();
  await page.locator("#text").nth(1).click();
  await page.locator("#text").nth(1).fill("1");
  await page
    .locator("#pn_id_1159")
    .getByRole("button", { name: "dropdown trigger" })
    .click();
  await page.getByText("Apartment").click();
  await page.locator('input[name="previousSearchValue"]').click();
  await page.locator('input[name="previousSearchValue"]').fill("auck");
  await page.getByText("2 Auckland Road, St Heliers,").click();
  await page.getByRole("spinbutton").nth(2).click();
  await page.getByRole("spinbutton").nth(3).click();
  await page.getByRole("spinbutton").nth(2).click();
  await page.getByRole("spinbutton").nth(2).press("ArrowRight");
  await page.getByRole("spinbutton").nth(2).press("ArrowRight");
  await page.getByRole("spinbutton").nth(3).click();
  await page.locator('input[name="postalSearchValue"]').click();
  await page.locator('input[name="postalSearchValue"]').fill("auck");
  await page.getByText("3 Auckland Road, St Heliers,").click();
  await page.getByRole("button", { name: "Next" }).click();
  await page.getByRole("textbox", { name: "Employer Name* Time with" }).click();
  await page
    .getByRole("textbox", { name: "Employer Name* Time with" })
    .fill("REWQ");
  await page
    .locator("#pn_id_1244")
    .getByRole("button", { name: "dropdown trigger" })
    .click();
  await page.getByRole("option", { name: "Accountant" }).click();
  await page
    .locator("#pn_id_1247")
    .getByRole("button", { name: "dropdown trigger" })
    .click();
  await page.getByText("Casually employed").click();
  await page
    .locator("text")
    .filter({ hasText: "Time with Current Employer" })
    .locator("#text")
    .click();
  await page
    .locator("text")
    .filter({ hasText: "Time with Current Employer" })
    .locator("#text")
    .fill("1");
  await page.locator("#text").nth(2).click();
  await page.locator("#text").nth(2).fill("1");
  await page.locator("#text").nth(3).click();
  await page.locator("#text").nth(3).fill("RQEQ");
  await page
    .locator("#pn_id_1253")
    .getByRole("button", { name: "dropdown trigger" })
    .click();
  await page.getByText("Time with Previous employer").click();
  await page
    .locator("text")
    .filter({ hasText: "Time with Previous employer" })
    .locator("#text")
    .click();
  await page
    .locator("text")
    .filter({ hasText: "Time with Previous employer" })
    .locator("#text")
    .fill("11");
  await page.locator("#text").nth(5).click();
  await page
    .locator("text")
    .filter({ hasText: "Time with Previous employer" })
    .locator("#text")
    .click();
  await page
    .locator("text")
    .filter({ hasText: "Time with Previous employer" })
    .locator("#text")
    .fill("1");
  await page.locator("#text").nth(5).click();
  await page.locator("#text").nth(5).click();
  await page.locator("#text").nth(5).fill("1");
  await page.getByRole("button", { name: "Next" }).click();
  await page.locator("#amount").nth(5).click();
  await page.locator("#amount").nth(5).click();
  await page.locator("#amount").nth(5).press("ArrowRight");
  await page.locator(".p-radiobutton-box").first().click();
  await page.locator("textarea").click();
  await page.locator("textarea").fill("NA");
  await page
    .locator(
      ".regular-recurring-details-form > .grid > div:nth-child(2) > amount > .p-field > p-floatlabel > .p-float-label > #amount",
    )
    .click();
  await page
    .locator(
      ".regular-recurring-details-form > .grid > div:nth-child(2) > amount > .p-field > p-floatlabel > .p-float-label > #amount",
    )
    .click();
  await page
    .locator(
      ".regular-recurring-details-form > .grid > div:nth-child(2) > amount > .p-field > p-floatlabel > .p-float-label > #amount",
    )
    .press("ArrowRight");
  await page.getByRole("button", { name: "Next" }).click();
  await page.locator(".p-checkbox-box").click();
  await page.getByText("Address Details").click();
  await page.getByText("Employment Details").click();
  await page
    .locator("#pn_id_1398")
    .getByRole("button", { name: "dropdown trigger" })
    .click();
  await page.getByRole("option", { name: "Accountant" }).click();
  await page
    .locator("#pn_id_1401")
    .getByRole("button", { name: "dropdown trigger" })
    .click();
  await page.getByText("Full time employed").click();
  await page.getByRole("button", { name: "Next" }).click();
  await page
    .locator(
      ".ng-pristine.ng-invalid > .p-field > p-floatlabel > .p-float-label > #amount",
    )
    .click();
  await page.getByRole("button", { name: "Next" }).click();
  await page.getByText("Address Details").click();
  await page
    .locator(
      ".p-element.valueClass.ng-untouched.ng-pristine.ng-invalid > .p-inputswitch > .p-inputswitch-slider",
    )
    .click();
  await page
    .locator(
      ".p-inputswitch.p-component.p-inputswitch-checked > .p-inputswitch-slider",
    )
    .click();
  await page.locator('input[name="previousSearchValue"]').click();
  await page.locator('input[name="previousSearchValue"]').fill("auck");
  await page
    .getByRole("option", { name: "2 Auckland Road, St Heliers," })
    .click();
  await page.getByRole("button", { name: "Next" }).click();
  await page.getByText("Reference Details").click();
  await page.locator(".p-checkbox-box").click();
  await page.getByRole("button", { name: "Submit" }).click();
  await page.goto(
    "https://testportaludc.aurionpro.com/dealer/standard-quote/edit/5161",
  );
  await page.locator('input[name="workFlowStatus"]').click();
  await page.getByText("Submit").click();
  await page.getByRole("button", { name: "Next" }).click();
});
