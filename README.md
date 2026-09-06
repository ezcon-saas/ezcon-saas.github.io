# EZCON Static Demo

เว็บไซต์ทดลองสำหรับดู Workflow โรงงานเสาเข็ม:

**ผลิต → บ่ม → พร้อมขาย → จองสินค้า → ส่งมอบ → รับชำระ**

หน้า Public Demo: **https://ezcon-saas.github.io**

> นี่คือ Static Demo บน GitHub Pages ไม่ใช่ระบบ Production และไม่มี Backend, Database หรือระบบยืนยันตัวตนจริง

## พฤติกรรมของ Demo

- สร้างบัญชีโรงงานจำลองในเบราว์เซอร์
- เพิ่มสินค้าและล็อตผลิต
- ปล่อยสินค้าจากกำลังบ่มเป็นพร้อมขาย
- สร้างออเดอร์และจองสต็อก
- ส่งมอบ/รับชำระบางส่วน
- เพิ่มข้อมูลสังเคราะห์ตัวอย่าง
- ข้อมูลคงอยู่หลัง Refresh ด้วย `localStorage` ของเบราว์เซอร์นั้น

ห้ามกรอกข้อมูลโรงงานจริง ข้อมูลลูกค้า หรือใช้รหัสผ่านจริงซ้ำ ระบบจะไม่บันทึกรหัสผ่านที่กรอก และการ Login ของ Demo ใช้อีเมลที่เคยสร้างในเบราว์เซอร์เท่านั้น

## พัฒนาและตรวจสอบในเครื่อง

ต้องมี Node.js 22+ และ npm

```bash
npm ci
npm run typecheck
npm test
npm run build
npm run test:e2e
```

`npm run build` สร้าง Static Export ใน `out/` และ Playwright ทดสอบไฟล์ที่ Export ผ่าน HTTP static server จริง

## โครงสร้าง Repository

Repository นี้มีเฉพาะ Static Demo และ source ฝั่ง Browser สำหรับ GitHub Pages ไม่มี Backend source, Database credentials หรือข้อมูลลูกค้า

Backend จริงและ Supabase Database แยกจาก Demo นี้ การเชื่อม Database จริงต้อง Deploy Backend บนบริการที่รัน Node.js และ PostgreSQL ได้ ไม่ใช่ GitHub Pages
