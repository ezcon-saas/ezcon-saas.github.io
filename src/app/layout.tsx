import React from "react";
import type { Metadata } from "next";
import "./globals.css";
export const metadata: Metadata = {
  title: "EZCON Static Demo — พื้นที่ทำงานโรงงานเสาเข็ม",
  description:
    "Static demo สำหรับทดลองการผลิต คลังสินค้า คำสั่งซื้อ และการรับชำระด้วยข้อมูลสังเคราะห์ในเบราว์เซอร์",
  robots: { index: false, follow: false },
};
export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="th">
      <body>{children}</body>
    </html>
  );
}
