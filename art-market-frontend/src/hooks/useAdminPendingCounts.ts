"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { listPayments, listUsers } from "@/lib/api";

export interface AdminPendingCounts {
  /** คำร้องขอเป็นผู้ขายที่ยังไม่ได้พิจารณา */
  sellers: number;
  /** การโอนเงินที่ผู้ซื้ออัปสลิปแล้วแต่ยังไม่ได้ตรวจ */
  payments: number;
}

/**
 * จำนวนรายการที่รอผู้ดูแลระบบดำเนินการ — ใช้กับ badge บนเมนูด้านบน
 *
 * ดึงใหม่ทุกครั้งที่เปลี่ยนหน้า เพราะหลังกดอนุมัติ/ปฏิเสธแล้วผู้ใช้จะกดกลับไปหน้าอื่น
 * ถ้าไม่ดึงใหม่ badge จะค้างเลขเดิมและดูเหมือนระบบไม่บันทึกผล
 *
 * ไม่ยิง request เลยถ้ายังไม่ได้ login เป็น admin — endpoint เหล่านี้ตอบ 403 กับคนอื่น
 */
export function useAdminPendingCounts(): AdminPendingCounts {
  const { admin } = useAuth();
  const pathname = usePathname();
  const [counts, setCounts] = useState<AdminPendingCounts>({ sellers: 0, payments: 0 });

  useEffect(() => {
    if (!admin) {
      setCounts({ sellers: 0, payments: 0 });
      return;
    }
    let cancelled = false;
    Promise.all([listUsers(), listPayments()]).then(([users, payments]) => {
      if (cancelled) return;
      setCounts({
        sellers: users.filter((u) => u.sellerStatus === "pending").length,
        payments: payments.filter((p) => p.status === "submitted").length,
      });
    });
    return () => {
      cancelled = true;
    };
  }, [admin, pathname]);

  return counts;
}
