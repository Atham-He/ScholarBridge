import { expect, test } from "@playwright/test";
import { demoAccounts, login } from "./test-utils";

test.describe("Interest Selector", () => {
  test.beforeEach(async ({ page }) => {
    // Log in first as interest selector only shows when logged in
    await login(page, demoAccounts.alex.email, demoAccounts.alex.password, "/browse");
  });

  test("should display research categories and allow selecting topics", async ({ page }) => {
    // Check for section title
    await expect(page.getByText("探索研究方向")).toBeVisible();

    // Check for specific academic category
    await expect(page.getByText("前沿计算与人工智能")).toBeVisible();
    await expect(page.getByText("生命科学与医学")).toBeVisible();

    // Click a predefined topic
    const topicLabel = "建立月球基地";
    await page.getByText(topicLabel, { exact: true }).click();

    // Verify it appears in the selected list
    const selectedArea = page.locator("text=已选方向：").locator("..");
    await expect(selectedArea).toBeVisible();
    await expect(selectedArea.getByText(topicLabel)).toBeVisible();

    // Add a custom keyword
    const input = page.getByPlaceholder("例如：人工智能、建立月球基地、量子计算...");
    await input.fill("深度强化学习");
    await input.press("Enter");

    // Verify custom keyword appears
    await expect(selectedArea.getByText("深度强化学习")).toBeVisible();

    // Add another custom keyword via button
    await input.fill("空间智能");
    await page.getByRole("button", { name: "+ 添加" }).click();
    await expect(selectedArea.getByText("空间智能")).toBeVisible();

    // Remove the predefined topic
    await page.getByRole('button', { name: `Remove ${topicLabel}` }).click();

    // Verify it was removed
    await expect(selectedArea.getByText(topicLabel)).not.toBeVisible();
    
    // Custom keywords should still be there
    await expect(selectedArea.getByText("深度强化学习")).toBeVisible();
    await expect(selectedArea.getByText("空间智能")).toBeVisible();
  });
});