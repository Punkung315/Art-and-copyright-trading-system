"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { RequireAdmin } from "@/components/RoleGuard";
import { listUsers, listPayments } from "@/lib/api";
import { Payment, User } from "@/types";
import { Card, Container, Spinner } from "@/components/ui";
import { PendingBadge } from "@/components/PendingBadge";

function Tile({
  label,
  value,
  href,
  highlight,
}: {
  label: string;
  value: number;
  href: string;
  highlight?: boolean;
}) {
  return (
    <Link href={href}>
      <Card
        className={`p-5 transition hover:shadow-md ${
          highlight && value > 0 ? "border-amber-300 bg-amber-50" : ""
        }`}
      >
        <p
          className={`text-3xl font-bold ${
            highlight && value > 0 ? "text-amber-700" : "text-stone-900"
          }`}
        >
          {value}
        </p>
        <p className="mt-1 text-sm text-stone-500">{label}</p>
      </Card>
    </Link>
  );
}

function Section({
  title,
  description,
  href,
  linkLabel,
  pending,
  children,
}: {
  title: string;
  description: string;
  href: string;
  linkLabel: string;
  pending: number;
  children: React.ReactNode;
}) {
  return (
    <section className="mb-10">
      <div className="mb-3 flex flex-wrap items-center gap-3">
        <h2 className="font-serif text-xl font-bold text-stone-900">{title}</h2>
        {/* badge บอกจำนวนที่รอดำเนินการ — ซ่อนเองเมื่อเป็น 0 */}
        <PendingBadge count={pending} />
        <Link href={href} className="ml-auto text-sm text-stone-600 underline hover:text-stone-900">
          {linkLabel}
        </Link>
      </div>
      <p className="mb-4 text-sm text-stone-500">{description}</p>
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">{children}</div>
    </section>
  );
}

function AdminDashboardContent() {
  const [users, setUsers] = useState<User[] | null>(null);
  const [payments, setPayments] = useState<Payment[] | null>(null);

  useEffect(() => {
    listUsers().then(setUsers);
    listPayments().then(setPayments);
  }, []);

  if (users === null || payments === null) {
    return (
      <Container className="py-10">
        <h1 className="mb-6 font-serif text-2xl font-bold text-stone-900">แดชบอร์ดผู้ดูแลระบบ</h1>
        <Spinner />
      </Container>
    );
  }

  const pendingSellers = users.filter((u) => u.sellerStatus === "pending").length;
  const approvedSellers = users.filter((u) => u.sellerStatus === "approved").length;
  const buyersOnly = users.filter((u) => u.sellerStatus === "none").length;

  const pendingPayments = payments.filter((p) => p.status === "submitted");
  const confirmedPayments = payments.filter((p) => p.status === "confirmed");
  const rejectedPayments = payments.filter((p) => p.status === "rejected");
  const confirmedAmount = confirmedPayments.reduce((s, p) => s + p.grandTotal, 0);

  return (
    <Container className="py-10">
      <h1 className="mb-8 font-serif text-2xl font-bold text-stone-900">แดชบอร์ดผู้ดูแลระบบ</h1>

      <Section
        title="ผู้ใช้งาน"
        description="ดูข้อมูลผู้ใช้ทั้งหมดและพิจารณาคำร้องขอเป็นผู้ขาย"
        href="/admin/users"
        linkLabel="ไปที่รายการผู้ใช้งาน →"
        pending={pendingSellers}
      >
        {/* กดการ์ดไหนให้เข้าไปที่กลุ่มนั้นเลย ไม่ใช่เข้าไปที่รายการทั้งหมดทุกครั้ง */}
        <Tile label="ผู้ใช้งานทั้งหมด" value={users.length} href="/admin/users" />
        <Tile
          label="คำร้องขอเป็นผู้ขาย (รออนุมัติ)"
          value={pendingSellers}
          href="/admin/users?filter=pending"
          highlight
        />
        <Tile
          label="ผู้ขายที่อนุมัติแล้ว"
          value={approvedSellers}
          href="/admin/users?filter=approved"
        />
        <Tile label="ผู้ซื้อ (ไม่ได้สมัครขาย)" value={buyersOnly} href="/admin/users?filter=none" />
      </Section>

      <Section
        title="การโอนเงิน"
        description="ตรวจสอบหลักฐานการโอนเงินของผู้ซื้อก่อนยืนยันให้ผู้ขาย"
        href="/admin/payments"
        linkLabel="ไปที่รายการการโอนเงิน →"
        pending={pendingPayments.length}
      >
        {/*
          ตัวเลขบนการ์ดนับเฉพาะการโอนค่าชิ้นงาน (listPayments ไม่รวมค่าลิขสิทธิ์)
          จึงต้องส่ง kind=artwork ไปด้วย ไม่งั้นจำนวนในหน้ารายการจะไม่ตรงกับที่เห็นบนการ์ด
        */}
        <Tile
          label="รายการโอนเงินทั้งหมด"
          value={payments.length}
          href="/admin/payments?kind=artwork"
        />
        <Tile
          label="รอตรวจสอบการโอนเงิน"
          value={pendingPayments.length}
          href="/admin/payments?kind=artwork&status=submitted"
          highlight
        />
        <Tile
          label="ยืนยันแล้ว"
          value={confirmedPayments.length}
          href="/admin/payments?kind=artwork&status=confirmed"
        />
        <Tile
          label="ปฏิเสธ"
          value={rejectedPayments.length}
          href="/admin/payments?kind=artwork&status=rejected"
        />
      </Section>

      <p className="text-sm text-stone-500">
        ยอดเงินที่ยืนยันแล้วทั้งหมด{" "}
        <span className="font-semibold text-stone-900">{confirmedAmount.toLocaleString()} บาท</span>
        {pendingPayments.length > 0 && (
          <>
            {" · "}รอตรวจสอบอีก{" "}
            <span className="font-semibold text-amber-700">
              {pendingPayments.reduce((s, p) => s + p.grandTotal, 0).toLocaleString()} บาท
            </span>
          </>
        )}
      </p>
    </Container>
  );
}

export default function AdminDashboardPage() {
  return (
    <RequireAdmin>
      <AdminDashboardContent />
    </RequireAdmin>
  );
}
