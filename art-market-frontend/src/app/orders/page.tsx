"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { RequireUser } from "@/components/RoleGuard";
import { useAuth } from "@/context/AuthContext";
import { listOrdersByBuyer } from "@/lib/api";
import { Order } from "@/types";
import { Card, Container, EmptyState, Spinner } from "@/components/ui";
import { StatusBadge } from "@/components/StatusBadge";

function OrdersContent() {
  const { user } = useAuth();
  const [orders, setOrders] = useState<Order[] | null>(null);

  useEffect(() => {
    if (user) listOrdersByBuyer(user.id).then(setOrders);
  }, [user]);

  return (
    <Container className="py-10">
      <h1 className="mb-6 font-serif text-2xl font-bold text-stone-900">คำสั่งซื้อของฉัน</h1>

      {orders === null ? (
        <Spinner />
      ) : orders.length === 0 ? (
        <EmptyState title="ยังไม่มีรายการคำสั่งซื้อ" description="เมื่อคุณยืนยันคำสั่งซื้อ รายการจะแสดงที่นี่" />
      ) : (
        <div className="flex flex-col gap-3">
          {[...orders].reverse().map((order) => (
            <Link key={order.id} href={`/orders/${order.id}`}>
              <Card className="flex flex-col gap-3 p-4 transition hover:shadow-md sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm font-semibold text-stone-900">
                    คำสั่งซื้อ #{order.id.slice(-8)} · {order.sellerName}
                  </p>
                  <p className="text-xs text-stone-500">
                    {new Date(order.orderDate).toLocaleString("th-TH")} ·{" "}
                    {order.items.length} รายการ
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <StatusBadge status={order.orderStatus} domain="order" />
                  <span className="font-semibold text-stone-900">
                    {order.grandTotal.toLocaleString()} บาท
                  </span>
                </div>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </Container>
  );
}

export default function OrdersPage() {
  return (
    <RequireUser>
      <OrdersContent />
    </RequireUser>
  );
}
