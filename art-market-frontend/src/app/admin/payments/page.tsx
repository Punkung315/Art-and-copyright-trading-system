"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { RequireAdmin } from "@/components/RoleGuard";
import { listPayments } from "@/lib/api";
import { Payment, PaymentStatus } from "@/types";
import { Container, EmptyState, Input, Spinner } from "@/components/ui";
import { StatusBadge } from "@/components/StatusBadge";
import { SummaryTable } from "@/components/SummaryTable";
import { FilterChips } from "@/components/FilterChips";

type PaymentFilter = "all" | PaymentStatus;

/** เรียงตามลำดับที่ Admin ต้องสนใจก่อนหลัง */
const STATUS_ROWS: { status: PaymentStatus; label: string; chip: string; highlight?: boolean }[] = [
  { status: "submitted", label: "รอตรวจสอบ", chip: "รอตรวจสอบ", highlight: true },
  { status: "confirmed", label: "ยืนยันการโอนเงินแล้ว", chip: "ยืนยันแล้ว" },
  { status: "rejected", label: "ปฏิเสธการโอนเงิน", chip: "ปฏิเสธ" },
  { status: "unpaid", label: "ยังไม่ชำระเงิน", chip: "ยังไม่ชำระ" },
];

function formatDate(iso?: string) {
  if (!iso) return "—";
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? "—" : d.toLocaleDateString("th-TH");
}

function AdminPaymentsContent() {
  const [payments, setPayments] = useState<Payment[] | null>(null);
  const [filter, setFilter] = useState<PaymentFilter>("all");
  const [keyword, setKeyword] = useState("");

  useEffect(() => {
    listPayments().then(setPayments);
  }, []);

  const all = useMemo(() => payments ?? [], [payments]);

  /**
   * เรียงรายการใหม่ล่าสุดไว้บนสุด
   *
   * ตาราง payment ไม่มีคอลัมน์ "วันที่แจ้งโอน" จึงใช้วันที่สั่งซื้อเป็นตัวแทน
   * แล้วเทียบด้วยรหัสการโอนเงิน (ซึ่งเรียงตามลำดับที่ถูกสร้างจริง) เป็นตัวตัดสินรอง
   */
  const sorted = useMemo(
    () =>
      [...all].sort((a, b) => {
        const diff = new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        return diff !== 0 ? diff : Number(b.id) - Number(a.id);
      }),
    [all]
  );

  const visible = useMemo(() => {
    const kw = keyword.trim().toLowerCase();
    return sorted.filter((p) => {
      if (filter !== "all" && p.status !== filter) return false;
      if (!kw) return true;
      // ค้นหาได้ทั้งชื่อคนและรหัส เพราะ Admin มักได้รับแจ้งมาเป็นเลขคำสั่งซื้อ
      return [p.buyerName, p.sellerName, `#${p.id}`, `#${p.orderId}`, p.id, p.orderId]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(kw));
    });
  }, [sorted, filter, keyword]);

  // ตัวเลขในสรุปนับจากข้อมูลทั้งหมดเสมอ ไม่ใช่เฉพาะที่ผ่านตัวกรอง
  const groups = STATUS_ROWS.map((row) => ({
    ...row,
    items: all.filter((p) => p.status === row.status),
  }));

  const summary = groups.map((g) => ({
    label: g.label,
    count: g.items.length,
    amount: g.items.reduce((s, p) => s + p.grandTotal, 0),
    highlight: g.highlight,
    filterValue: g.status,
  }));

  const chips = [
    { value: "all", label: "ทั้งหมด", count: all.length },
    ...groups.map((g) => ({ value: g.status, label: g.chip, count: g.items.length })),
  ];

  const activeLabel = STATUS_ROWS.find((r) => r.status === filter)?.label;

  return (
    <Container className="py-10">
      <h1 className="mb-6 font-serif text-2xl font-bold text-stone-900">รายการโอนเงินให้ผู้ขาย</h1>

      {payments === null ? (
        <Spinner />
      ) : all.length === 0 ? (
        <EmptyState
          title="ยังไม่มีรายการการโอนเงิน"
          description="รายการจะปรากฏเมื่อผู้ซื้อชำระเงินและแนบหลักฐาน"
        />
      ) : (
        <>
          <SummaryTable
            title="สรุปการโอนเงิน"
            rows={summary}
            totalLabel="รวมทุกสถานะ"
            activeFilter={filter}
            onFilterSelect={(v) => setFilter(v as PaymentFilter)}
          />

          <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <FilterChips
              options={chips}
              value={filter}
              onChange={(v) => setFilter(v as PaymentFilter)}
            />
            <div className="md:w-72">
              <Input
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
                placeholder="ค้นหาผู้ซื้อ, ผู้ขาย, รหัสคำสั่งซื้อ"
                aria-label="ค้นหารายการโอนเงิน"
              />
            </div>
          </div>

          <p className="mb-2 text-sm text-stone-500">
            แสดง {visible.length} จาก {all.length} รายการ
            {activeLabel && ` · ${activeLabel}`}
            {keyword.trim() && ` · คำค้น "${keyword.trim()}"`}
          </p>

          {visible.length === 0 ? (
            <EmptyState
              title="ไม่พบรายการที่ตรงกับเงื่อนไข"
              description="ลองเปลี่ยนตัวกรองหรือลบคำค้นหา"
            />
          ) : (
            <div className="overflow-x-auto rounded-xl border border-stone-200 bg-white">
              <table className="w-full text-left text-sm">
                <thead className="bg-stone-50 text-stone-500">
                  <tr>
                    <th className="px-4 py-3">รหัส</th>
                    <th className="px-4 py-3">คำสั่งซื้อ</th>
                    <th className="px-4 py-3">วันที่สั่งซื้อ</th>
                    <th className="px-4 py-3">ผู้ซื้อ</th>
                    <th className="px-4 py-3">ผู้ขาย</th>
                    <th className="px-4 py-3 text-right">ยอดสุทธิ</th>
                    <th className="px-4 py-3">สถานะ</th>
                    <th className="px-4 py-3" />
                  </tr>
                </thead>
                <tbody>
                  {visible.map((p) => (
                    <tr key={p.id} className="border-t border-stone-100 hover:bg-stone-50">
                      <td className="px-4 py-3 text-stone-600">#{p.id}</td>
                      <td className="px-4 py-3 text-stone-600">#{p.orderId}</td>
                      <td className="px-4 py-3 text-stone-600">{formatDate(p.createdAt)}</td>
                      <td className="px-4 py-3 font-medium text-stone-900">{p.buyerName || "—"}</td>
                      <td className="px-4 py-3 text-stone-600">{p.sellerName || "—"}</td>
                      <td className="px-4 py-3 text-right font-medium text-stone-900">
                        ฿{p.grandTotal.toLocaleString()}
                      </td>
                      <td className="px-4 py-3">
                        <StatusBadge status={p.status} domain="payment" />
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Link
                          href={`/admin/payments/${p.id}`}
                          className="text-sm font-medium text-stone-700 underline hover:text-stone-900"
                        >
                          ดูข้อมูล
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </Container>
  );
}

export default function AdminPaymentsPage() {
  return (
    <RequireAdmin>
      <AdminPaymentsContent />
    </RequireAdmin>
  );
}
