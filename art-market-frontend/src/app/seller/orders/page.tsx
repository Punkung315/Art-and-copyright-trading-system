"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { RequireSeller } from "@/components/RoleGuard";
import { useAuth } from "@/context/AuthContext";
import { listOrdersBySeller } from "@/lib/api";
import { Order } from "@/types";
import { Button, Card, Container, EmptyState, Spinner } from "@/components/ui";
import { StatusBadge } from "@/components/StatusBadge";
import { SummaryTable } from "@/components/SummaryTable";
import { FilterChips } from "@/components/FilterChips";
import { PendingBadge } from "@/components/PendingBadge";

type OrderFilter = "all" | "waiting" | "to_ship" | "done";

/**
 * จัดกลุ่มคำสั่งซื้อตาม "สิ่งที่ผู้ขายต้องทำต่อ" ไม่ใช่ตามสถานะดิบ
 * เพราะผู้ขายเปิดหน้านี้มาเพื่อหาว่ามีอะไรค้างต้องจัดการ
 */
function bucketOf(o: Order): Exclude<OrderFilter, "all"> {
  if (o.availabilityStatus === "waiting") return "waiting";
  if (o.paymentStatus === "confirmed" && o.shippingStatus !== "delivered") return "to_ship";
  return "done";
}

const BUCKET_LABEL: Record<Exclude<OrderFilter, "all">, string> = {
  waiting: "รอยืนยันความพร้อม",
  to_ship: "รอจัดส่ง / กำลังจัดส่ง",
  done: "ดำเนินการเสร็จแล้ว",
};

function SellerOrdersContent() {
  const { user } = useAuth();
  const [orders, setOrders] = useState<Order[] | null>(null);
  const [filter, setFilter] = useState<OrderFilter>("all");

  useEffect(() => {
    if (user) listOrdersBySeller(user.id).then(setOrders);
  }, [user]);

  const all = useMemo(() => orders ?? [], [orders]);

  // คำสั่งซื้อใหม่ล่าสุดอยู่บนสุด
  const sorted = useMemo(
    () =>
      [...all].sort((a, b) => {
        const diff = new Date(b.orderDate).getTime() - new Date(a.orderDate).getTime();
        return diff !== 0 ? diff : Number(b.id) - Number(a.id);
      }),
    [all]
  );

  const visible = useMemo(
    () => (filter === "all" ? sorted : sorted.filter((o) => bucketOf(o) === filter)),
    [sorted, filter]
  );

  const group = (bucket: Exclude<OrderFilter, "all">) => all.filter((o) => bucketOf(o) === bucket);

  const summary = (["waiting", "to_ship", "done"] as const).map((bucket) => {
    const items = group(bucket);
    return {
      label: BUCKET_LABEL[bucket],
      count: items.length,
      amount: items.reduce((s, o) => s + o.grandTotal, 0),
      highlight: bucket === "waiting",
      filterValue: bucket,
    };
  });

  const chips = [
    { value: "all", label: "ทั้งหมด", count: all.length },
    { value: "waiting", label: "รอยืนยันความพร้อม", count: group("waiting").length },
    { value: "to_ship", label: "รอจัดส่ง", count: group("to_ship").length },
    { value: "done", label: "เสร็จแล้ว", count: group("done").length },
  ];

  return (
    <Container className="py-10">
      <div className="mb-6 flex flex-wrap items-center gap-3">
        <h1 className="font-serif text-2xl font-bold text-stone-900">คำสั่งซื้อของร้านฉัน</h1>
        <PendingBadge count={group("waiting").length} label="รอยืนยันความพร้อม" />
      </div>

      {orders === null ? (
        <Spinner />
      ) : all.length === 0 ? (
        <EmptyState
          title="ยังไม่มีรายการคำสั่งซื้อ"
          description="เมื่อมีผู้ซื้อสั่งซื้อผลงานของคุณ รายการจะปรากฏที่นี่"
        />
      ) : (
        <>
          <SummaryTable
            title="สรุปคำสั่งซื้อ"
            rows={summary}
            totalLabel="คำสั่งซื้อทั้งหมด"
            activeFilter={filter}
            onFilterSelect={(v) => setFilter(v as OrderFilter)}
          />

          <div className="mb-4">
            <FilterChips
              options={chips}
              value={filter}
              onChange={(v) => setFilter(v as OrderFilter)}
            />
          </div>

          <p className="mb-2 text-sm text-stone-500">
            แสดง {visible.length} จาก {all.length} รายการ
            {filter !== "all" && ` · ${BUCKET_LABEL[filter]}`}
          </p>

          {visible.length === 0 ? (
            <EmptyState title="ไม่พบคำสั่งซื้อที่ตรงกับเงื่อนไข" />
          ) : (
            <div className="flex flex-col gap-3">
              {/*
                ทั้งการ์ดเป็นลิงก์เดียว กดตรงไหนก็เข้าได้
                ของเดิมกดได้เฉพาะข้อความ "คำสั่งซื้อ #n" ซึ่งเป็นเป้าเล็กและมองไม่ออกว่ากดได้
                ปุ่มยืนยันความพร้อม/ช่องจัดส่งย้ายไปอยู่ในหน้าคำสั่งซื้อแล้ว
              */}
              {visible.map((order) => (
                <Link key={order.id} href={`/orders/${order.id}`} className="block">
                  <Card className="p-4 transition hover:border-stone-300 hover:shadow-md">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold text-stone-900">
                          คำสั่งซื้อ #{order.id.slice(-8)}
                        </p>
                        <p className="text-xs text-stone-500">
                          ผู้ซื้อ {order.buyerName} ·{" "}
                          {new Date(order.orderDate).toLocaleDateString("th-TH")} ·{" "}
                          {order.items.length} รายการ · ฿{order.grandTotal.toLocaleString()}
                        </p>
                      </div>
                      <div className="flex flex-wrap items-center gap-2">
                        <StatusBadge status={order.availabilityStatus} domain="availability" />
                        <StatusBadge status={order.paymentStatus} domain="payment" />
                        <StatusBadge status={order.shippingStatus} domain="shipping" />
                        {order.sellerPayout?.paid && (
                          <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-medium text-emerald-800">
                            ได้รับเงินแล้ว
                          </span>
                        )}
                        <span className="text-stone-400" aria-hidden>
                          ›
                        </span>
                      </div>
                    </div>
                  </Card>
                </Link>
              ))}
            </div>
          )}
        </>
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
