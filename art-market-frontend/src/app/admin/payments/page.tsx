"use client";

import Link from "next/link";
import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { RequireAdmin } from "@/components/RoleGuard";
import { listCopyrightPayments, listPayments } from "@/lib/api";
import { PaymentStatus } from "@/types";
import { Container, EmptyState, Input, Spinner } from "@/components/ui";
import { StatusBadge } from "@/components/StatusBadge";
import { SummaryTable } from "@/components/SummaryTable";
import { FilterChips } from "@/components/FilterChips";
import { PendingBadge } from "@/components/PendingBadge";

type PaymentFilter = "all" | PaymentStatus;
type KindFilter = "all" | "artwork" | "copyright";

const PAYMENT_FILTERS: PaymentFilter[] = ["all", "unpaid", "submitted", "confirmed", "rejected"];
const KIND_FILTERS: KindFilter[] = ["all", "artwork", "copyright"];

/** อ่านค่าตัวกรองจาก URL — ค่าแปลกปลอมให้ตกเป็น "ทั้งหมด" */
function parseStatus(raw: string | null): PaymentFilter {
  return PAYMENT_FILTERS.includes(raw as PaymentFilter) ? (raw as PaymentFilter) : "all";
}

function parseKind(raw: string | null): KindFilter {
  return KIND_FILTERS.includes(raw as KindFilter) ? (raw as KindFilter) : "all";
}

/**
 * แถวเดียวของตาราง ไม่ว่าจะเป็นการโอนค่าชิ้นงานหรือค่าลิขสิทธิ์
 *
 * แปลงเป็นรูปแบบกลางตั้งแต่ตอนโหลด แทนที่จะเช็ค kind กระจายทั่วทั้งไฟล์
 * — ตัวกรอง การค้นหา และการนับยอด จะได้ทำงานกับข้อมูลชุดเดียว
 * ไม่งั้นเพิ่มประเภทที่สามทีหลังต้องไล่แก้ทุกจุดที่ลืมไม่ได้เลย
 */
type Row = {
  key: string;
  kind: "artwork" | "copyright";
  kindLabel: string;
  id: string;
  /** เลขอ้างอิงที่แอดมินใช้คุยกับผู้ใช้ — คำสั่งซื้อ หรือ สัญญาลิขสิทธิ์ */
  refLabel: string;
  date: string;
  buyerName: string;
  sellerName: string;
  amount: number;
  status: PaymentStatus;
  href: string;
  /** ผู้ขายที่ส่งของสำเร็จครบแล้ว รอผู้ดูแลระบบโอนเงินให้ (เฉพาะค่าชิ้นงาน) */
  payoutReady: number;
  /** โอนให้ผู้ขายครบทุกคนแล้ว */
  payoutDone: boolean;
  /** ใช้ค้นหา */
  searchable: string[];
};

/** เรียงตามลำดับที่ Admin ต้องสนใจก่อนหลัง */
const STATUS_ROWS: { status: PaymentStatus; label: string; chip: string; highlight?: boolean }[] = [
  { status: "submitted", label: "รอตรวจสอบ", chip: "รอตรวจสอบ", highlight: true },
  { status: "confirmed", label: "ยืนยันการโอนเงินแล้ว", chip: "ยืนยันแล้ว" },
  { status: "rejected", label: "ปฏิเสธการโอนเงิน", chip: "ปฏิเสธ" },
  { status: "unpaid", label: "ยังไม่ชำระเงิน", chip: "ยังไม่ชำระ" },
];

const KIND_CHIPS: { value: KindFilter; label: string }[] = [
  { value: "all", label: "ทุกประเภท" },
  { value: "artwork", label: "ค่าชิ้นงาน" },
  { value: "copyright", label: "ค่าลิขสิทธิ์" },
];

function formatDate(iso?: string) {
  if (!iso) return "—";
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? "—" : d.toLocaleDateString("th-TH");
}

function AdminPaymentsContent() {
  const [rows, setRows] = useState<Row[] | null>(null);
  const [keyword, setKeyword] = useState("");

  /*
    สถานะและประเภทเก็บไว้ที่ URL (?status=submitted&kind=artwork)
    ลิงก์จากแดชบอร์ดจึงพาเข้ามาที่กลุ่มที่กดได้ตรงๆ และปุ่มย้อนกลับของเบราว์เซอร์ทำงานถูก
  */
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const filter = parseStatus(searchParams.get("status"));
  const kind = parseKind(searchParams.get("kind"));

  const pushQuery = useCallback(
    (nextStatus: PaymentFilter, nextKind: KindFilter) => {
      const params = new URLSearchParams();
      if (nextStatus !== "all") params.set("status", nextStatus);
      if (nextKind !== "all") params.set("kind", nextKind);
      const qs = params.toString();
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    },
    [pathname, router]
  );

  const setFilter = useCallback(
    (next: string) => pushQuery(parseStatus(next), kind),
    [pushQuery, kind]
  );
  const setKind = useCallback(
    (next: string) => pushQuery(filter, parseKind(next)),
    [pushQuery, filter]
  );

  useEffect(() => {
    Promise.all([listPayments(), listCopyrightPayments()]).then(([orders, copyrights]) => {
      setRows([
        ...orders.map<Row>((p) => ({
          key: `artwork-${p.id}`,
          kind: "artwork",
          kindLabel: "ค่าชิ้นงาน",
          id: p.id,
          refLabel: `คำสั่งซื้อ #${p.orderId}`,
          date: p.createdAt,
          buyerName: p.buyerName,
          sellerName: p.sellerName,
          amount: p.grandTotal,
          status: p.status,
          href: `/admin/payments/${p.id}`,
          payoutReady: p.payoutReadyCount ?? 0,
          payoutDone:
            (p.payoutSellerCount ?? 0) > 0 && p.payoutPaidCount === p.payoutSellerCount,
          searchable: [p.buyerName, p.sellerName, `#${p.id}`, `#${p.orderId}`, p.id, p.orderId],
        })),
        ...copyrights.map<Row>((p) => ({
          key: `copyright-${p.id}`,
          kind: "copyright",
          kindLabel: "ค่าลิขสิทธิ์",
          id: p.id,
          refLabel: `สัญญา #${p.copyrightId}`,
          date: p.paymentDate,
          buyerName: p.buyerName,
          sellerName: p.sellerName,
          amount: p.amount,
          status: p.status,
          href: `/admin/copyright-payments/${p.id}`,
          payoutReady: 0,
          payoutDone: false,
          searchable: [
            p.buyerName,
            p.sellerName,
            p.artworkName,
            `#${p.id}`,
            `#${p.copyrightId}`,
            p.id,
            p.copyrightId,
          ],
        })),
      ]);
    });
  }, []);

  const all = useMemo(() => rows ?? [], [rows]);

  // ตัวกรองประเภทมาก่อนทุกอย่าง เพื่อให้ยอดสรุปและตัวเลขบนชิปตรงกับที่เห็นในตาราง
  const inScope = useMemo(
    () => (kind === "all" ? all : all.filter((r) => r.kind === kind)),
    [all, kind]
  );

  /** เรียงรายการใหม่ล่าสุดไว้บนสุด แล้วเทียบด้วยรหัสเป็นตัวตัดสินรอง */
  const sorted = useMemo(
    () =>
      [...inScope].sort((a, b) => {
        const diff = new Date(b.date).getTime() - new Date(a.date).getTime();
        if (!Number.isNaN(diff) && diff !== 0) return diff;
        return Number(b.id) - Number(a.id);
      }),
    [inScope]
  );

  const visible = useMemo(() => {
    const kw = keyword.trim().toLowerCase();
    return sorted.filter((r) => {
      if (filter !== "all" && r.status !== filter) return false;
      if (!kw) return true;
      return r.searchable.filter(Boolean).some((v) => String(v).toLowerCase().includes(kw));
    });
  }, [sorted, filter, keyword]);

  const groups = STATUS_ROWS.map((row) => ({
    ...row,
    items: inScope.filter((r) => r.status === row.status),
  }));

  const summary = groups.map((g) => ({
    label: g.label,
    count: g.items.length,
    amount: g.items.reduce((s, r) => s + r.amount, 0),
    highlight: g.highlight,
    filterValue: g.status,
  }));

  const statusChips = [
    { value: "all", label: "ทั้งหมด", count: inScope.length },
    ...groups.map((g) => ({ value: g.status, label: g.chip, count: g.items.length })),
  ];

  const kindChips = KIND_CHIPS.map((k) => ({
    ...k,
    count: k.value === "all" ? all.length : all.filter((r) => r.kind === k.value).length,
  }));

  const activeLabel = STATUS_ROWS.find((r) => r.status === filter)?.label;
  const activeKindLabel = kind === "all" ? null : KIND_CHIPS.find((k) => k.value === kind)?.label;

  return (
    <Container className="py-10">
      <div className="mb-6 flex flex-wrap items-center gap-3">
        <h1 className="font-serif text-2xl font-bold text-stone-900">รายการโอนเงินให้ผู้ขาย</h1>
        <PendingBadge
          count={all.reduce((n, r) => n + r.payoutReady, 0)}
          label="รอโอนเงินให้ผู้ขาย"
        />
      </div>

      {rows === null ? (
        <Spinner />
      ) : all.length === 0 ? (
        <EmptyState
          title="ยังไม่มีรายการการโอนเงิน"
          description="รายการจะปรากฏเมื่อผู้ซื้อชำระเงินและแนบหลักฐาน"
        />
      ) : (
        <>
          <div className="mb-4">
            <FilterChips
              options={kindChips}
              value={kind}
              onChange={(v) => setKind(v as KindFilter)}
            />
          </div>

          <SummaryTable
            title={`สรุปการโอนเงิน${activeKindLabel ? ` · ${activeKindLabel}` : ""}`}
            rows={summary}
            totalLabel="รวมทุกสถานะ"
            activeFilter={filter}
            onFilterSelect={(v) => setFilter(v as PaymentFilter)}
          />

          <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <FilterChips
              options={statusChips}
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
            แสดง {visible.length} จาก {inScope.length} รายการ
            {activeKindLabel && ` · ${activeKindLabel}`}
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
                    <th className="px-4 py-3">ประเภท</th>
                    <th className="px-4 py-3">อ้างอิง</th>
                    <th className="px-4 py-3">วันที่</th>
                    <th className="px-4 py-3">ผู้ซื้อ</th>
                    <th className="px-4 py-3">ผู้ขาย</th>
                    <th className="px-4 py-3 text-right">ยอดสุทธิ</th>
                    <th className="px-4 py-3">สถานะ</th>
                    <th className="px-4 py-3" />
                  </tr>
                </thead>
                <tbody>
                  {visible.map((r) => (
                    <tr key={r.key} className="border-t border-stone-100 hover:bg-stone-50">
                      <td className="px-4 py-3 text-stone-600">#{r.id}</td>
                      <td className="px-4 py-3">
                        <span
                          className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                            r.kind === "copyright"
                              ? "bg-indigo-50 text-indigo-700"
                              : "bg-stone-100 text-stone-600"
                          }`}
                        >
                          {r.kindLabel}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-stone-600">{r.refLabel}</td>
                      <td className="px-4 py-3 text-stone-600">{formatDate(r.date)}</td>
                      <td className="px-4 py-3 font-medium text-stone-900">{r.buyerName || "—"}</td>
                      <td className="px-4 py-3 text-stone-600">{r.sellerName || "—"}</td>
                      <td className="px-4 py-3 text-right font-medium text-stone-900">
                        {r.amount.toLocaleString()} บาท
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-col items-start gap-1">
                          <StatusBadge status={r.status} domain="payment" />
                          {r.payoutReady > 0 && (
                            <span className="rounded-full bg-rose-50 px-2 py-0.5 text-xs font-medium text-rose-700">
                              รอโอนเงินให้ผู้ขาย {r.payoutReady} ราย
                            </span>
                          )}
                          {r.payoutDone && (
                            <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700">
                              โอนให้ผู้ขายแล้ว
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Link
                          href={r.href}
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
      {/* useSearchParams ต้องอยู่ใต้ Suspense ตามข้อกำหนดของ Next.js App Router */}
      <Suspense fallback={<Spinner />}>
        <AdminPaymentsContent />
      </Suspense>
    </RequireAdmin>
  );
}
