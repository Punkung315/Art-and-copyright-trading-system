"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { RequireSeller } from "@/components/RoleGuard";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/context/ToastContext";
import { listOrdersBySeller, confirmAvailability, updateShippingStatus, ApiError } from "@/lib/api";
import { Order, ShippingStatus } from "@/types";
import { Button, Card, Container, EmptyState, Select, Spinner } from "@/components/ui";
import { StatusBadge } from "@/components/StatusBadge";

const SHIPPING_OPTIONS: { value: ShippingStatus; label: string }[] = [
  { value: "not_shipped", label: "ยังไม่จัดส่ง" },
  { value: "packed", label: "แพ็คสินค้าแล้ว" },
  { value: "shipped", label: "จัดส่งแล้ว" },
  { value: "delivered", label: "จัดส่งสำเร็จ" },
];

function SellerOrdersContent() {
  const { user } = useAuth();
  const { notify } = useToast();
  const [orders, setOrders] = useState<Order[] | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  async function load() {
    if (user) setOrders(await listOrdersBySeller(user.id));
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  async function handleAvailability(orderId: string, confirmed: boolean) {
    setBusyId(orderId);
    try {
      await confirmAvailability(orderId, confirmed);
      await load();
      notify(confirmed ? "ยืนยันความพร้อมในการขายผลงานแล้ว" : "ปฏิเสธคำสั่งซื้อแล้ว", "success");
    } catch (err) {
      notify(err instanceof ApiError ? err.message : "ไม่สามารถแก้ไขสถานะได้ กรุณาลองใหม่อีกครั้ง", "error");
    } finally {
      setBusyId(null);
    }
  }

  async function handleShipping(orderId: string, status: ShippingStatus) {
    setBusyId(orderId);
    try {
      await updateShippingStatus(orderId, status);
      await load();
      notify("อัปเดตสถานะการจัดส่งสำเร็จ", "success");
    } catch (err) {
      notify(err instanceof ApiError ? err.message : "ไม่สามารถแก้ไขสถานะได้ กรุณาลองใหม่อีกครั้ง", "error");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <Container className="py-10">
      <h1 className="mb-6 font-serif text-2xl font-bold text-stone-900">คำสั่งซื้อของร้านฉัน</h1>

      {orders === null ? (
        <Spinner />
      ) : orders.length === 0 ? (
        <EmptyState title="ยังไม่มีรายการคำสั่งซื้อ" />
      ) : (
        <div className="flex flex-col gap-3">
          {[...orders].reverse().map((order) => (
            <Card key={order.id} className="p-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <Link href={`/orders/${order.id}`} className="text-sm font-semibold text-stone-900 hover:underline">
                    คำสั่งซื้อ #{order.id.slice(-8)}
                  </Link>
                  <p className="text-xs text-stone-500">
                    ผู้ซื้อ {order.buyerName} · {new Date(order.orderDate).toLocaleDateString("th-TH")} ·{" "}
                    {order.items.length} รายการ · ฿{order.grandTotal.toLocaleString()}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <StatusBadge status={order.availabilityStatus} domain="availability" />
                  <StatusBadge status={order.paymentStatus} domain="payment" />
                  <StatusBadge status={order.shippingStatus} domain="shipping" />
                </div>
              </div>

              <div className="mt-3 flex flex-wrap items-center gap-3 border-t border-stone-100 pt-3">
                {order.availabilityStatus === "waiting" && (
                  <>
                    <Button
                      disabled={busyId === order.id}
                      onClick={() => handleAvailability(order.id, true)}
                    >
                      ยืนยันความพร้อมในการขาย
                    </Button>
                    <Button
                      variant="danger"
                      disabled={busyId === order.id}
                      onClick={() => handleAvailability(order.id, false)}
                    >
                      ไม่พร้อมจำหน่าย
                    </Button>
                  </>
                )}

                {order.paymentStatus === "confirmed" && (
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-stone-500">สถานะการจัดส่ง</span>
                    <Select
                      value={order.shippingStatus}
                      disabled={busyId === order.id}
                      onChange={(e) => handleShipping(order.id, e.target.value as ShippingStatus)}
                      className="w-44"
                    >
                      {SHIPPING_OPTIONS.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                          {opt.label}
                        </option>
                      ))}
                    </Select>
                  </div>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}
    </Container>
  );
}

export default function SellerOrdersPage() {
  return (
    <RequireSeller>
      <SellerOrdersContent />
    </RequireSeller>
  );
}
