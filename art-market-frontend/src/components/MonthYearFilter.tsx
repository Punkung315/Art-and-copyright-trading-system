"use client";

import { Period, THAI_MONTHS } from "@/lib/period";
import { Select } from "./ui";

/**
 * ตัวเลือกช่วงเวลา: ปี พ.ศ. + เดือน
 *
 * ใช้ <select> แทนชิปเพราะตัวเลือกมีถึง 12 เดือน — ชิปจะยาวเต็มบรรทัด
 * เดือนกดได้หลังเลือกปีแล้วเท่านั้น (ดูเหตุผลใน lib/period.ts)
 */
export function MonthYearFilter({
  years,
  value,
  onChange,
}: {
  /** ปี พ.ศ. ที่มีข้อมูล ใหม่ไปเก่า */
  years: number[];
  value: Period;
  onChange: (next: Period) => void;
}) {
  const active = value.year !== null;

  return (
    <div className="flex flex-wrap items-end gap-2" data-testid="period-filter">
      <label className="flex flex-col gap-1">
        <span className="text-xs font-medium text-stone-500">ปี</span>
        <Select
          aria-label="ปี"
          className="w-32 py-2"
          value={value.year ?? ""}
          onChange={(e) => {
            const y = e.target.value ? Number(e.target.value) : null;
            // เปลี่ยนปีแล้วคงเดือนไว้ — ดู "กันยายน" ของอีกปีเทียบกันได้ทันที
            onChange({ year: y, month: y === null ? null : value.month });
          }}
        >
          <option value="">ทุกปี</option>
          {years.map((y) => (
            <option key={y} value={y}>
              {y}
            </option>
          ))}
        </Select>
      </label>

      <label className="flex flex-col gap-1">
        <span className="text-xs font-medium text-stone-500">เดือน</span>
        <Select
          aria-label="เดือน"
          className="w-36 py-2 disabled:cursor-not-allowed disabled:bg-stone-100 disabled:text-stone-400"
          value={value.month ?? ""}
          disabled={!active}
          title={active ? undefined : "เลือกปีก่อน"}
          onChange={(e) =>
            onChange({ year: value.year, month: e.target.value ? Number(e.target.value) : null })
          }
        >
          <option value="">{active ? "ทั้งปี" : "เลือกปีก่อน"}</option>
          {THAI_MONTHS.map((name, i) => (
            <option key={name} value={i + 1}>
              {name}
            </option>
          ))}
        </Select>
      </label>

      {active && (
        <button
          type="button"
          onClick={() => onChange({ year: null, month: null })}
          className="mb-0.5 rounded-lg px-2 py-2 text-sm font-medium text-stone-500 underline hover:text-stone-900"
        >
          ดูทุกช่วงเวลา
        </button>
      )}
    </div>
  );
}
