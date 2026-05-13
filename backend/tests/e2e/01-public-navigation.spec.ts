import { expect, test } from "@playwright/test";
import { acceptNextDialog, gotoAndWaitForHydration } from "./test-utils";

test("anonymous navigation + browse modal buttons", async ({ page }) => {
  await gotoAndWaitForHydration(page, "/");
  await page.getByRole("button", { name: "Browse" }).click();
  await expect(page).toHaveURL(/\/browse$/);

  await page.getByPlaceholder("Search by project, research area, owner, or institution...").fill("AI Safety");
  await page.getByRole("button", { name: "Search" }).click();
  await expect(page.getByText(/AI Safety/i)).toBeVisible();

  await page.getByRole("button", { name: "Seats Available" }).click();
  await page.getByRole("button", { name: "Seats Available" }).click();

  const viewDetails = page.getByRole("button", { name: "View details" }).first();
  await viewDetails.scrollIntoViewIfNeeded();
  await viewDetails.click();

  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible();
  await dialog.getByRole("button", { name: "Close" }).click();
  await expect(dialog).toBeHidden();

  const applyButton = page.getByRole("button", { name: /^Apply$/ }).first();
  await applyButton.scrollIntoViewIfNeeded();
  await acceptNextDialog(page);
  await applyButton.click();
  await expect(page).toHaveURL(/\/login\?next=%2Fbrowse$/);
});
