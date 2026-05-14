import { expect, test } from "@playwright/test";
import { createMinimalPdfBuffer, demoAccounts, login } from "./test-utils";

test("student profile buttons: save basic info, upload resume, saved/applications actions", async ({ page }) => {
  await page.addInitScript(() => {
    window.confirm = () => true;
  });

  await login(page, demoAccounts.alex.email, demoAccounts.alex.password, "/profile");
  await expect(page).toHaveURL(/\/profile$/);

  await page.getByRole("button", { name: /Basic information/ }).click();
  const nameInput = page.locator('label:has-text("Name") + input');
  await nameInput.fill("Alex Wang (E2E)");

  const [saveDialog] = await Promise.all([
    page.waitForEvent("dialog"),
    page.getByRole("button", { name: "Save changes" }).click(),
  ]);
  await saveDialog.accept();
  await expect(nameInput).toHaveValue("Alex Wang (E2E)");

  const fileInput = page.locator('input[type="file"][accept="application/pdf,.pdf"]');
  await fileInput.setInputFiles({
    name: "resume-e2e.pdf",
    mimeType: "application/pdf",
    buffer: createMinimalPdfBuffer("ScholarBridge E2E Resume"),
  });

  const [uploadDialog] = await Promise.all([
    page.waitForEvent("dialog"),
    page.getByRole("button", { name: "Upload resume" }).click(),
  ]);
  await uploadDialog.accept();

  await page.getByRole("button", { name: /Saved projects/ }).click();
  const savedItem = page.locator('button:has(h4)').first();
  await savedItem.click();
  const savedDialog = page.getByRole("dialog");
  await expect(savedDialog).toBeVisible();
  await savedDialog.getByRole("button", { name: "Close project details" }).click();

  await page.getByRole("button", { name: /My applications/ }).click();
  const withdrawButton = page.locator("button", { hasText: "Withdraw application" }).first();
  if (await withdrawButton.isVisible().catch(() => false)) {
    await withdrawButton.click();
    await expect(page.locator("button", { hasText: "Withdraw application" })).toHaveCount(0);
  }
});
