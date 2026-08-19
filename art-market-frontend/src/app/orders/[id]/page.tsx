"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import { RequireUser } from "@/components/RoleGuard";
import { getOrder } from "@/lib/api";
import { Order } from "@/types";
import { Button, Card, Container, Spinner } from "@/components/ui";
import { StatusBadge } from "@/components/StatusBadge";

function OrderDetailContent({ id }: { id: string }) {
  const [order, setOrder] = useState<Order | null | undefined>(undefined);

  useEffect(() => {
    getOrder(id).then((o) => setOrder(o ?? null));
  }, [id]);

  if (order === undefined) return <Spinner />;
  if (order === null) {
    return (
      <Container className="py-16 text-center text-stone-600">ไม่พบรายการคำสั่งซื้อ</Container>
    );
  }

  return (
    <Container className="py-10">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-serif text-2xl font-bold text-stone-900">
            คำสั่งซื้อ #{order.id.slice(-8)}
          </h1>
          <p className="text-sm text-stone-500">ผู้ขาย: {order.sellerName}</p>
        </div>
        <div className="flex gap-2">
          <StatusBadge status={order.orderStatus} domain="order" />
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="flex flex-col gap-4 lg:col-span-2">
          <Card className="p-5">
            <h2 className="mb-3 font-serif text-base font-bold text-stone-900">รายการสินค้า</h2>
            <div className="flex flex-col gap-3">
              {order.items.map((item) => (
                <div key={item.id} className="flex items-center gap-3">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={item.artworkImage} alt={item.artworkName} className="h-14 w-14 rounded-lg object-cover" />
                  <p className="flex-1 text-sm text-stone-800">{item.artworkName}</p>
                  <p className="text-sm font-medium text-stone-900">฿{item.price.toLocaleString()}</p>
                </div>
              ))}
            </div>
          </Card>

          <Card className="grid grid-cols-2 gap-4 p-5 text-sm sm:grid-cols-3">
            <div>
              <p className="text-stone-500">ความพร้อมของผู้ขาย</p>
              <StatusBadge status={order.availabilityStatus} domain="availability" />
            </div>
            <div>
              <p className="text-stone-500">การชำระเงิน</p>
              <StatusBadge status={order.paymentStatus} domain="payment" />
            </div>
            <div>
              <p className="text-stone-500">สถานะการจัดส่ง</p>
              <StatusBadge status={order.shippingStatus} domain="shipping" />
            </div>
          </Card>
        </div>

        <Card className="h-fit p-5">
          <h2 className="mb-3 font-serif text-base font-bold text-stone-900">สรุปยอด</h2>
          <div className="flex flex-col gap-2 text-sm text-stone-600">
            <div className="flex justify-between">
              <span>ราคารวมชิ้นงาน</span>
              <span>฿{order.totalAmount.toLocaleString()}</span>
            </div>
            <div className="flex justify-between">
              <span>ค่าจัดส่ง</span>
              <span>฿{order.shippingCost.toLocaleString()}</span>
            </div>
            <div className="flex justify-between border-t border-stone-200 pt-2 text-base font-semibold text-stone-900">
              <span>ยอดสุทธิ</span>
              <span>฿{order.grandTotal.toLocaleString()}</span>
            </div>
          </div>

          <div className="mt-5 flex flex-col gap-2">
            <Link href={`/orders/${order.id}/quotation`}>
              <Button variant="secondary" className="w-full">
                ดูใบเสนอราคา
              </Button>
            </Link>
            {order.availabilityStatus === "confirmed" && order.paymentStatus === "unpaid" && (
              <Link href={`/orders/${order.id}/payment`}>
                <Button className="w-full">ชำระเงิน</Button>
              </Link>
            )}
            {order.availabilityStatus === "waiting" && (
              <p className="rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-700">
                กำลังรอผู้ขายยืนยันความพร้อมในการขายผลงาน
              </p>
            )}
          </div>
        </Card>
      </div>
    </Container>
  );
}

export default function OrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  return (
    <RequireUser>
      <OrderDetailContent id={id} />
    </RequireUser>
  );
}
