"use client";
import React, { useEffect, useState, type FormEvent } from "react";
import { Factory, ArrowUpRight, ShieldCheck } from "lucide-react";
import Workspace from "../components/workspace";

import { api } from "../components/api";
function DemoNotice() {
  return (
    <div className="static-demo-notice" role="note">
      <strong>STATIC DEMO</strong>
      <span>
        ข้อมูลสังเคราะห์เก็บในเบราว์เซอร์นี้เท่านั้น · ไม่มีการยืนยันตัวตนจริง ·
        ห้ามกรอกข้อมูลจริง ข้อมูลลูกค้า หรือใช้รหัสผ่านจริงซ้ำ
      </span>
    </div>
  );
}
export default function Page() {
  const [checking, setChecking] = useState(true),
    [authenticated, setAuthenticated] = useState(false),
    [register, setRegister] = useState(false),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  useEffect(() => {
    api("/api/auth/me")
      .then(() => setAuthenticated(true))
      .catch((e) => {
        if (e.status !== 401) setError(e.message);
      })
      .finally(() => setChecking(false));
  }, []);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    const fields = new FormData(event.currentTarget);
    try {
      await api(
        `/api/auth/${register ? "register" : "login"}`,
        register
          ? {
              companyName: fields.get("companyName"),
              name: fields.get("name"),
              email: fields.get("email"),
              password: fields.get("password"),
            }
          : { email: fields.get("email"), password: fields.get("password") },
      );
      setAuthenticated(true);
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "การเชื่อมต่อขัดข้อง กรุณาลองอีกครั้ง",
      );
    } finally {
      setBusy(false);
    }
  }
  if (checking)
    return (
      <main className="loading-screen" role="status">
        <Factory size={36} />
        <p>กำลังเปิดพื้นที่โรงงาน…</p>
      </main>
    );
  if (authenticated)
    return (
      <>
        <DemoNotice />
        <Workspace
          onLogout={() => {
            setAuthenticated(false);
            setError("");
            setRegister(false);
          }}
        />
      </>
    );
  return (
    <main className="auth-shell">
      <DemoNotice />
      <section className="auth-story">
        <a className="brand" href="/" aria-label="EZCON หน้าแรก">
          <span className="brand-symbol">
            <Factory size={25} />
          </span>
          EZCON<span className="brand-dot">.</span>
        </a>
        <div className="auth-pitch">
          <span className="eyebrow">BUILT FOR THE FACTORY FLOOR</span>
          <h1>
            ทุกขั้นตอนของโรงงาน
            <br />
            <span>อยู่ในภาพเดียวกัน</span>
          </h1>
          <p>
            เชื่อมการผลิต สต็อก และยอดขายเสาเข็ม
            <br />
            ให้ทีมทำงานต่อกันได้อย่างเป็นระบบ
          </p>
          <div className="factory-art" aria-hidden="true">
            <div />
            <div />
            <div />
            <div />
            <div />
            <div />
            <span>PRODUCTION → INVENTORY → ORDERS</span>
          </div>
        </div>
        <div className="auth-foot">
          <ShieldCheck size={18} /> พื้นที่ข้อมูลแยกสำหรับแต่ละโรงงาน{" "}
          <span>PILOT · รุ่นทดลอง</span>
        </div>
      </section>
      <section className="auth-panel">
        <div className="auth-card">
          <span className="badge orange">EZCON WORKSPACE</span>
          <h2>{register ? "เริ่มต้นโรงงานที่เป็นระบบ" : "ยินดีต้อนรับกลับ"}</h2>
          <p className="muted">
            {register
              ? "สร้างบัญชีผู้ดูแลและพื้นที่โรงงานของคุณ"
              : "เลือกอีเมลเดโมที่เคยสร้างในเบราว์เซอร์นี้"}
          </p>
          <div className="auth-switch">
            <button
              type="button"
              aria-pressed={!register}
              onClick={() => {
                setRegister(false);
                setError("");
              }}
            >
              เข้าสู่ระบบ
            </button>
            <button
              type="button"
              aria-pressed={register}
              onClick={() => {
                setRegister(true);
                setError("");
              }}
            >
              สร้างบัญชีโรงงาน
            </button>
          </div>
          {error && (
            <div className="notice error" role="alert">
              {error}
            </div>
          )}
          <form onSubmit={submit}>
            {register && (
              <>
                <label>
                  ชื่อโรงงาน / บริษัท
                  <input
                    name="companyName"
                    required
                    maxLength={120}
                    autoComplete="organization"
                    placeholder="เช่น บริษัท คอนกรีตดี จำกัด"
                  />
                </label>
                <label>
                  ชื่อผู้ใช้งาน
                  <input
                    name="name"
                    required
                    maxLength={100}
                    autoComplete="name"
                    placeholder="ชื่อ–นามสกุล"
                  />
                </label>
              </>
            )}
            <label>
              อีเมล
              <input
                name="email"
                required
                type="email"
                autoComplete="email"
                placeholder="you@factory.co.th"
                maxLength={254}
              />
            </label>
            <label>
              รหัสผ่านเดโม (ระบบจะทิ้งค่า ไม่ตรวจสอบและไม่บันทึก)
              <input
                name="password"
                required
                type="password"
                minLength={register ? 12 : 1}
                maxLength={128}
                autoComplete="off"
                placeholder={
                  register ? "อย่างน้อย 12 ตัวอักษร" : "รหัสผ่านของคุณ"
                }
              />
            </label>
            {register && (
              <small className="muted">
                ใช้อย่างน้อย 12 ตัวอักษร และไม่ใช้รหัสผ่านซ้ำกับบริการอื่น
              </small>
            )}
            <button className="button primary full" disabled={busy}>
              {busy
                ? "กำลังดำเนินการ…"
                : register
                  ? "เริ่มต้นใช้งาน"
                  : "เข้าสู่พื้นที่โรงงาน"}
              <ArrowUpRight size={18} />
            </button>
          </form>
          <p className="auth-disclaimer">
            STATIC DEMO · ข้อมูลสังเคราะห์ใน browser localStorage
            <br />
            ยังไม่ใช่ระบบบัญชีภาษีหรือการรับรองคุณภาพทางวิศวกรรม
            <br />
            ระบบจริงที่เชื่อม Supabase:{" "}
            <a
              href="https://ezcon.187.52.117.62.nip.io"
              rel="noopener noreferrer"
            >
              ezcon.187.52.117.62.nip.io
            </a>
          </p>
        </div>
      </section>
    </main>
  );
}
