"use client";
import React, {
  useEffect,
  useState,
  useRef,
  type FormEvent,
  type ReactNode,
} from "react";
import {
  Factory,
  LayoutDashboard,
  Package,
  Layers3,
  ShoppingBag,
  Warehouse,
  LogOut,
  RefreshCw,
  Plus,
  ArrowUpRight,
  ArrowRight,
  Check,
  Clock3,
  X,
  FlaskConical,
  Truck,
  Wallet,
  ChevronRight,
  Activity,
} from "lucide-react";
import { api } from "./api";
type Product = {
  id: string;
  sku: string;
  name: string;
  lengthM: number;
  priceSatang: number;
  readyQty: number;
  curingQty: number;
  reservedQty: number;
  availableQty: number;
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
  totalSatang: number;
  paidSatang: number;
  status: string;
  createdAt: string;
};
type Movement = {
  id: string;
  productName: string;
  type: string;
  quantity: number;
  reference: string;
  createdAt: string;
};
type Data = {
  user: { name: string; email: string };
  tenant: { name: string };
  role: string;
  products: Product[];
  batches: Batch[];
  orders: Order[];
  movements: Movement[];
  summary: {
    readyQty: number;
    curingQty: number;
    availableQty: number;
    openOrders: number;
    salesSatang: number;
    receivableSatang: number;
  };
};
type Tab = "overview" | "products" | "production" | "orders" | "inventory";
type Modal = {
  kind:
    | "product"
    | "production"
    | "order"
    | "release"
    | "dispatch"
    | "payment"
    | "seed";
  id?: string;
};
const navigation = [
  { id: "overview", label: "ภาพรวมโรงงาน", icon: LayoutDashboard },
  { id: "products", label: "สินค้า", icon: Package },
  { id: "production", label: "การผลิต", icon: Layers3 },
  { id: "orders", label: "คำสั่งซื้อ", icon: ShoppingBag },
  { id: "inventory", label: "คลังสินค้า", icon: Warehouse },
] as const;
const number = (v: number) => new Intl.NumberFormat("th-TH").format(v);
const money = (v: number) =>
  new Intl.NumberFormat("th-TH", {
    style: "currency",
    currency: "THB",
    minimumFractionDigits: 2,
  }).format(v / 100);
const date = (v: string) =>
  new Intl.DateTimeFormat("th-TH", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(v));
const labels = {
  product: "เพิ่มสินค้า",
  production: "บันทึกการผลิต",
  order: "สร้างคำสั่งซื้อ",
  release: "ปล่อยสินค้าพร้อมขาย",
  dispatch: "บันทึกส่งมอบ",
  payment: "บันทึกรับชำระ",
  seed: "เพิ่มข้อมูลตัวอย่าง",
};
function Empty({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <div className="empty">
      <span className="empty-icon">
        <Package size={27} />
      </span>
      <h3>{title}</h3>
      <p>{children || "รายการใหม่จะแสดงที่นี่เมื่อเริ่มบันทึกข้อมูล"}</p>
    </div>
  );
}
function Pill({ ready, children }: { ready?: boolean; children: ReactNode }) {
  return (
    <span className={`badge ${ready ? "green" : "orange"}`}>
      {ready ? <Check size={12} /> : <Clock3 size={12} />} {children}
    </span>
  );
}
function ModalFrame({
  title,
  onClose,
  children,
  busy,
}: {
  title: string;
  onClose: () => void;
  children: ReactNode;
  busy: boolean;
}) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const previous = document.activeElement as HTMLElement;
    ref.current?.querySelector<HTMLElement>("input,select,button")?.focus();
    function key(e: KeyboardEvent) {
      if (e.key === "Escape" && !busy) onClose();
      if (e.key === "Tab") {
        const list = Array.from(
          ref.current?.querySelectorAll<HTMLElement>(
            'button:not(:disabled),input,select,[tabindex="0"]',
          ) || [],
        );
        if (e.shiftKey && document.activeElement === list[0]) {
          e.preventDefault();
          list.at(-1)?.focus();
        } else if (!e.shiftKey && document.activeElement === list.at(-1)) {
          e.preventDefault();
          list[0]?.focus();
        }
      }
    }
    document.addEventListener("keydown", key);
    const old = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", key);
      document.body.style.overflow = old;
      previous?.focus();
    };
  }, [busy, onClose]);
  return (
    <div className="modal-backdrop">
      <div
        ref={ref}
        className="modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
      >
        <div className="modal-heading">
          <div>
            <span className="eyebrow">WORKSPACE / NEW ACTIVITY</span>
            <h2 id="modal-title">{title}</h2>
          </div>
          <button
            type="button"
            className="icon-button"
            aria-label="ปิดหน้าต่าง"
            disabled={busy}
            onClick={onClose}
          >
            <X size={20} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
export default function Workspace({ onLogout }: { onLogout: () => void }) {
  const [data, setData] = useState<Data | null>(null),
    [tab, setTab] = useState<Tab>("overview"),
    [loading, setLoading] = useState(true),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [notice, setNotice] = useState(""),
    [modal, setModal] = useState<Modal | null>(null),
    [formError, setFormError] = useState("");
  const mutationKey = useRef("");
  async function refresh() {
    setLoading(true);
    setError("");
    try {
      setData(await api<Data>("/api/workspace"));
    } catch (e) {
      if ((e as { status?: number }).status === 401) onLogout();
      else
        setError(
          e instanceof Error
            ? e.message
            : "การเชื่อมต่อขัดข้อง กรุณาลองอีกครั้ง",
        );
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    void refresh();
  }, []); // Initial load; mutations explicitly refresh the authoritative API.
  function open(value: Modal) {
    setModal(value);
    setFormError("");
    mutationKey.current = crypto.randomUUID();
  }
  function close() {
    setModal(null);
    setFormError("");
  }
  async function logout() {
    setBusy(true);
    try {
      await api("/api/auth/logout", {});
      onLogout();
    } catch (e) {
      setError(e instanceof Error ? e.message : "ออกจากระบบไม่สำเร็จ");
    } finally {
      setBusy(false);
    }
  }
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!modal || busy) return;
    setBusy(true);
    setFormError("");
    const f = new FormData(e.currentTarget),
      n = (key: string) => Number(f.get(key)),
      s = (key: string) => String(f.get(key) || "");
    let url = "",
      body: object = {};
    const key = { idempotencyKey: mutationKey.current };
    switch (modal.kind) {
      case "product":
        url = "/api/products";
        body = {
          sku: s("sku"),
          name: s("name"),
          lengthM: n("lengthM"),
          priceSatang: Math.round(n("price") * 100),
        };
        break;
      case "production":
        url = "/api/production";
        body = { productId: s("productId"), quantity: n("quantity"), ...key };
        break;
      case "order":
        url = "/api/orders";
        body = {
          customerName: s("customerName"),
          productId: s("productId"),
          quantity: n("quantity"),
          priceSatang: Math.round(n("price") * 100),
          ...key,
        };
        break;
      case "release":
        url = `/api/production/${modal.id}/release`;
        body = key;
        break;
      case "dispatch":
        url = `/api/orders/${modal.id}/dispatch`;
        body = { quantity: n("quantity"), ...key };
        break;
      case "payment":
        url = `/api/orders/${modal.id}/payments`;
        body = { amountSatang: Math.round(n("amount") * 100), ...key };
        break;
      case "seed":
        url = "/api/demo/seed";
        break;
    }
    try {
      await api(url, body);
      setNotice(
        modal.kind === "product"
          ? "บันทึกสินค้าเรียบร้อยแล้ว"
          : `${labels[modal.kind]}เรียบร้อยแล้ว`,
      );
      close();
      await refresh();
    } catch (e) {
      if ((e as { status?: number }).status === 401) onLogout();
      else
        setFormError(
          e instanceof Error
            ? e.message
            : "การเชื่อมต่อขัดข้อง กรุณาลองอีกครั้ง",
        );
    } finally {
      setBusy(false);
    }
  }
  const selectedOrder = data?.orders.find((o) => o.id === modal?.id),
    selectedBatch = data?.batches.find((b) => b.id === modal?.id);
  const editable = data?.role === "owner" || data?.role === "operator";
  const headings = {
    overview: ["ภาพรวมโรงงาน", "ทุกความเคลื่อนไหว ในพื้นที่เดียว"],
    products: ["สินค้าของโรงงาน", "จัดการชนิดเสาเข็ม ความยาว และราคาขาย"],
    production: ["การผลิต", "ติดตามล็อตผลิต ตั้งแต่เริ่มบ่มจนพร้อมขาย"],
    orders: ["คำสั่งซื้อ", "จองสินค้า ส่งมอบ และติดตามยอดรับชำระ"],
    inventory: ["คลังสินค้า", "สต็อกที่เชื่อมกับการผลิตและการส่งมอบจริง"],
  };
  return (
    <div className="app-shell">
      <a href="#main" className="skip-link">
        ข้ามไปเนื้อหาหลัก
      </a>
      <aside className="sidebar">
        <a href="/" className="brand">
          <span className="brand-symbol">
            <Factory size={24} />
          </span>
          EZCON<span className="brand-dot">.</span>
        </a>
        <div className="workspace-label">FACTORY WORKSPACE</div>
        <div className="tenant-card">
          <div className="tenant-avatar">
            <Factory size={18} />
          </div>
          <div>
            <strong>{data?.tenant.name || "พื้นที่โรงงาน"}</strong>
            <small>พื้นที่ทำงานของคุณ</small>
          </div>
        </div>
        <div className="nav-label">การดำเนินงาน</div>
        <nav aria-label="เมนูหลัก">
          {navigation.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              aria-current={tab === id ? "page" : undefined}
              onClick={() => setTab(id)}
            >
              <Icon size={19} />
              <span>{label}</span>
              {tab === id && <ChevronRight size={15} />}
            </button>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <div className="pilot-note">
            <FlaskConical size={20} />
            <strong>Pilot workspace</strong>
            <p>
              รุ่นทดลอง · สำหรับทดสอบ
              <br />
              ขั้นตอนการทำงานของโรงงาน
            </p>
          </div>
          <div className="user-card">
            <span className="avatar">{data?.user.name.slice(0, 1) || "E"}</span>
            <div>
              <strong>{data?.user.name || "ผู้ใช้งาน"}</strong>
              <small>
                {data?.role === "owner" ? "ผู้ดูแลโรงงาน" : data?.role || ""}
              </small>
            </div>
            <button
              className="icon-button"
              aria-label="ออกจากระบบ"
              title="ออกจากระบบ"
              onClick={logout}
              disabled={busy}
            >
              <LogOut size={18} />
            </button>
          </div>
        </div>
      </aside>
      <div className="main-shell">
        <header className="topbar">
          <div className="breadcrumb">
            พื้นที่ทำงาน <ChevronRight size={14} />
            <strong>{headings[tab][0]}</strong>
          </div>
          <div className="topbar-tools">
            <span className="pilot-badge">
              <span /> PILOT
            </span>
            <button
              className="button subtle"
              onClick={refresh}
              disabled={loading || busy}
            >
              <RefreshCw size={15} className={loading ? "spin" : ""} />
              <span>รีเฟรชข้อมูล</span>
            </button>
          </div>
        </header>
        <main id="main" className="workspace-main">
          <div className="page-heading">
            <div>
              <div className="eyebrow">EZCON / OPERATIONS</div>
              <h1>{headings[tab][0]}</h1>
              <p>{headings[tab][1]}</p>
            </div>
            {editable && (
              <button
                className="button primary"
                disabled={!data}
                onClick={() =>
                  open({
                    kind:
                      tab === "products"
                        ? "product"
                        : tab === "orders"
                          ? "order"
                          : "production",
                  })
                }
              >
                <Plus size={18} />
                {tab === "products"
                  ? "เพิ่มสินค้า"
                  : tab === "orders"
                    ? "สร้างคำสั่งซื้อ"
                    : "บันทึกการผลิต"}
              </button>
            )}
          </div>
          {error && (
            <div className="notice error" role="alert">
              {error}{" "}
              <button className="text-button" onClick={refresh}>
                ลองอีกครั้ง
              </button>
            </div>
          )}
          {notice && (
            <div className="notice success" role="status">
              <Check size={17} />
              {notice}
              <button
                className="icon-button"
                aria-label="ปิดข้อความ"
                onClick={() => setNotice("")}
              >
                <X size={16} />
              </button>
            </div>
          )}
          {!data ? (
            <div className="panel empty" role="status">
              {loading
                ? "กำลังโหลดข้อมูลโรงงาน…"
                : "ยังไม่สามารถโหลดข้อมูลได้ กรุณาลองอีกครั้ง"}
            </div>
          ) : (
            <>
              {tab === "overview" && (
                <>
                  <section className="overview-banner">
                    <div>
                      <span className="badge banner-tag">
                        YOUR FACTORY, CONNECTED
                      </span>
                      <h2>เห็นงานชัด เดินหน้าต่อได้ทันที</h2>
                      <p>ผลิต → บ่ม → พร้อมขาย → ส่งมอบ → รับชำระ</p>
                    </div>
                    <div className="banner-emblem" aria-hidden="true">
                      <Factory size={76} strokeWidth={1} />
                    </div>
                  </section>
                  <section className="metrics" aria-label="ตัวเลขภาพรวม">
                    {[
                      {
                        label: "สินค้าพร้อมขาย",
                        value: number(data.summary.availableQty),
                        unit: "ต้น",
                        sub: `พร้อมส่ง ${number(data.summary.readyQty)} · หักยอดจองแล้ว`,
                        icon: Warehouse,
                      },
                      {
                        label: "อยู่ระหว่างบ่ม",
                        value: number(data.summary.curingQty),
                        unit: "ต้น",
                        sub: "รอผู้รับผิดชอบตรวจสอบและปล่อยสินค้า",
                        icon: Layers3,
                      },
                      {
                        label: "คำสั่งซื้อรอส่งมอบ",
                        value: number(data.summary.openOrders),
                        unit: "รายการ",
                        sub: "รวมรายการที่ส่งมอบบางส่วนแล้ว",
                        icon: ShoppingBag,
                      },
                      {
                        label: "ยอดค้างรับชำระ",
                        value: money(data.summary.receivableSatang),
                        unit: "",
                        sub: "คิดเฉพาะสินค้าที่ส่งมอบแล้ว",
                        icon: Wallet,
                      },
                    ].map(({ label, value, unit, sub, icon: Icon }) => (
                      <article className="metric" key={label}>
                        <div className="metric-label">
                          {label}
                          <Icon size={18} />
                        </div>
                        <div className="metric-value">
                          {value}
                          <small>{unit}</small>
                        </div>
                        <p>{sub}</p>
                      </article>
                    ))}
                  </section>
                  {data.products.length === 0 && (
                    <section className="welcome-panel">
                      <div className="welcome-icon">
                        <Package size={26} />
                      </div>
                      <div>
                        <h3>โรงงานพร้อมแล้ว เริ่มจากสินค้าชิ้นแรก</h3>
                        <p>
                          เพิ่มสินค้าของคุณ
                          หรือใช้ข้อมูลสมมติเพื่อทดลองเส้นทางการทำงาน
                        </p>
                      </div>
                      <div className="actions">
                        {editable && (
                          <button
                            className="button"
                            onClick={() => open({ kind: "product" })}
                          >
                            เพิ่มสินค้าชิ้นแรก
                            <ArrowRight size={15} />
                          </button>
                        )}
                        {data.role === "owner" && (
                          <button
                            className="text-button"
                            onClick={() => open({ kind: "seed" })}
                          >
                            ทดลองด้วยข้อมูลตัวอย่าง
                          </button>
                        )}
                      </div>
                    </section>
                  )}
                  <div className="dashboard-grid">
                    <section className="panel">
                      <div className="panel-heading">
                        <div>
                          <h2>สถานะสต็อกสินค้า</h2>
                          <p>จำนวนคงเหลือ แยกตามสถานะ</p>
                        </div>
                        <button
                          className="text-button"
                          onClick={() => setTab("inventory")}
                        >
                          ดูคลังสินค้า
                          <ArrowUpRight size={16} />
                        </button>
                      </div>
                      {data.products.length === 0 ? (
                        <Empty title="ยังไม่มีสินค้าในคลัง">
                          เพิ่มสินค้าและบันทึกการผลิตเพื่อเริ่มติดตามสต็อก
                        </Empty>
                      ) : (
                        <div className="stock-list">
                          {data.products.slice(0, 5).map((p) => (
                            <div className="stock-item" key={p.id}>
                              <div className="stock-title">
                                <strong>{p.name}</strong>
                                <span>
                                  {number(p.readyQty + p.curingQty)}{" "}
                                  <small>ต้น</small>
                                </span>
                              </div>
                              <div
                                className="stock-bar"
                                aria-label={`พร้อมส่ง ${p.readyQty} อยู่ระหว่างบ่ม ${p.curingQty}`}
                              >
                                <div
                                  style={{
                                    width: `${(p.readyQty / (p.readyQty + p.curingQty || 1)) * 100}%`,
                                  }}
                                />
                                <div
                                  style={{
                                    width: `${(p.curingQty / (p.readyQty + p.curingQty || 1)) * 100}%`,
                                  }}
                                />
                              </div>
                              <div className="stock-detail">
                                <span>
                                  {p.sku} · {p.lengthM} ม.
                                </span>
                                <span>
                                  พร้อมขาย {number(p.availableQty)} · จอง{" "}
                                  {number(p.reservedQty)}
                                </span>
                              </div>
                            </div>
                          ))}
                          <div className="legend">
                            <span>
                              <i />
                              พร้อมส่ง
                            </span>
                            <span>
                              <i />
                              กำลังบ่ม
                            </span>
                          </div>
                        </div>
                      )}
                    </section>
                    <section className="panel">
                      <div className="panel-heading">
                        <div>
                          <h2>ความเคลื่อนไหวล่าสุด</h2>
                          <p>บันทึกจากการทำงานจริง</p>
                        </div>
                        <Activity size={20} />
                      </div>
                      {data.movements.length === 0 ? (
                        <Empty title="ยังไม่มีความเคลื่อนไหว">
                          เมื่อมีการผลิตหรือส่งมอบ ประวัติจะแสดงที่นี่
                        </Empty>
                      ) : (
                        <div className="activity-list">
                          {data.movements.slice(0, 5).map((m) => (
                            <div className="activity" key={m.id}>
                              <span
                                className={`activity-icon ${m.type === "dispatch" ? "blue" : ""}`}
                              >
                                {m.type === "dispatch" ? (
                                  <Truck size={17} />
                                ) : (
                                  <Layers3 size={17} />
                                )}
                              </span>
                              <div>
                                <strong>
                                  {m.type === "production"
                                    ? "บันทึกการผลิต"
                                    : m.type === "release"
                                      ? "ปล่อยสินค้าพร้อมขาย"
                                      : "ส่งมอบสินค้า"}{" "}
                                  · {number(m.quantity)} ต้น
                                </strong>
                                <p>{m.productName}</p>
                                <small>
                                  {date(m.createdAt)} · {m.reference}
                                </small>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </section>
                  </div>
                  <section className="sales-strip">
                    <Wallet size={21} />
                    <div>
                      <strong>ยอดขายจากสินค้าที่ส่งมอบ</strong>
                      <span>
                        มูลค่าสะสมในพื้นที่โรงงาน · ไม่รวมการคำนวณภาษี
                      </span>
                    </div>
                    <b>{money(data.summary.salesSatang)}</b>
                  </section>
                </>
              )}
              {(tab === "products" || tab === "inventory") && (
                <section className="panel">
                  <div className="panel-heading">
                    <div>
                      <h2>
                        {tab === "products"
                          ? "รายการสินค้า"
                          : "ยอดคงเหลือรายสินค้า"}
                      </h2>
                      <p>{data.products.length} รายการ · หน่วยสต็อกเป็นต้น</p>
                    </div>
                    <span className="badge neutral">
                      {tab === "products"
                        ? "PRODUCT CATALOG"
                        : "LIVE INVENTORY"}
                    </span>
                  </div>
                  {data.products.length === 0 ? (
                    <Empty title="ยังไม่มีรายการสินค้า">
                      เริ่มจากเพิ่มรหัสสินค้า ความยาว และราคาขายของโรงงาน
                    </Empty>
                  ) : (
                    <div className="table-scroll">
                      <table>
                        <thead>
                          <tr>
                            <th>สินค้า / รหัส</th>
                            <th>ความยาว</th>
                            {tab === "products" ? (
                              <th>ราคาต่อหน่วย</th>
                            ) : (
                              <>
                                <th>กำลังบ่ม</th>
                                <th>พร้อมส่ง</th>
                                <th>จองแล้ว</th>
                              </>
                            )}
                            <th>พร้อมขาย</th>
                          </tr>
                        </thead>
                        <tbody>
                          {data.products.map((p) => (
                            <tr key={p.id}>
                              <td>
                                <strong>{p.name}</strong>
                                <small>{p.sku}</small>
                              </td>
                              <td>{p.lengthM} ม.</td>
                              {tab === "products" ? (
                                <td>{money(p.priceSatang)}</td>
                              ) : (
                                <>
                                  <td>{number(p.curingQty)}</td>
                                  <td>{number(p.readyQty)}</td>
                                  <td>{number(p.reservedQty)}</td>
                                </>
                              )}
                              <td>
                                <span className="quantity-chip">
                                  {number(p.availableQty)} ต้น
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </section>
              )}
              {tab === "inventory" && (
                <div className="info-note">
                  <Warehouse size={18} />
                  <p>
                    พร้อมขาย = พร้อมส่ง − ยอดจอง ·
                    สินค้าระหว่างบ่มยังไม่สามารถจองหรือส่งมอบได้
                  </p>
                </div>
              )}
              {tab === "production" && (
                <>
                  <div className="info-note">
                    <ShieldNotice />
                    <p>
                      การปล่อยสินค้าต้องยืนยันโดยผู้รับผิดชอบ
                      ไม่ใช่การรับรองกำลังอัดหรือคุณภาพทางวิศวกรรมโดยระบบ
                    </p>
                  </div>
                  <section className="panel">
                    <div className="panel-heading">
                      <div>
                        <h2>ล็อตการผลิต</h2>
                        <p>
                          {data.batches.length} ล็อต ·
                          เริ่มต้นทุกล็อตในสถานะกำลังบ่ม
                        </p>
                      </div>
                    </div>
                    {data.batches.length === 0 ? (
                      <Empty title="ยังไม่มีล็อตการผลิต">
                        เพิ่มสินค้า แล้วกดบันทึกการผลิตเพื่อเริ่มล็อตแรก
                      </Empty>
                    ) : (
                      <div className="table-scroll">
                        <table>
                          <thead>
                            <tr>
                              <th>ล็อต / วันที่</th>
                              <th>สินค้า</th>
                              <th>จำนวน</th>
                              <th>สถานะ</th>
                              <th>ดำเนินการ</th>
                            </tr>
                          </thead>
                          <tbody>
                            {data.batches.map((b) => (
                              <tr key={b.id}>
                                <td>
                                  <strong className="mono">
                                    {b.reference}
                                  </strong>
                                  <small>{date(b.createdAt)}</small>
                                </td>
                                <td>{b.productName}</td>
                                <td>{number(b.quantity)} ต้น</td>
                                <td>
                                  <Pill ready={b.status === "ready"}>
                                    {b.status === "ready"
                                      ? "พร้อมขาย"
                                      : "กำลังบ่ม"}
                                  </Pill>
                                </td>
                                <td>
                                  {b.status === "curing" && editable ? (
                                    <button
                                      className="button small"
                                      onClick={() =>
                                        open({ kind: "release", id: b.id })
                                      }
                                    >
                                      ปล่อยสินค้า
                                      <ArrowUpRight size={14} />
                                    </button>
                                  ) : (
                                    <span className="muted">
                                      {b.status === "ready" ? "ปล่อยแล้ว" : "กำลังบ่ม"}
                                    </span>
                                  )}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </section>
                </>
              )}
              {tab === "orders" && (
                <>
                  <div className="info-note">
                    <ShoppingBag size={18} />
                    <p>
                      รุ่นทดลอง: 1 ชนิดสินค้าต่อคำสั่งซื้อ ·
                      จองสต็อกพร้อมขายทันที · รับชำระได้ตามมูลค่าที่ส่งมอบแล้ว
                    </p>
                  </div>
                  <section className="panel">
                    <div className="panel-heading">
                      <div>
                        <h2>คำสั่งซื้อทั้งหมด</h2>
                        <p>{data.orders.length} รายการ</p>
                      </div>
                    </div>
                    {data.orders.length === 0 ? (
                      <Empty title="พร้อมรับคำสั่งซื้อแรก">
                        ต้องมีสินค้าพร้อมขายก่อน
                        จึงจะสามารถจองสินค้าให้ลูกค้าได้
                      </Empty>
                    ) : (
                      <div className="order-list">
                        {data.orders.map((o) => (
                          <article className="order-card" key={o.id}>
                            <div className="order-top">
                              <div>
                                <span className="mono">{o.reference}</span>
                                <h3>{o.customerName}</h3>
                                <p>
                                  {o.productName} · {number(o.quantity)} ต้น
                                </p>
                              </div>
                              <Pill ready={o.status === "fulfilled"}>
                                {o.status === "fulfilled"
                                  ? "ส่งมอบครบแล้ว"
                                  : o.status === "partial"
                                    ? "ส่งมอบบางส่วน"
                                    : "รอส่งมอบ"}
                              </Pill>
                            </div>
                            <div className="order-numbers">
                              <div>
                                <small>มูลค่าคำสั่งซื้อ</small>
                                <strong>{money(o.totalSatang)}</strong>
                              </div>
                              <div>
                                <small>ส่งมอบแล้ว</small>
                                <strong>
                                  {number(o.shippedQty)} / {number(o.quantity)}{" "}
                                  <small>ต้น</small>
                                </strong>
                              </div>
                              <div>
                                <small>รับชำระแล้ว</small>
                                <strong>{money(o.paidSatang)}</strong>
                              </div>
                              <div>
                                <small>ค้างรับจากที่ส่งแล้ว</small>
                                <strong className="accent-text">
                                  {money(
                                    o.shippedQty * o.priceSatang - o.paidSatang,
                                  )}
                                </strong>
                              </div>
                            </div>
                            <div className="order-footer">
                              <small className="muted">
                                {date(o.createdAt)}
                              </small>
                              <div className="actions">
                                {editable && o.shippedQty < o.quantity && (
                                  <button
                                    className="button small"
                                    onClick={() =>
                                      open({ kind: "dispatch", id: o.id })
                                    }
                                  >
                                    <Truck size={15} />
                                    บันทึกส่งมอบ
                                  </button>
                                )}
                                {editable &&
                                  o.shippedQty * o.priceSatang >
                                    o.paidSatang && (
                                    <button
                                      className="button small"
                                      onClick={() =>
                                        open({ kind: "payment", id: o.id })
                                      }
                                    >
                                      <Wallet size={15} />
                                      รับชำระเงิน
                                    </button>
                                  )}
                              </div>
                            </div>
                          </article>
                        ))}
                      </div>
                    )}
                  </section>
                </>
              )}
              <footer className="workspace-footer">
                <span>EZCON · Factory operations, simplified.</span>
                <span>Pilot v0.1 · ข้อมูลจากพื้นที่โรงงานของคุณ</span>
              </footer>
            </>
          )}
        </main>
      </div>
      {modal && data && (
        <ModalFrame title={labels[modal.kind]} onClose={close} busy={busy}>
          <form onSubmit={submit}>
            {formError && (
              <div className="notice error" role="alert">
                {formError}
              </div>
            )}
            {modal.kind === "product" && (
              <>
                <label>
                  รหัสสินค้า (SKU)
                  <input
                    name="sku"
                    required
                    maxLength={50}
                    placeholder="เช่น PC-18-06"
                  />
                </label>
                <label>
                  ชื่อสินค้า
                  <input
                    name="name"
                    required
                    maxLength={120}
                    placeholder="เช่น เสาเข็มไอ 18 × 18"
                  />
                </label>
                <div className="form-grid">
                  <label>
                    ความยาว (เมตร)
                    <input
                      name="lengthM"
                      type="number"
                      required
                      min="0.01"
                      step="0.01"
                      placeholder="6.00"
                    />
                  </label>
                  <label>
                    ราคาขายต่อหน่วย (บาท)
                    <input
                      name="price"
                      type="number"
                      required
                      min="0.01"
                      step="0.01"
                      placeholder="1,250.00"
                    />
                  </label>
                </div>
              </>
            )}
            {(modal.kind === "production" || modal.kind === "order") && (
              <>
                <label>
                  สินค้า
                  <select
                    name="productId"
                    required
                    defaultValue=""
                    onChange={(e) => {
                      const product = data.products.find(
                        (p) => p.id === e.target.value,
                      );
                      const price = e.currentTarget.form?.elements.namedItem(
                        "price",
                      ) as HTMLInputElement | null;
                      if (price && product)
                        price.value = String(product.priceSatang / 100);
                    }}
                  >
                    <option value="" disabled>
                      เลือกสินค้า
                    </option>
                    {data.products.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.sku} · {p.name} ({p.lengthM} ม.) · พร้อมขาย{" "}
                        {p.availableQty} ต้น
                      </option>
                    ))}
                  </select>
                </label>
                {data.products.length === 0 && (
                  <p className="notice warning">
                    ยังไม่มีสินค้า กรุณาปิดหน้าต่างและเพิ่มสินค้าก่อน
                  </p>
                )}
                {modal.kind === "order" && (
                  <label>
                    ชื่อลูกค้า
                    <input
                      name="customerName"
                      required
                      maxLength={120}
                      placeholder="ชื่อลูกค้า / บริษัท"
                    />
                  </label>
                )}
                <label>
                  จำนวน (ต้น)
                  <input
                    name="quantity"
                    type="number"
                    min="1"
                    step="1"
                    required
                    placeholder="ระบุจำนวน"
                  />
                </label>
                {modal.kind === "order" ? (
                  <label>
                    ราคาขายต่อหน่วย (บาท)
                    <input
                      name="price"
                      type="number"
                      min="0.01"
                      step="0.01"
                      required
                    />
                  </label>
                ) : (
                  <p className="form-help">
                    ล็อตใหม่จะเริ่มในสถานะกำลังบ่ม และยังไม่เพิ่มสต็อกพร้อมขาย
                  </p>
                )}
              </>
            )}
            {modal.kind === "release" && (
              <>
                <div className="confirmation-detail">
                  <strong>{selectedBatch?.reference}</strong>
                  <p>
                    {selectedBatch?.productName} · {selectedBatch?.quantity} ต้น
                  </p>
                </div>
                <p className="form-help">
                  ยืนยันว่าผู้รับผิดชอบได้ตรวจสอบสินค้าล็อตนี้แล้ว
                  การดำเนินการนี้จะย้ายสินค้าทั้งล็อตจากกำลังบ่มเป็นพร้อมขาย
                  และไม่ใช่การรับรองทางวิศวกรรม
                </p>
                <label className="checkbox">
                  <input type="checkbox" required name="confirm" />
                  ฉันตรวจสอบและยืนยันการปล่อยสินค้าล็อตนี้
                </label>
              </>
            )}
            {modal.kind === "dispatch" && selectedOrder && (
              <>
                <div className="confirmation-detail">
                  <strong>
                    {selectedOrder.reference} · {selectedOrder.customerName}
                  </strong>
                  <p>
                    คงเหลือรอส่ง{" "}
                    {number(selectedOrder.quantity - selectedOrder.shippedQty)}{" "}
                    ต้น
                  </p>
                </div>
                <label>
                  จำนวนส่งมอบ (ต้น)
                  <input
                    name="quantity"
                    type="number"
                    required
                    min="1"
                    step="1"
                    max={selectedOrder.quantity - selectedOrder.shippedQty}
                  />
                </label>
                <p className="form-help">
                  บันทึกเฉพาะจำนวนที่ส่งมอบจริง
                  สต็อกพร้อมส่งและยอดจองจะลดลงทันที ไม่ใช่ระบบติดตามรถขนส่ง
                </p>
              </>
            )}
            {modal.kind === "payment" && selectedOrder && (
              <>
                <div className="confirmation-detail">
                  <strong>
                    {selectedOrder.reference} · {selectedOrder.customerName}
                  </strong>
                  <p>
                    ยอดค้างรับ{" "}
                    {money(
                      selectedOrder.shippedQty * selectedOrder.priceSatang -
                        selectedOrder.paidSatang,
                    )}
                  </p>
                </div>
                <label>
                  จำนวนเงินรับชำระ (บาท)
                  <input
                    name="amount"
                    type="number"
                    min="0.01"
                    step="0.01"
                    required
                    max={
                      (selectedOrder.shippedQty * selectedOrder.priceSatang -
                        selectedOrder.paidSatang) /
                      100
                    }
                  />
                </label>
                <p className="form-help">
                  บันทึกเงินที่ได้รับจริงเท่านั้น
                  ระบบไม่ได้เรียกเก็บเงินผ่านธนาคาร
                </p>
              </>
            )}
            {modal.kind === "seed" && (
              <div className="confirmation-detail">
                <FlaskConical size={32} />
                <h3>ลองทำงานด้วยข้อมูลสมมติ</h3>
                <p>
                  เพิ่มสินค้าและล็อตตัวอย่างลงในพื้นที่โรงงานนี้
                  ทำได้ครั้งเดียวต่อโรงงาน ข้อมูลจะคงอยู่หลังออกจากระบบ
                </p>
                <p>ไม่ใช่ยอดผลิต ยอดขาย หรือข้อมูลลูกค้าจริง</p>
              </div>
            )}
            <div className="modal-actions">
              <button
                type="button"
                className="button"
                onClick={close}
                disabled={busy}
              >
                ยกเลิก
              </button>
              <button
                className="button primary"
                disabled={
                  busy ||
                  ((modal.kind === "production" || modal.kind === "order") &&
                    data.products.length === 0)
                }
              >
                {busy
                  ? "กำลังบันทึก…"
                  : modal.kind === "product"
                    ? "บันทึกสินค้า"
                    : labels[modal.kind]}
              </button>
            </div>
          </form>
        </ModalFrame>
      )}
    </div>
  );
}
function ShieldNotice() {
  return <FlaskConical size={19} />;
}
