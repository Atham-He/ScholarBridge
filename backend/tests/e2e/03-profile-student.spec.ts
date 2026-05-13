import { expect, test } from "@playwright/test";
import { createMinimalPdfBuffer, demoAccounts, login } from "./test-utils";

test("student profile buttons: save basic info, upload resume, saved/applications actions", async ({ page }) => {
  await page.addInitScript(() => {
    window.confirm = () => true;
  });

  await login(page, demoAccounts.alex.email, demoAccounts.alex.password, "/profile");
  await expect(page).toHaveURL(/\/profile$/);

  await page.getByRole("button", { name: /基本信息/ }).click();
  const nameInput = page.locator('label:has-text("姓名") + input');
  await nameInput.fill("Alex Wang (E2E)");

  const [saveDialog] = await Promise.all([
    page.waitForEvent("dialog"),
    page.getByRole("button", { name: "保存更改" }).click(),
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
    page.getByRole("button", { name: "上传简历" }).click(),
  ]);
  await uploadDialog.accept();

  await page.getByRole("button", { name: /我的收藏/ }).click();
  const savedItem = page.locator('button:has(h4)').first();
  await savedItem.click();
  const savedDialog = page.getByRole("dialog");
  await expect(savedDialog).toBeVisible();
  await savedDialog.getByRole("button", { name: "Close project details" }).click();

  await page.getByRole("button", { name: /我的申请/ }).click();
  const withdrawButton = page.locator("button", { hasText: "撤回申请" }).first();
  if (await withdrawButton.isVisible().catch(() => false)) {
    await withdrawButton.click();
    await expect(page.locator("button", { hasText: "撤回申请" })).toHaveCount(0);
  }
});
