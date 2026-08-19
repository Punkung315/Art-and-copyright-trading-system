# Artmara — ระบบซื้อขายงานศิลปะและโอนลิขสิทธิ์ (Frontend)

Frontend สำหรับโครงงาน "ระบบซื้อขายงานศิลปะ" (SRS v4.0) พัฒนาด้วย **Next.js (App Router) + TypeScript + Tailwind CSS**
ตามข้อกำหนดทั่วไปของระบบ (2.3 General Constraints) ที่ระบุให้ frontend เป็น Next.js เชื่อมต่อ backend
Spring Boot ผ่าน RESTful API โดยใช้ MySQL

## รันโปรเจกต์

```bash
npm install
npm run dev
```

เปิด http://localhost:3000

## สถานะปัจจุบัน: ใช้งานได้แบบสาธิต (mock data layer)

ยังไม่มี backend Spring Boot ให้เชื่อมต่อ โปรเจกต์นี้จึงมี **mock data layer** อยู่ที่
`src/lib/api.ts` ซึ่งจำลองพฤติกรรมของ REST API จริงทุกฟังก์ชัน (เป็น `async`, throw error
ตาม Alternate Flow ในเอกสาร SRS) แต่เก็บข้อมูลไว้ใน `localStorage` ของเบราว์เซอร์แทนฐานข้อมูลจริง
เพื่อให้ทุกหน้าจอทำงานและสาธิตได้ครบวงจรทันทีโดยไม่ต้องมี backend

**เมื่อ backend Spring Boot พร้อมใช้งาน** ให้แก้เฉพาะเนื้อหาภายในฟังก์ชันแต่ละตัวใน `src/lib/api.ts`
ให้เรียก `fetch(`${API_BASE}/...`)` แทนการอ่าน/เขียน `localStorage` — ไม่ต้องแก้หน้าจอ (page/component)
ใดๆ เลย เพราะทุกหน้าเรียกผ่านฟังก์ชันในไฟล์นี้เท่านั้น กำหนด URL ของ backend ผ่าน environment variable:

```bash
# .env.local
NEXT_PUBLIC_API_BASE_URL=http://localhost:8080/api
```

## บัญชีทดสอบ (seed data)

| บทบาท | Username | Password |
|---|---|---|
| ผู้ดูแลระบบ | `admin` | `admin1234` |
| ผู้ขาย (อนุมัติแล้ว) | `nichaart` | `password1` |
| ผู้ขาย (อนุมัติแล้ว) | `kritstudio` | `password1` |
| ผู้ขาย (รออนุมัติ) | `pending_artist` | `password1` |
| ผู้ซื้อ | `punchapong` | `password1` |

ข้อมูลตัวอย่าง (ผู้ใช้ งานศิลปะ คำสั่งซื้อ) ถูก seed ไว้ใน `src/lib/seed.ts` และจะถูกโหลดเข้า
`localStorage` โดยอัตโนมัติในการเปิดแอปครั้งแรก ล้างข้อมูลทดสอบได้ด้วยการล้าง localStorage ของเบราว์เซอร์
(หรือ DevTools → Application → Local Storage → ลบ key ที่ขึ้นต้นด้วย `amk_`)

## โครงสร้างโปรเจกต์

```
src/
  app/                 หน้าจอทั้งหมด (Next.js App Router)
    page.tsx           Search Art / หน้าแรก
    art/[id]/          View Art
    register/          Register Buyer
    register-seller/   Register Seller
    login/, admin/login/
    profile/, profile/edit/
    cart/, checkout/
    orders/            View Order, View Quotation, Make Payment
    copyright/         Send / List / Sign / Print Copyright Transfer
    seller/            List/Add/Edit/Publish Art, Print Certificate,
                        List Order, Confirm Availability, Update Order,
                        Receive Copyright Transfer
    admin/             List User, Verify Seller, List Payment, Confirm Payment
  components/          UI ที่ใช้ร่วมกัน (Navbar, ArtCard, ฟอร์ม, Guard ตามสิทธิ์)
  context/             AuthContext, CartContext, ToastContext
  lib/
    api.ts             จุดเดียวที่คุยกับ "backend" (mock ⇄ REST switch จุดนี้)
    validation.ts      กฎ validate ตาม SRS 3.1.x (username/password/email/...)
    seed.ts             ข้อมูลตัวอย่างเริ่มต้น
  types/               Type ตาม Class Diagram ในเอกสาร SRS
```

## การจับคู่ยูสเคสกับหน้าจอ

ทุกยูสเคสใน SRS section 3.1 (31 ยูสเคส) มีหน้าจอรองรับครบตาม 4 actor (User, Buyer, Seller, Admin)
รวมถึง validation ของแต่ละฟอร์มอ้างอิงจากส่วน "ความต้องการของระบบ (Requirement)" ในเอกสารต้นฉบับ
(เช่น username 8-20 ตัวอักษร, password 8-16 ตัวอักษรรวมอักขระพิเศษ `! # _ .`, เบอร์โทร 10 หลัก,
รหัสไปรษณีย์ 5 หลัก, เลขบัตรประชาชน 13 หลัก ฯลฯ)

## หมายเหตุด้านความปลอดภัย

โค้ดชุดนี้เป็น **frontend สาธิต** เท่านั้น รหัสผ่านถูกเก็บเป็น plain text ใน localStorage
เพื่อความสะดวกในการสาธิต — เมื่อเชื่อมต่อ backend จริง ต้องย้าย auth ทั้งหมดไปให้ Spring Boot
จัดการ (hash password, ออก JWT/session, ตรวจสิทธิ์ฝั่ง server) ห้ามใช้แนวทางนี้กับระบบจริง
