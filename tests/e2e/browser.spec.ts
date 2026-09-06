import { test, expect } from "@playwright/test";
import { randomUUID } from "node:crypto";

test("Thai UI: register factory, create product, produce, release, order, dispatch, collect payment", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  const email = `${randomUUID()}@example.test`;
  const password = `Browser-${randomUUID()}`;
  await page.goto("/");
  await page
    .getByRole("button", { name: "สร้างบัญชีโรงงาน", exact: true })
    .click();
  await page.getByLabel("ชื่อโรงงาน / บริษัท").fill("โรงงานตัวอย่าง EZCON");
  await page
    .getByLabel("ชื่อผู้ใช้งาน", { exact: true })
    .fill("ผู้ทดสอบโรงงาน");
  await page.getByLabel("อีเมล", { exact: true }).fill(email);
  await page.getByLabel(/รหัสผ่านเดโม/).fill(password);
  await page.locator('form button:not([type="button"])').click();
  await expect(
    page.getByRole("heading", { name: "ภาพรวมโรงงาน", exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "สินค้า", exact: true }).click();
  await page.getByRole("button", { name: "เพิ่มสินค้า", exact: true }).click();
  let dialog = page.getByRole("dialog");
  await dialog.getByLabel("รหัสสินค้า (SKU)").fill("E2E-P150");
  await dialog
    .getByLabel("ชื่อสินค้า", { exact: true })
    .fill("เสาเข็มตัวอย่าง I18");
  await dialog.getByLabel("ความยาว (เมตร)").fill("1.5");
  await dialog.getByLabel("ราคาขายต่อหน่วย (บาท)").fill("125");
  await dialog.locator('button:not([type="button"])').click();
  await expect(dialog).not.toBeVisible();
  await expect(page.getByText("E2E-P150", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "การผลิต", exact: true }).click();
  await page
    .getByRole("button", { name: "บันทึกการผลิต", exact: true })
    .click();
  dialog = page.getByRole("dialog");
  await dialog
    .getByRole("combobox", { name: "สินค้า", exact: true })
    .selectOption({ index: 1 });
  await dialog.getByLabel("จำนวน (ต้น)").fill("10");
  await dialog.locator('button:not([type="button"])').click();
  await expect(dialog).not.toBeVisible();
  await page.getByRole("button", { name: "ปล่อยสินค้า", exact: true }).click();
  dialog = page.getByRole("dialog");
  const confirmation = dialog.locator('input[type="checkbox"]');
  if (await confirmation.count()) await confirmation.check();
  await dialog.locator('button:not([type="button"])').click();
  await expect(dialog).not.toBeVisible();
  await page.getByRole("button", { name: "คำสั่งซื้อ", exact: true }).click();
  await page
    .getByRole("button", { name: "สร้างคำสั่งซื้อ", exact: true })
    .click();
  dialog = page.getByRole("dialog");
  await dialog
    .getByRole("combobox", { name: "สินค้า", exact: true })
    .selectOption({ index: 1 });
  await dialog.getByLabel("ชื่อลูกค้า", { exact: true }).fill("ลูกค้าสมมติ");
  await dialog.getByLabel("จำนวน (ต้น)").fill("8");
  await dialog.getByLabel("ราคาขายต่อหน่วย (บาท)").fill("125");
  await dialog.locator('button:not([type="button"])').click();
  await expect(dialog).not.toBeVisible();
  await page.getByRole("button", { name: "บันทึกส่งมอบ", exact: true }).click();
  dialog = page.getByRole("dialog");
  await dialog.locator('input[name="quantity"]').fill("3");
  await dialog.locator('button:not([type="button"])').click();
  await expect(dialog).not.toBeVisible();
  await page.getByRole("button", { name: "รับชำระเงิน", exact: true }).click();
  dialog = page.getByRole("dialog");
  await dialog.locator('input[name="amount"]').fill("100");
  await dialog.locator('button:not([type="button"])').click();
  await expect(dialog).not.toBeVisible();
  await expect(page.getByText("฿275.00", { exact: true })).toBeVisible();
  await page.reload();
  await expect(
    page.getByRole("heading", { name: "ภาพรวมโรงงาน", exact: true }),
  ).toBeVisible();
  await expect(page.getByText("฿275.00", { exact: true })).toBeVisible();
  await page.screenshot({
    path: "test-results/ezcon-desktop.png",
    fullPage: true,
  });
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(
    page.getByRole("heading", { name: "ภาพรวมโรงงาน", exact: true }),
  ).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth + 1,
    ),
  ).toBeTruthy();
  await page.screenshot({
    path: "test-results/ezcon-mobile.png",
    fullPage: true,
  });
  await page.getByRole("button", { name: "ออกจากระบบ", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "ยินดีต้อนรับกลับ" }),
  ).toBeVisible();
  await page.getByLabel("อีเมล", { exact: true }).fill(email);
  await page.getByLabel(/รหัสผ่านเดโม/).fill(password);
  await page.locator('form button:not([type="button"])').click();
  await expect(
    page.getByRole("heading", { name: "ภาพรวมโรงงาน", exact: true }),
  ).toBeVisible();
  expect(errors).toEqual([]);
});

test("owner can explicitly load synthetic demo data from the empty dashboard", async ({
  page,
}) => {
  await page.goto("/");
  await page
    .getByRole("button", { name: "สร้างบัญชีโรงงาน", exact: true })
    .click();
  await page.getByLabel("ชื่อโรงงาน / บริษัท").fill("โรงงานเดโมสมมติ");
  await page.getByLabel("ชื่อผู้ใช้งาน", { exact: true }).fill("Demo owner");
  await page
    .getByLabel("อีเมล", { exact: true })
    .fill(`${randomUUID()}@example.test`);
  await page
    .getByLabel(/รหัสผ่านเดโม/)
    .fill(`Demo-${randomUUID()}`);
  await page.locator('form button:not([type="button"])').click();
  await page
    .getByRole("button", { name: "ทดลองด้วยข้อมูลตัวอย่าง", exact: true })
    .click();
  const dialog = page.getByRole("dialog");
  await dialog.locator('button:not([type="button"])').click();
  await expect(dialog).not.toBeVisible();
  await expect(
    page.getByText("ตัวอย่าง · เสาเข็มไอ 18", { exact: true }).first(),
  ).toBeVisible();
  await expect(
    page.getByText("ตัวอย่าง · ไมโครไพล์ 15", { exact: true }).first(),
  ).toBeVisible();
  await page.reload();
  await expect(
    page.getByText("ตัวอย่าง · ไมโครไพล์ 15", { exact: true }).first(),
  ).toBeVisible();
});
