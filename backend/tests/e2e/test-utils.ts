import { expect, type Page } from "@playwright/test";

export const demoAccounts = {
  alex: { email: "alex@demo.local", password: "demo123" },
  priya: { email: "priya@demo.local", password: "demo123" },
  chen: { email: "chen@demo.local", password: "demo123" },
};

export async function acceptNextDialog(page: Page) {
  page.once("dialog", async (dialog) => {
    await dialog.accept();
  });
}

export async function gotoAndWaitForHydration(page: Page, path: string) {
  await page.goto(path);
  await page.waitForLoadState("domcontentloaded");
}

export async function login(page: Page, email: string, password: string, next: string = "/browse") {
  await gotoAndWaitForHydration(page, `/login?next=${encodeURIComponent(next)}`);
  await page.getByPlaceholder("your@email.com").fill(email);
  await page.getByPlaceholder("请输入密码").fill(password);
  await page.getByRole("button", { name: "登录" }).click();
  await expect(page).toHaveURL(new RegExp(`${escapeRegExp(next)}$`));
}

export async function signOutIfVisible(page: Page) {
  const signOutButton = page.getByRole("button", { name: /^Sign Out$/ });
  if (await signOutButton.isVisible().catch(() => false)) {
    await signOutButton.click();
    await expect(page).toHaveURL(/\/$/);
  }
}

export function createMinimalPdfBuffer(text: string) {
  const sanitized = text.replace(/[()\\]/g, "");
  const header = "%PDF-1.4\n";
  const body = `BT /F1 18 Tf 60 700 Td (${sanitized}) Tj ET\n`;
  const bodyLength = Buffer.byteLength(body, "utf8");

  const objects = [
    "1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n",
    "2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n",
    "3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 5 0 R >> >> /Contents 4 0 R >>\nendobj\n",
    `4 0 obj\n<< /Length ${bodyLength} >>\nstream\n${body}endstream\nendobj\n`,
    "5 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\nendobj\n",
  ];

  const offsets: number[] = [];
  let offset = Buffer.byteLength(header, "utf8");
  for (const obj of objects) {
    offsets.push(offset);
    offset += Buffer.byteLength(obj, "utf8");
  }

  const xrefOffset = offset;
  const xrefEntries = offsets.map((value) => `${String(value).padStart(10, "0")} 00000 n \n`).join("");
  const xref = `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n${xrefEntries}`;
  const trailer = `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF\n`;

  return Buffer.from(header + objects.join("") + xref + trailer, "utf8");
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
