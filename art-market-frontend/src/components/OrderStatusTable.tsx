"use client";

import Link from "next/link";
import { ReactNode } from "react";
import { Order } from "@/types";
import { StatusBadge } from "./StatusBadge";

/**
 * รายการคำสั่งซื้อแบบมีคอลัมน์สถานะ ใช้ทั้งหน้าผู้ซื้อและหน้าผู้ขาย
 *
 * ของเดิมเรียงป้ายสถานะต่อกันชิดขวา ความกว้างของป้ายต่างกันไปตามข้อความ
 * ("ยังไม่ชำระเงิน" สั้นกว่า "ยืนยันการโอนเงินแล้ว") ป้ายแต่ละแถวจึงไม่ตรงกัน
 * และไม่มีหัวข้อบอกว่าป้ายไหนคือสถานะอะไร — ต้องอ่านข้อความเอาเองทีละอัน
 *
 * ที่นี่ล็อกความกว้างแต่ละคอลัมน์ด้วย CSS grid ป้ายแบบเดียวกันจึงอยู่แนวเดียวกันทุกแถว
 * บนจอเล็กไม่มีที่พอสำหรับคอลัมน์ หัวตารางจะซ่อนแล้วแสดงชื่อสถานะหน้าป้ายแทน
 *
 * ทั้งแถวยังเป็นลิงก์เดียว (กดตรงไหนก็เข้าได้) เหมือนเดิม — จึงใช้ grid ไม่ใช้ <table>
 * เพราะ <a> ครอบ <tr> ไม่ได้
 */

const GRID =
  "md:grid md:grid-cols-[minmax(0,1fr)_11rem_11rem_9rem_1rem] md:items-center md:gap-4";

export const ORDER_STATUS_COLUMNS = ["ความพร้อมของผู้ขาย", "การชำระเงิน", "การจัดส่ง"] as const;

function Cell({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex items-center gap-2 md:block">
      {/* ชื่อคอลัมน์ซ้ำหน้าป้าย เฉพาะจอเล็กที่ไม่มีหัวตารางให้ดู */}
      <span className="w-32 shrink-0 text-xs text-stone-500 md:hidden">{label}</span>
      <div className="flex flex-col items-start gap-1">{children}</div>
    </div>
  );
}

export function OrderStatusTable({
  orders,
  meta,
  shippingExtra,
}: {
  orders: Order[];
  /** บรรทัดรองใต้เลขคำสั่งซื้อ (ผู้ซื้อ/ผู้ขาย วันที่ ยอดเงิน) */
  meta: (o: Order) => ReactNode;
  /** ป้ายเสริมใต้สถานะการจัดส่ง เช่น "ได้รับเงินแล้ว" ของผู้ขาย */
  shippingExtra?: (o: Order) => ReactNode;
}) {
  return (
    <div
      className="overflow-hidden rounded-xl border border-stone-200 bg-white"
      data-testid="order-status-table"
    >
      <div
        className={`hidden border-b border-stone-200 bg-stone-50 px-4 py-3 text-xs font-medium text-stone-500 md:grid ${GRID}`}
        role="row"
      >
        <span role="columnheader">คำสั่งซื้อ</span>
        {ORDER_STATUS_COLUMNS.map((h) => (
          <span key={h} role="columnheader">
            {h}
          </span>
        ))}
        <span aria-hidden />
      </div>

      <ul className="divide-y divide-stone-100">
        {orders.map((order) => (
          <li key={order.id}>
            <Link
              href={`/orders/${order.id}`}
              className={`flex flex-col gap-2 px-4 py-4 transition hover:bg-stone-50 ${GRID}`}
              data-testid={`order-row-${order.id}`}
            >
              <div className="min-w-0">
                <p className="text-sm font-semibold text-stone-900">คำสั่งซื้อ #{order.id.slice(-8)}</p>
                <p className="text-xs text-stone-500">{meta(order)}</p>
              </div>
              <Cell label={ORDER_STATUS_COLUMNS[0]}>
                <StatusBadge status={order.availabilityStatus} domain="availability" />
              </Cell>
              <Cell label={ORDER_STATUS_COLUMNS[1]}>
                <StatusBadge status={order.paymentStatus} domain="payment" />
              </Cell>
              <Cell label={ORDER_STATUS_COLUMNS[2]}>
                <StatusBadge status={order.shippingStatus} domain="shipping" />
                {shippingExtra?.(order)}
              </Cell>
              <span className="hidden text-right text-stone-400 md:block" aria-hidden>
                ›
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

/** เรียงคำสั่งซื้อใหม่ล่าสุดไว้บนสุด วันที่เท่ากันใช้เลขคำสั่งซื้อตัดสิน */
export function sortOrdersNewestFirst(orders: Order[]): Order[] {
  return [...orders].sort((a, b) => {
    const diff = new Date(b.orderDate).getTime() - new Date(a.orderDate).getTime();
    return !Number.isNaN(diff) && diff !== 0 ? diff : Number(b.id) - Number(a.id);
  });
}
