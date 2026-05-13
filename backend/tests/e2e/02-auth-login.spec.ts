import { expect, test } from "@playwright/test";
import { demoAccounts, login } from "./test-utils";

test("login redirects to next", async ({ page }) => {
  await login(page, demoAccounts.alex.email, demoAccounts.alex.password, "/browse");
  await expect(page.getByRole("button", { name: /^Sign Out$/ })).toBeVisible();
});
