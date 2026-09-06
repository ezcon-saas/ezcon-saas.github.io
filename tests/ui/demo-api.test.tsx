// @vitest-environment jsdom
import { beforeEach, expect, test } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import Page from "../../src/app/page";
import { demoApi, DEMO_STORAGE_KEY } from "../../src/components/demo-api";

beforeEach(() => {
  cleanup();
  localStorage.clear();
});

test("auth screen visibly warns that the static demo has no real authentication", async () => {
  render(<Page />);
  expect((await screen.findAllByText(/STATIC DEMO/))[0]).toBeTruthy();
  expect(screen.getByText(/ไม่มีการยืนยันตัวตนจริง/)).toBeTruthy();
  expect(screen.getByText(/ห้ามกรอกข้อมูลจริง/)).toBeTruthy();
});

test("registration creates a browser-local session that survives adapter calls", async () => {
  const account = await demoApi<{ user: { email: string }; tenant: { name: string } }>(
    "/api/auth/register",
    {
      companyName: "โรงงานทดสอบ",
      name: "เจ้าของ",
      email: "owner@example.test",
      password: "long-password-123",
    },
  );

  expect(account).toMatchObject({
    user: { email: "owner@example.test" },
    tenant: { name: "โรงงานทดสอบ" },
  });
  expect(await demoApi("/api/auth/me")).toEqual(account);
  expect(localStorage.getItem(DEMO_STORAGE_KEY)).toContain("owner@example.test");
});

test("persisted demo storage discards submitted passwords", async () => {
  const password = "NEVER-PERSIST-THIS-SECRET";
  await demoApi("/api/auth/register", {
    companyName: "โรงงานทดสอบ",
    name: "เจ้าของ",
    email: "owner@example.test",
    password,
  });

  expect(localStorage.getItem(DEMO_STORAGE_KEY)).not.toContain(password);
});

test("production remains curing until explicitly released into ready stock", async () => {
  await demoApi("/api/auth/register", {
    companyName: "โรงงานทดสอบ",
    name: "เจ้าของ",
    email: "owner@example.test",
    password: "long-password-123",
  });
  const product = await demoApi<{ id: string }>("/api/products", {
    sku: "P-001",
    name: "เสาเข็มทดสอบ",
    lengthM: 6,
    priceSatang: 12500,
  });
  const batch = await demoApi<{ id: string }>("/api/production", {
    productId: product.id,
    quantity: 10,
    idempotencyKey: "production-001",
  });
  let workspace = await demoApi<any>("/api/workspace");
  expect(workspace.products[0]).toMatchObject({ curingQty: 10, readyQty: 0 });

  await demoApi(`/api/production/${batch.id}/release`, {
    idempotencyKey: "release-001",
  });
  workspace = await demoApi<any>("/api/workspace");
  expect(workspace.products[0]).toMatchObject({
    curingQty: 0,
    readyQty: 10,
    availableQty: 10,
  });
  expect(workspace.batches[0].status).toBe("ready");
});

test("orders reserve ready stock and partial dispatch/payment update only shipped value", async () => {
  await demoApi("/api/auth/register", {
    companyName: "โรงงานทดสอบ",
    name: "เจ้าของ",
    email: "owner@example.test",
    password: "long-password-123",
  });
  const product = await demoApi<{ id: string }>("/api/products", {
    sku: "P-001",
    name: "เสาเข็มทดสอบ",
    lengthM: 6,
    priceSatang: 12500,
  });
  const batch = await demoApi<{ id: string }>("/api/production", {
    productId: product.id,
    quantity: 10,
    idempotencyKey: "production-001",
  });
  await demoApi(`/api/production/${batch.id}/release`, {
    idempotencyKey: "release-001",
  });
  const order = await demoApi<{ id: string }>("/api/orders", {
    customerName: "ลูกค้าทดสอบ",
    productId: product.id,
    quantity: 8,
    priceSatang: 12500,
    idempotencyKey: "order-001",
  });
  let workspace = await demoApi<any>("/api/workspace");
  expect(workspace.products[0]).toMatchObject({ reservedQty: 8, availableQty: 2 });

  await demoApi(`/api/orders/${order.id}/dispatch`, {
    quantity: 3,
    idempotencyKey: "dispatch-001",
  });
  await demoApi(`/api/orders/${order.id}/payments`, {
    amountSatang: 10000,
    idempotencyKey: "payment-001",
  });
  workspace = await demoApi<any>("/api/workspace");
  expect(workspace.products[0]).toMatchObject({
    readyQty: 7,
    reservedQty: 5,
    availableQty: 2,
  });
  expect(workspace.orders[0]).toMatchObject({
    shippedQty: 3,
    paidSatang: 10000,
    status: "partial",
  });
  expect(workspace.summary).toMatchObject({
    salesSatang: 37500,
    receivableSatang: 27500,
  });
});

test("explicit seed creates synthetic ready and curing stock once", async () => {
  await demoApi("/api/auth/register", {
    companyName: "โรงงานเดโม",
    name: "เจ้าของ",
    email: "seed@example.test",
    password: "discarded-demo-input",
  });
  await demoApi("/api/demo/seed", {});
  const first = await demoApi<any>("/api/workspace");
  expect(first.products).toHaveLength(2);
  expect(first.products.every((product: any) => product.sku.startsWith("DEMO-"))).toBe(true);
  expect(first.summary).toMatchObject({ readyQty: 100, curingQty: 50 });
  await demoApi("/api/demo/seed", {});
  expect((await demoApi<any>("/api/workspace")).products).toHaveLength(2);
});

test("logout ends only the session and demo login restores access by saved email", async () => {
  const credentials = {
    companyName: "โรงงานทดสอบ",
    name: "เจ้าของ",
    email: "owner@example.test",
    password: "long-password-123",
  };
  await demoApi("/api/auth/register", credentials);
  await demoApi("/api/auth/logout", {});
  await expect(demoApi("/api/auth/me")).rejects.toMatchObject({ status: 401 });

  await demoApi("/api/auth/login", { email: credentials.email, password: "discarded" });
  await expect(demoApi("/api/auth/me")).resolves.toMatchObject({
    tenant: { name: "โรงงานทดสอบ" },
  });
});
