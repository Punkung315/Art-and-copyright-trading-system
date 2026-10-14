"use client";

import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import { RequireSeller } from "@/components/RoleGuard";
import { useAuth } from "@/context/AuthContext";
import { listOrdersBySeller } from "@/lib/api";
import { Order } from "@/types";
import { Container, EmptyState, Spinner } from "@/components/ui";
import { SummaryTable } from "@/components/SummaryTable";
import { FilterChips } from "@/components/FilterChips";
import { PendingBadge } from "@/components/PendingBadge";
import { MonthYearFilter } from "@/components/MonthYearFilter";
import { OrderStatusTable, sortOrdersNewestFirst } from "@/components/OrderStatusTable";
import { useUrlQuery } from "@/hooks/useUrlQuery";
import { Period, inPeriod, parsePeriod, periodLabel, periodQuery, yearsOf } from "@/lib/period";

type OrderFilter = "all" | "waiting" | "to_ship" | "done";

const ORDER_FILTERS: OrderFilter[] = ["all", "waiting", "to_ship", "done"];

/** อ่านตัวกรองจาก URL (?filter=) — ค่าแปลกปลอมให้ตกเป็น "ทั้งหมด" */
function parseFilter(raw: string | null): OrderFilter {
  return ORDER_FILTERS.includes(raw as OrderFilter) ? (raw as OrderFilter) : "all";
}

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

  /*
    ตัวกรองอยู่ที่ URL (?filter=waiting&year=2569&month=9) เพื่อให้การ์ดบนหน้าพื้นที่ผู้ขาย
    ลิงก์เข้ามาที่กลุ่มนั้นได้ตรงๆ และปุ่มย้อนกลับของเบราว์เซอร์ทำงานถูกต้อง
  */
  const { searchParams, update } = useUrlQuery();
  const filter = parseFilter(searchParams.get("filter"));
  const period = useMemo(() => parsePeriod(searchParams), [searchParams]);

  const setFilter = useCallback(
    (next: string) => {
      const value = parseFilter(next);
      update({ filter: value === "all" ? null : value });
    },
    [update]
  );
  const setPeriod = useCallback((p: Period) => update(periodQuery(p)), [update]);

  useEffect(() => {
    if (user) listOrdersBySeller(user.id).then(setOrders);
  }, [user]);

  const everything = useMemo(() => orders ?? [], [orders]);

  /*
    ช่วงเวลากรองก่อนทุกอย่าง ตารางสรุป ตัวเลขบนชิป และรายการด้านล่างจึงพูดถึง
    "เดือนที่เลือก" ชุดเดียวกัน — ไม่งั้นสรุปบอก 9 รายการแต่ข้างล่างโชว์ 2 จะชวนงง
  */
  const all = useMemo(
    () => everything.filter((o) => inPeriod(o.orderDate, period)),
    [everything, period]
  );
  const years = useMemo(
    () => yearsOf(everything.map((o) => o.orderDate), period.year),
    [everything, period.year]
  );
  const activePeriod = periodLabel(period);

  // คำสั่งซื้อใหม่ล่าสุดอยู่บนสุด
  const sorted = useMemo(() => sortOrdersNewestFirst(all), [all]);

  const visible = useMemo(
    () => (filter === "all" ? sorted : sorted.filter((o) => bucketOf(o) === filter)),
    [sorted, filter]
  );

  const group = (bucket: Exclude<OrderFilter, "all">) => all.filter((o) => bucketOf(o) === bucket);
  // งานค้างนับจากทุกช่วงเวลาเสมอ — กรองเดือนอยู่แล้วต้องไม่ทำให้ลืมของที่ค้างจากเดือนก่อน
  const waitingEverywhere = everything.filter((o) => bucketOf(o) === "waiting").length;

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
        <PendingBadge count={waitingEverywhere} label="รอยืนยันความพร้อม" />
      </div>

      {orders === null ? (
        <Spinner />
      ) : everything.length === 0 ? (
        <EmptyState
          title="ยังไม่มีรายการคำสั่งซื้อ"
          description="เมื่อมีผู้ซื้อสั่งซื้อผลงานของคุณ รายการจะปรากฏที่นี่"
        />
      ) : (
        <>
          <div className="mb-4">
            <MonthYearFilter years={years} value={period} onChange={setPeriod} />
          </div>

          <SummaryTable
            title={`สรุปคำสั่งซื้อ${activePeriod ? ` · ${activePeriod}` : ""}`}
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
            {activePeriod && ` · ${activePeriod}`}
            {filter !== "all" && ` · ${BUCKET_LABEL[filter]}`}
          </p>

          {visible.length === 0 ? (
            <EmptyState
              title={
                activePeriod && all.length === 0
                  ? `ไม่มีคำสั่งซื้อใน${activePeriod}`
                  : "ไม่พบคำสั่งซื้อที่ตรงกับเงื่อนไข"
              }
              description="ลองเปลี่ยนเดือน/ปี หรือตัวกรองสถานะ"
            />
          ) : (
            <OrderStatusTable
              orders={visible}
              meta={(order) => (
                <>
                  ผู้ซื้อ {order.buyerName} · {new Date(order.orderDate).toLocaleDateString("th-TH")} ·{" "}
                  {order.items.length} รายการ · {order.grandTotal.toLocaleString()} บาท
                </>
              )}
              shippingExtra={(order) =>
                order.sellerPayout?.paid ? (
                  <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-medium text-emerald-800">
                    ได้รับเงินแล้ว
                  </span>
                ) : null
              }
            />
          )}
        </>
      )}
    </Container>
  );
}

export default function SellerOrdersPage() {
  return (
    <RequireSeller>
      {/* useSearchParams ต้องอยู่ใต้ Suspense ตามข้อกำหนดของ Next.js App Router */}
      <Suspense fallback={<Spinner />}>
        <SellerOrdersContent />
      </Suspense>
    </RequireSeller>
  );
}
