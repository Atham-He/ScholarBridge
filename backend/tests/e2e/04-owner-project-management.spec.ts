import { expect, test } from "@playwright/test";
import { createMinimalPdfBuffer, demoAccounts, login, signOutIfVisible } from "./test-utils";

test("owner project management + application full state buttons", async ({ page }) => {
  const projectTitle = `E2E Project ${Date.now()}`;

  await page.addInitScript(() => {
    window.prompt = () => "E2E feedback";
  });

  await login(page, demoAccounts.priya.email, demoAccounts.priya.password, "/profile");
  await page.getByRole("button", { name: /My projects/ }).click();

  await page.getByRole("button", { name: "New project" }).click();
  await page.locator('label:has-text("Project title") input').fill(projectTitle);
  await page.locator('label:has-text("Research area") input').fill("E2E");
  await page.locator('label:has-text("Start time") input').fill("2026-10");
  await page.locator('label:has-text("End time") input').fill("2027-03");
  await page.locator('label:has-text("Location") input').fill("Remote");
  await page.locator('label:has-text("Capacity") input').fill("2");
  await page.locator('label:has-text("Project description") textarea').fill("E2E description");
  await page.locator('label:has-text("Application requirements") textarea').fill("E2E requirements");
  await page.getByRole("button", { name: "Publish project", exact: true }).click();

  const createdProjectCard = page.locator("article", { hasText: projectTitle });
  await expect(createdProjectCard).toBeVisible();

  await page.getByRole("button", { name: /^Sign Out$/ }).click();
  await expect(page).toHaveURL(/\/$/);

  await login(page, demoAccounts.alex.email, demoAccounts.alex.password, "/profile");
  await page.getByRole("button", { name: /Basic information/ }).click();
  const fileInput = page.locator('input[type="file"][accept="application/pdf,.pdf"]');
  await fileInput.setInputFiles({
    name: "resume-owner-flow.pdf",
    mimeType: "application/pdf",
    buffer: createMinimalPdfBuffer(`Resume for ${projectTitle}`),
  });

  page.once("dialog", async (dialog) => {
    await dialog.accept();
  });
  await page.getByRole("button", { name: "Upload resume" }).click();

  await page.getByRole("button", { name: /^Browse$/ }).click();
  await expect(page).toHaveURL(/\/browse$/);
  await page.getByPlaceholder("Search by project, research area, owner, or institution...").fill(projectTitle);
  await page.getByRole("button", { name: "Search" }).click();

  const projectCard = page.locator("article", { hasText: projectTitle });
  await expect(projectCard).toBeVisible();
  await projectCard.getByRole("button", { name: /^Apply$/ }).click();
  await expect(projectCard.getByRole("button", { name: /Cancel apply|Accepted|Rejected|Applying\.\.\./ })).toBeVisible();

  await signOutIfVisible(page);

  await login(page, demoAccounts.priya.email, demoAccounts.priya.password, "/profile");
  await page.getByRole("button", { name: /My projects/ }).click();

  const ownerProjectCard = page.locator("article", { hasText: projectTitle });
  await expect(ownerProjectCard).toBeVisible();
  await ownerProjectCard.getByRole("button", { name: "View applications" }).click();

  const applicationsModal = page.locator("section").filter({ hasText: "Applications" }).first();
  await expect(applicationsModal).toBeVisible();

  const applicantArticle = applicationsModal.locator("article", { hasText: "Alex" }).first();
  await expect(applicantArticle).toBeVisible();

  const openResumeButton = applicantArticle.getByRole("button", { name: /View resume|Resume not uploaded/ });
  if (await openResumeButton.isEnabled().catch(() => false)) {
    const [popup] = await Promise.all([
      page.waitForEvent("popup"),
      openResumeButton.click(),
    ]);
    await popup.waitForTimeout(500);
    await popup.close();
  }

  const scoreButton = applicantArticle.getByRole("button", { name: /^Run AI score$/ });
  if (await scoreButton.isEnabled().catch(() => false)) {
    await scoreButton.click();
    await expect(applicantArticle.getByText(/Overall score|Local heuristic score|Not scored yet|has not uploaded|Scored at/)).toBeVisible();
  }

  await applicantArticle.getByRole("button", { name: "View applicant details" }).click();
  const applicantModal = page.locator("section").filter({ hasText: "Applicant profile" }).first();
  await expect(applicantModal).toBeVisible();

  const [acceptResponse] = await Promise.all([
    page.waitForResponse((res) => res.url().includes("/api/applications/") && res.request().method() === "PATCH"),
    applicantModal.getByRole("button", { name: "Accept application" }).click(),
  ]);
  expect(acceptResponse.ok()).toBeTruthy();
  const undoAcceptButton = applicantModal.getByRole("button", { name: "Undo accept" }).first();
  await expect(undoAcceptButton).toBeVisible();
  await expect(undoAcceptButton).toBeEnabled();
  const [undoAcceptResponse] = await Promise.all([
    page.waitForResponse((res) => res.url().includes("/api/applications/") && res.request().method() === "PATCH"),
    undoAcceptButton.evaluate((element) => (element as HTMLButtonElement).click()),
  ]);
  expect(undoAcceptResponse.ok()).toBeTruthy();
  await expect(applicantModal.getByRole("button", { name: "Accept application" })).toBeVisible({ timeout: 30_000 });

  const [rejectResponse] = await Promise.all([
    page.waitForResponse((res) => res.url().includes("/api/applications/") && res.request().method() === "PATCH"),
    applicantModal.getByRole("button", { name: "Reject application" }).click(),
  ]);
  expect(rejectResponse.ok()).toBeTruthy();
  const undoRejectButton = applicantModal.getByRole("button", { name: "Undo reject" }).first();
  await expect(undoRejectButton).toBeVisible();
  await expect(undoRejectButton).toBeEnabled();
  const [undoRejectResponse] = await Promise.all([
    page.waitForResponse((res) => res.url().includes("/api/applications/") && res.request().method() === "PATCH"),
    undoRejectButton.evaluate((element) => (element as HTMLButtonElement).click()),
  ]);
  expect(undoRejectResponse.ok()).toBeTruthy();
  await expect(applicantModal.getByRole("button", { name: "Reject application" })).toBeVisible({ timeout: 30_000 });

  const [acceptResponse2] = await Promise.all([
    page.waitForResponse((res) => res.url().includes("/api/applications/") && res.request().method() === "PATCH"),
    applicantModal.getByRole("button", { name: "Accept application" }).click(),
  ]);
  expect(acceptResponse2.ok()).toBeTruthy();
  const feedbackButton = applicantModal.getByRole("button", { name: /Add feedback|Edit feedback/ }).first();
  await expect(feedbackButton).toBeVisible();
  await expect(feedbackButton).toBeEnabled();
  const [feedbackResponse] = await Promise.all([
    page.waitForResponse((res) => res.url().includes("/api/applications/") && res.request().method() === "PATCH"),
    feedbackButton.evaluate((element) => (element as HTMLButtonElement).click()),
  ]);
  expect(feedbackResponse.ok()).toBeTruthy();

  const viewResumeContentButton = applicantModal.getByRole("button", { name: "View resume contents" });
  const [popup2] = await Promise.all([page.waitForEvent("popup"), viewResumeContentButton.click()]);
  await popup2.waitForTimeout(500);
  await popup2.close();

  await applicantModal.getByRole("button", { name: "Close" }).first().evaluate((element) => (element as HTMLButtonElement).click());
  await expect(applicantModal).toBeHidden();

  const applicationsCloseButton = applicationsModal.locator('button:has-text("Close")').first();
  if (await applicationsCloseButton.isVisible().catch(() => false)) {
    await applicationsCloseButton.evaluate((element) => (element as HTMLButtonElement).click());
  } else {
    await page.mouse.click(5, 5);
  }
  await expect(applicationsModal).toBeHidden();

  await ownerProjectCard.getByRole("button", { name: "Close" }).click();
  await expect(ownerProjectCard.getByText("Closed")).toBeVisible();
  await ownerProjectCard.getByRole("button", { name: "Reopen" }).click();
  await expect(ownerProjectCard.getByText("Open")).toBeVisible();

  page.once("dialog", async (dialog) => {
    await dialog.accept();
  });
  await ownerProjectCard.getByRole("button", { name: "Delete" }).click();
  await expect(ownerProjectCard).toBeHidden();
});
