"use client";

import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import { RequireUser } from "@/components/RoleGuard";
import { useAuth } from "@/context/AuthContext";
import { listOrdersByBuyer } from "@/lib/api";
import { Order } from "@/types";
import { Container, EmptyState, Spinner } from "@/components/ui";
import { MonthYearFilter } from "@/components/MonthYearFilter";
import { OrderStatusTable, sortOrdersNewestFirst } from "@/components/OrderStatusTable";
import { useUrlQuery } from "@/hooks/useUrlQuery";
import { Period, inPeriod, parsePeriod, periodLabel, periodQuery, yearsOf } from "@/lib/period";

function OrdersContent() {
  const { user } = useAuth();
  const [orders, setOrders] = useState<Order[] | null>(null);

  // เดือน/ปีอยู่ใน URL (?year=2569&month=9) กดเข้าคำสั่งซื้อแล้วย้อนกลับ ตัวกรองยังอยู่
  const { searchParams, update } = useUrlQuery();
  const period = useMemo(() => parsePeriod(searchParams), [searchParams]);
  const setPeriod = useCallback((p: Period) => update(periodQuery(p)), [update]);

  useEffect(() => {
    if (user) listOrdersByBuyer(user.id).then(setOrders);
  }, [user]);

  const everything = useMemo(() => orders ?? [], [orders]);
  const years = useMemo(
    () => yearsOf(everything.map((o) => o.orderDate), period.year),
    [everything, period.year]
  );
  // ของเดิมใช้ reverse() ซึ่งเชื่อลำดับจาก API — เรียงตามวันที่จริงแทน
  const visible = useMemo(
    () => sortOrdersNewestFirst(everything.filter((o) => inPeriod(o.orderDate, period))),
    [everything, period]
  );
  const activePeriod = periodLabel(period);

  return (
    <Container className="py-10">
      <h1 className="mb-6 font-serif text-2xl font-bold text-stone-900">คำสั่งซื้อของฉัน</h1>

      {orders === null ? (
        <Spinner />
      ) : everything.length === 0 ? (
        <EmptyState title="ยังไม่มีรายการคำสั่งซื้อ" description="เมื่อคุณยืนยันคำสั่งซื้อ รายการจะแสดงที่นี่" />
      ) : (
        <>
          <div className="mb-4">
            <MonthYearFilter years={years} value={period} onChange={setPeriod} />
          </div>

          <p className="mb-2 text-sm text-stone-500">
            แสดง {visible.length} จาก {everything.length} รายการ
            {activePeriod && ` · ${activePeriod}`}
          </p>

          {visible.length === 0 ? (
            <EmptyState
              title={`ไม่มีคำสั่งซื้อใน${activePeriod ?? "ช่วงเวลานี้"}`}
              description="ลองเลือกเดือนหรือปีอื่น"
            />
          ) : (
            <OrderStatusTable
              orders={visible}
              meta={(order) => (
                <>
                  ผู้ขาย {order.sellerName} · {new Date(order.orderDate).toLocaleDateString("th-TH")} ·{" "}
                  {order.items.length} รายการ · {order.grandTotal.toLocaleString()} บาท
                </>
              )}
            />
          )}
        </>
      )}
    </Container>
  );
}

export default function OrdersPage() {
  return (
    <RequireUser>
      {/* useSearchParams ต้องอยู่ใต้ Suspense ตามข้อกำหนดของ Next.js App Router */}
      <Suspense fallback={<Spinner />}>
        <OrdersContent />
      </Suspense>
    </RequireUser>
  );
}
