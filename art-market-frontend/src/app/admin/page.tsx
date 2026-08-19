"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { RequireAdmin } from "@/components/RoleGuard";
import { listUsers, listPayments } from "@/lib/api";
import { Card, Container } from "@/components/ui";

function AdminDashboardContent() {
  const [userCount, setUserCount] = useState(0);
  const [pendingSellers, setPendingSellers] = useState(0);
  const [paymentCount, setPaymentCount] = useState(0);
  const [pendingPayments, setPendingPayments] = useState(0);

  useEffect(() => {
    listUsers().then((users) => {
      setUserCount(users.length);
      setPendingSellers(users.filter((u) => u.sellerStatus === "pending").length);
    });
    listPayments().then((payments) => {
      setPaymentCount(payments.length);
      setPendingPayments(payments.filter((p) => p.status === "submitted").length);
    });
  }, []);

  const tiles = [
    { label: "ผู้ใช้งานทั้งหมด", value: userCount, href: "/admin/users" },
    { label: "รออนุมัติผู้ขาย", value: pendingSellers, href: "/admin/users" },
    { label: "รายการโอนเงินทั้งหมด", value: paymentCount, href: "/admin/payments" },
    { label: "รอตรวจสอบการโอนเงิน", value: pendingPayments, href: "/admin/payments" },
  ];

  return (
    <Container className="py-10">
      <h1 className="mb-6 font-serif text-2xl font-bold text-stone-900">แดชบอร์ดผู้ดูแลระบบ</h1>
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {tiles.map((tile) => (
          <Link key={tile.label} href={tile.href}>
            <Card className="p-5 transition hover:shadow-md">
              <p className="text-3xl font-bold text-stone-900">{tile.value}</p>
              <p className="mt-1 text-sm text-stone-500">{tile.label}</p>
            </Card>
          </Link>
        ))}
      </div>
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
