"use client";

import { Card } from "./ui";

export interface SummaryRow {
  /** ป้ายชื่อของแถว เช่น "รอตรวจสอบ" */
  label: string;
  count: number;
  /** ยอดเงินของแถวนี้ — ไม่ใส่ = ตารางนี้ไม่มีคอลัมน์เงิน */
  amount?: number;
  /** ไฮไลต์แถวที่ต้องดำเนินการ เพื่อให้ Admin เห็นก่อนเพื่อน */
  highlight?: boolean;
  /** ค่าตัวกรองที่ผูกกับแถวนี้ — ใส่แล้วคลิกแถวเพื่อกรองรายการด้านล่างได้เลย */
  filterValue?: string;
}

/**
 * ตารางสรุปด้านบนหน้ารายการของ Admin
 *
 * แยกเป็นคอมโพเนนต์เดียวใช้ทั้งหน้าผู้ใช้งานและหน้าการโอนเงิน เพื่อให้สองหน้า
 * นับเลขและจัดรูปแบบเหมือนกัน (เดิมแต่ละหน้าคำนวณเองย่อมเพี้ยนกันได้ง่าย)
 *
 * ตัวเลขในตารางนี้นับจากข้อมูล "ทั้งหมด" เสมอ ไม่ใช่เฉพาะที่ผ่านตัวกรอง —
 * ตารางสรุปที่เปลี่ยนตามตัวกรองจะใช้เป็นภาพรวมไม่ได้
 *
 * แถว "รวมทั้งหมด" คำนวณจาก rows ที่ส่งเข้ามาเสมอ ไม่ให้ผู้เรียกส่งมาเอง
 * เลขรวมจึงตรงกับผลบวกของแถวย่อยแน่นอน
 */
export function SummaryTable({
  title,
  rows,
  totalLabel = "รวมทั้งหมด",
  activeFilter,
  onFilterSelect,
  allFilterValue = "all",
}: {
  title: string;
  rows: SummaryRow[];
  totalLabel?: string;
  /** ค่าตัวกรองที่เลือกอยู่ ใช้ไฮไลต์แถวที่ตรงกัน */
  activeFilter?: string;
  /** ใส่มาแล้วแถวจะคลิกได้ (แถวรวม = ล้างตัวกรอง) */
  onFilterSelect?: (value: string) => void;
  allFilterValue?: string;
}) {
  const hasAmount = rows.some((r) => r.amount !== undefined);
  const totalCount = rows.reduce((s, r) => s + r.count, 0);
  const totalAmount = rows.reduce((s, r) => s + (r.amount ?? 0), 0);
  const clickable = !!onFilterSelect;

  /**
   * แถวคลิกได้เป็นแค่ "ทางลัด" ของปุ่มกรองที่อยู่ใต้ตาราง
   *
   * ตั้งใจไม่ใส่ role="button" ให้ <tr> เพราะจะกลายเป็นปุ่มที่ชื่อซ้อนกับปุ่มจริง
   * ในหน้า (เช่น "อนุมัติ") ทำให้ตัวอ่านหน้าจอและเทสอัตโนมัติแยกไม่ออกว่าอันไหนคือปุ่มสั่งงาน
   * ส่วนการใช้งานด้วยคีย์บอร์ดมีปุ่มชิปด้านล่างรองรับอยู่แล้ว
   */
  function rowProps(filterValue?: string) {
    if (!clickable || filterValue === undefined) return {};
    return {
      onClick: () => onFilterSelect!(filterValue),
      title: "คลิกเพื่อกรองรายการด้านล่าง",
      className: "cursor-pointer",
    };
  }

  return (
    <Card className="mb-6 overflow-hidden">
      <div className="flex flex-wrap items-center gap-2 border-b border-stone-200 bg-stone-50 px-4 py-3">
        <h2 className="font-serif text-base font-bold text-stone-900">{title}</h2>
        {clickable && (
          <span className="text-xs text-stone-500">— คลิกแถวเพื่อกรองรายการด้านล่าง</span>
        )}
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="text-stone-500">
            <tr>
              <th className="px-4 py-2 font-medium">รายการ</th>
              <th className="px-4 py-2 text-right font-medium">จำนวน</th>
              {hasAmount && <th className="px-4 py-2 text-right font-medium">ยอดเงินรวม</th>}
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => {
              const props = rowProps(r.filterValue);
              const selected = activeFilter !== undefined && r.filterValue === activeFilter;
              return (
                <tr
                  key={r.label}
                  {...props}
                  className={`border-t border-stone-100 ${props.className ?? ""} ${
                    selected
                      ? "bg-stone-900/5 ring-1 ring-inset ring-stone-900"
                      : r.highlight && r.count > 0
                        ? "bg-amber-50"
                        : clickable
                          ? "hover:bg-stone-50"
                          : ""
                  }`}
                >
                  <td className="px-4 py-2 text-stone-700">{r.label}</td>
                  <td className="px-4 py-2 text-right font-medium text-stone-900">{r.count}</td>
                  {hasAmount && (
                    <td className="px-4 py-2 text-right text-stone-700">
                      {r.amount === undefined ? "—" : `฿${r.amount.toLocaleString()}`}
                    </td>
                  )}
                </tr>
              );
            })}
            <tr
              {...rowProps(clickable ? allFilterValue : undefined)}
              className={`border-t border-stone-200 bg-stone-50 font-semibold text-stone-900 ${
                activeFilter === allFilterValue ? "ring-1 ring-inset ring-stone-900" : ""
              } ${clickable ? "cursor-pointer hover:bg-stone-100" : ""}`}
            >
              <td className="px-4 py-2">{totalLabel}</td>
              <td className="px-4 py-2 text-right">{totalCount}</td>
              {hasAmount && (
                <td className="px-4 py-2 text-right">฿{totalAmount.toLocaleString()}</td>
              )}
            </tr>
          </tbody>
        </table>
      </div>
    </Card>
  );
}
