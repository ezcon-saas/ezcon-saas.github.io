export const DEMO_STORAGE_KEY = "ezcon-static-demo-v1";

type Account = {
  user: { id: string; name: string; email: string };
  tenant: { id: string; name: string };
  role: "owner";
};
type Product = {
  id: string;
  sku: string;
  name: string;
  lengthM: number;
  priceSatang: number;
  readyQty: number;
  curingQty: number;
  reservedQty: number;
};
type Batch = {
  id: string;
  reference: string;
  productId: string;
  productName: string;
  quantity: number;
  status: "curing" | "ready";
  createdAt: string;
};
type Order = {
  id: string;
  reference: string;
  customerName: string;
  productId: string;
  productName: string;
  quantity: number;
  shippedQty: number;
  priceSatang: number;
  paidSatang: number;
  createdAt: string;
};
type Movement = {
  id: string;
  productName: string;
  type: "production" | "release" | "dispatch";
  quantity: number;
  reference: string;
  createdAt: string;
};
type FactoryData = {
  products: Product[];
  batches: Batch[];
  orders: Order[];
  movements: Movement[];
};
type StoredDemo = {
  sessionEmail: string | null;
  accounts: Record<
    string,
    { account: Account; factory: FactoryData }
  >;
};

const empty = (): StoredDemo => ({ sessionEmail: null, accounts: {} });
const emptyFactory = (): FactoryData => ({
  products: [],
  batches: [],
  orders: [],
  movements: [],
});
function read(): StoredDemo {
  const raw = localStorage.getItem(DEMO_STORAGE_KEY);
  if (!raw) return empty();
  try {
    return JSON.parse(raw) as StoredDemo;
  } catch {
    return empty();
  }
}
function write(value: StoredDemo) {
  localStorage.setItem(DEMO_STORAGE_KEY, JSON.stringify(value));
}
function failure(message: string, status: number): never {
  const error = new Error(message);
  Object.assign(error, { status });
  throw error;
}
function positiveInteger(value: unknown, label = "จำนวน") {
  if (!Number.isInteger(value) || Number(value) <= 0)
    failure(`${label}ต้องเป็นจำนวนเต็มมากกว่า 0`, 400);
  return Number(value);
}
function active(store: StoredDemo) {
  const record = store.sessionEmail ? store.accounts[store.sessionEmail] : undefined;
  if (!record) failure("Authentication required", 401);
  return record;
}
function movement(
  factory: FactoryData,
  productName: string,
  type: Movement["type"],
  quantity: number,
  reference: string,
) {
  factory.movements.unshift({
    id: crypto.randomUUID(),
    productName,
    type,
    quantity,
    reference,
    createdAt: new Date().toISOString(),
  });
}

export async function demoApi<T>(url: string, body?: object): Promise<T> {
  const store = read();
  if (url === "/api/auth/register") {
    const value = body as {
      companyName: string;
      name: string;
      email: string;
      password: string;
    };
    const email = String(value.email).trim().toLowerCase();
    if (store.accounts[email]) failure("อีเมลนี้ถูกใช้งานแล้ว", 409);
    const account: Account = {
      user: { id: crypto.randomUUID(), name: String(value.name).trim(), email },
      tenant: { id: crypto.randomUUID(), name: String(value.companyName).trim() },
      role: "owner",
    };
    store.accounts[email] = {
      account,
      factory: emptyFactory(),
    };
    store.sessionEmail = email;
    write(store);
    return account as T;
  }
  if (url === "/api/auth/login") {
    const value = body as { email: string; password: string };
    const email = String(value.email).trim().toLowerCase();
    const record = store.accounts[email];
    if (!record) failure("ไม่พบอีเมลเดโมนี้ในเบราว์เซอร์", 401);
    store.sessionEmail = email;
    write(store);
    return record.account as T;
  }
  if (url === "/api/auth/logout") {
    store.sessionEmail = null;
    write(store);
    return true as T;
  }
  const record = active(store);
  if (url === "/api/auth/me") return record.account as T;
  const factory = record.factory;
  if (url === "/api/products") {
    const value = body as {
      sku: string;
      name: string;
      lengthM: number;
      priceSatang: number;
    };
    if (factory.products.some((product) => product.sku === value.sku))
      failure("รหัสสินค้านี้มีอยู่แล้ว", 409);
    const product: Product = {
      id: crypto.randomUUID(),
      sku: String(value.sku).trim(),
      name: String(value.name).trim(),
      lengthM: Number(value.lengthM),
      priceSatang: Number(value.priceSatang),
      readyQty: 0,
      curingQty: 0,
      reservedQty: 0,
    };
    factory.products.push(product);
    write(store);
    return { id: product.id } as T;
  }
  if (url === "/api/production") {
    const value = body as { productId: string; quantity: number };
    const product = factory.products.find((item) => item.id === value.productId);
    if (!product) failure("ไม่พบสินค้า", 404);
    const quantity = positiveInteger(value.quantity);
    const id = crypto.randomUUID();
    const batch: Batch = {
      id,
      reference: `B-${id.slice(0, 8)}`,
      productId: product.id,
      productName: product.name,
      quantity,
      status: "curing",
      createdAt: new Date().toISOString(),
    };
    product.curingQty += quantity;
    factory.batches.unshift(batch);
    movement(factory, product.name, "production", quantity, batch.reference);
    write(store);
    return { id } as T;
  }
  const release = /^\/api\/production\/([^/]+)\/release$/.exec(url);
  if (release) {
    const batch = factory.batches.find((item) => item.id === release[1]);
    if (!batch) failure("ไม่พบล็อตผลิต", 404);
    if (batch.status === "ready") failure("ล็อตนี้ถูกปล่อยแล้ว", 409);
    const product = factory.products.find((item) => item.id === batch.productId)!;
    batch.status = "ready";
    product.curingQty -= batch.quantity;
    product.readyQty += batch.quantity;
    movement(factory, product.name, "release", batch.quantity, batch.reference);
    write(store);
    return { id: batch.id } as T;
  }
  if (url === "/api/orders") {
    const value = body as {
      customerName: string;
      productId: string;
      quantity: number;
      priceSatang: number;
    };
    const product = factory.products.find((item) => item.id === value.productId);
    if (!product) failure("ไม่พบสินค้า", 404);
    const quantity = positiveInteger(value.quantity);
    if (product.readyQty - product.reservedQty < quantity)
      failure("สต็อกพร้อมขายไม่เพียงพอ", 409);
    const id = crypto.randomUUID();
    product.reservedQty += quantity;
    factory.orders.unshift({
      id,
      reference: `O-${id.slice(0, 8)}`,
      customerName: String(value.customerName).trim(),
      productId: product.id,
      productName: product.name,
      quantity,
      shippedQty: 0,
      priceSatang: Number(value.priceSatang),
      paidSatang: 0,
      createdAt: new Date().toISOString(),
    });
    write(store);
    return { id } as T;
  }
  const dispatch = /^\/api\/orders\/([^/]+)\/dispatch$/.exec(url);
  if (dispatch) {
    const order = factory.orders.find((item) => item.id === dispatch[1]);
    if (!order) failure("ไม่พบคำสั่งซื้อ", 404);
    const quantity = positiveInteger((body as { quantity: number }).quantity);
    if (quantity > order.quantity - order.shippedQty)
      failure("จำนวนเกินยอดที่เหลือในคำสั่งซื้อ", 409);
    const product = factory.products.find((item) => item.id === order.productId)!;
    order.shippedQty += quantity;
    product.readyQty -= quantity;
    product.reservedQty -= quantity;
    movement(factory, product.name, "dispatch", quantity, order.reference);
    write(store);
    return { id: order.id } as T;
  }
  const payment = /^\/api\/orders\/([^/]+)\/payments$/.exec(url);
  if (payment) {
    const order = factory.orders.find((item) => item.id === payment[1]);
    if (!order) failure("ไม่พบคำสั่งซื้อ", 404);
    const amount = positiveInteger(
      (body as { amountSatang: number }).amountSatang,
      "ยอดชำระ",
    );
    if (amount > order.shippedQty * order.priceSatang - order.paidSatang)
      failure("ยอดชำระเกินยอดค้างรับจากสินค้าที่ส่งแล้ว", 409);
    order.paidSatang += amount;
    write(store);
    return { id: crypto.randomUUID() } as T;
  }
  if (url === "/api/demo/seed") {
    if (factory.products.length > 0) return true as T;
    for (const sample of [
      {
        sku: "DEMO-I18",
        name: "ตัวอย่าง · เสาเข็มไอ 18",
        lengthM: 6,
        priceSatang: 125000,
        readyQty: 40,
        curingQty: 20,
      },
      {
        sku: "DEMO-MP15",
        name: "ตัวอย่าง · ไมโครไพล์ 15",
        lengthM: 1.5,
        priceSatang: 45000,
        readyQty: 60,
        curingQty: 30,
      },
    ]) {
      const product: Product = {
        id: crypto.randomUUID(),
        ...sample,
        reservedQty: 0,
      };
      factory.products.push(product);
      for (const [status, quantity] of [
        ["ready", sample.readyQty],
        ["curing", sample.curingQty],
      ] as const) {
        const id = crypto.randomUUID();
        const reference = `DEMO-${id.slice(0, 8)}`;
        factory.batches.unshift({
          id,
          reference,
          productId: product.id,
          productName: product.name,
          quantity,
          status,
          createdAt: new Date().toISOString(),
        });
        movement(factory, product.name, "production", quantity, reference);
        if (status === "ready")
          movement(factory, product.name, "release", quantity, reference);
      }
    }
    write(store);
    return true as T;
  }
  if (url === "/api/workspace") {
    const products = factory.products.map((product) => ({
      ...product,
      availableQty: product.readyQty - product.reservedQty,
    }));
    const orders = factory.orders.map((order) => ({
      ...order,
      totalSatang: order.quantity * order.priceSatang,
      status:
        order.shippedQty === order.quantity
          ? "fulfilled"
          : order.shippedQty > 0
            ? "partial"
            : "confirmed",
    }));
    return {
      ...record.account,
      products,
      batches: factory.batches,
      orders,
      movements: factory.movements,
      summary: {
        readyQty: products.reduce((sum, product) => sum + product.readyQty, 0),
        curingQty: products.reduce((sum, product) => sum + product.curingQty, 0),
        availableQty: products.reduce((sum, product) => sum + product.availableQty, 0),
        openOrders: orders.filter((order) => order.status !== "fulfilled").length,
        salesSatang: orders.reduce(
          (sum, order) => sum + order.shippedQty * order.priceSatang,
          0,
        ),
        receivableSatang: orders.reduce(
          (sum, order) =>
            sum + order.shippedQty * order.priceSatang - order.paidSatang,
          0,
        ),
      },
    } as T;
  }
  failure("ไม่พบการทำงานในโหมดเดโม", 404);
}
