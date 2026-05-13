import { expect, test } from "@playwright/test";
import { createMinimalPdfBuffer, demoAccounts, login, signOutIfVisible } from "./test-utils";

test("owner project management + application full state buttons", async ({ page }) => {
  const projectTitle = `E2E Project ${Date.now()}`;

  await page.addInitScript(() => {
    window.prompt = () => "E2E feedback";
  });

  await login(page, demoAccounts.priya.email, demoAccounts.priya.password, "/profile");
  await page.getByRole("button", { name: /我的项目/ }).click();

  await page.getByRole("button", { name: "新建项目" }).click();
  await page.locator('label:has-text("项目标题") input').fill(projectTitle);
  await page.locator('label:has-text("研究方向") input').fill("E2E");
  await page.locator('label:has-text("开始时间") input').fill("2026-10");
  await page.locator('label:has-text("结束时间") input').fill("2027-03");
  await page.locator('label:has-text("地点") input').fill("Remote");
  await page.locator('label:has-text("名额") input').fill("2");
  await page.locator('label:has-text("项目描述") textarea').fill("E2E description");
  await page.locator('label:has-text("申请要求") textarea').fill("E2E requirements");
  await page.getByRole("button", { name: "发布项目", exact: true }).click();

  const createdProjectCard = page.locator("article", { hasText: projectTitle });
  await expect(createdProjectCard).toBeVisible();

  await page.getByRole("button", { name: /^Sign Out$/ }).click();
  await expect(page).toHaveURL(/\/$/);

  await login(page, demoAccounts.alex.email, demoAccounts.alex.password, "/profile");
  await page.getByRole("button", { name: /基本信息/ }).click();
  const fileInput = page.locator('input[type="file"][accept="application/pdf,.pdf"]');
  await fileInput.setInputFiles({
    name: "resume-owner-flow.pdf",
    mimeType: "application/pdf",
    buffer: createMinimalPdfBuffer(`Resume for ${projectTitle}`),
  });

  page.once("dialog", async (dialog) => {
    await dialog.accept();
  });
  await page.getByRole("button", { name: "上传简历" }).click();

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
  await page.getByRole("button", { name: /我的项目/ }).click();

  const ownerProjectCard = page.locator("article", { hasText: projectTitle });
  await expect(ownerProjectCard).toBeVisible();
  await ownerProjectCard.getByRole("button", { name: "查看申请" }).click();

  const applicationsModal = page.locator("section").filter({ hasText: "Applications" }).first();
  await expect(applicationsModal).toBeVisible();

  const applicantArticle = applicationsModal.locator("article", { hasText: "Alex" }).first();
  await expect(applicantArticle).toBeVisible();

  const openResumeButton = applicantArticle.getByRole("button", { name: /查看简历|未上传简历/ });
  if (await openResumeButton.isEnabled().catch(() => false)) {
    const [popup] = await Promise.all([
      page.waitForEvent("popup"),
      openResumeButton.click(),
    ]);
    await popup.waitForTimeout(500);
    await popup.close();
  }

  const scoreButton = applicantArticle.getByRole("button", { name: /^AI 评分$/ });
  if (await scoreButton.isEnabled().catch(() => false)) {
    await scoreButton.click();
    await expect(applicantArticle.getByText(/总分|本地启发式评分|尚未评分|申请者尚未上传|评分时间/)).toBeVisible();
  }

  await applicantArticle.getByRole("button", { name: "查看申请者详情" }).click();
  const applicantModal = page.locator("section").filter({ hasText: "Applicant profile" }).first();
  await expect(applicantModal).toBeVisible();

  const [acceptResponse] = await Promise.all([
    page.waitForResponse((res) => res.url().includes("/api/applications/") && res.request().method() === "PATCH"),
    applicantModal.getByRole("button", { name: "同意申请" }).click(),
  ]);
  expect(acceptResponse.ok()).toBeTruthy();
  const undoAcceptButton = applicantModal.getByRole("button", { name: "撤销同意" }).first();
  await expect(undoAcceptButton).toBeVisible();
  await expect(undoAcceptButton).toBeEnabled();
  const [undoAcceptResponse] = await Promise.all([
    page.waitForResponse((res) => res.url().includes("/api/applications/") && res.request().method() === "PATCH"),
    undoAcceptButton.evaluate((element) => (element as HTMLButtonElement).click()),
  ]);
  expect(undoAcceptResponse.ok()).toBeTruthy();
  await expect(applicantModal.getByRole("button", { name: "同意申请" })).toBeVisible({ timeout: 30_000 });

  const [rejectResponse] = await Promise.all([
    page.waitForResponse((res) => res.url().includes("/api/applications/") && res.request().method() === "PATCH"),
    applicantModal.getByRole("button", { name: "拒绝申请" }).click(),
  ]);
  expect(rejectResponse.ok()).toBeTruthy();
  const undoRejectButton = applicantModal.getByRole("button", { name: "撤销拒绝" }).first();
  await expect(undoRejectButton).toBeVisible();
  await expect(undoRejectButton).toBeEnabled();
  const [undoRejectResponse] = await Promise.all([
    page.waitForResponse((res) => res.url().includes("/api/applications/") && res.request().method() === "PATCH"),
    undoRejectButton.evaluate((element) => (element as HTMLButtonElement).click()),
  ]);
  expect(undoRejectResponse.ok()).toBeTruthy();
  await expect(applicantModal.getByRole("button", { name: "拒绝申请" })).toBeVisible({ timeout: 30_000 });

  const [acceptResponse2] = await Promise.all([
    page.waitForResponse((res) => res.url().includes("/api/applications/") && res.request().method() === "PATCH"),
    applicantModal.getByRole("button", { name: "同意申请" }).click(),
  ]);
  expect(acceptResponse2.ok()).toBeTruthy();
  const feedbackButton = applicantModal.getByRole("button", { name: /填写反馈|编辑反馈/ }).first();
  await expect(feedbackButton).toBeVisible();
  await expect(feedbackButton).toBeEnabled();
  const [feedbackResponse] = await Promise.all([
    page.waitForResponse((res) => res.url().includes("/api/applications/") && res.request().method() === "PATCH"),
    feedbackButton.evaluate((element) => (element as HTMLButtonElement).click()),
  ]);
  expect(feedbackResponse.ok()).toBeTruthy();

  const viewResumeContentButton = applicantModal.getByRole("button", { name: "查看简历内容" });
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

  await ownerProjectCard.getByRole("button", { name: "关闭" }).click();
  await expect(ownerProjectCard.getByText("已关闭")).toBeVisible();
  await ownerProjectCard.getByRole("button", { name: "开启" }).click();
  await expect(ownerProjectCard.getByText("招募中")).toBeVisible();

  page.once("dialog", async (dialog) => {
    await dialog.accept();
  });
  await ownerProjectCard.getByRole("button", { name: "删除" }).click();
  await expect(ownerProjectCard).toBeHidden();
});
