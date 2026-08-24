"use client";

export interface ChipOption {
  value: string;
  label: string;
  /** จำนวนรายการในกลุ่มนี้ — แสดงต่อท้ายป้ายเพื่อให้เห็นก่อนกดว่าจะเหลือกี่รายการ */
  count?: number;
}

/**
 * แถวปุ่มกรองแบบเลือกได้ทีละอัน
 *
 * ใช้ปุ่มแทน <select> เพราะตัวเลือกมีไม่กี่อัน การเห็นทุกตัวเลือกพร้อมจำนวน
 * ทำให้ตัดสินใจได้เร็วกว่าต้องกดเปิด dropdown ก่อนถึงจะรู้ว่ามีอะไรบ้าง
 */
export function FilterChips({
  options,
  value,
  onChange,
  label,
}: {
  options: ChipOption[];
  value: string;
  onChange: (value: string) => void;
  label?: string;
}) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      {label && <span className="text-sm text-stone-500">{label}</span>}
      {options.map((o) => {
        const active = o.value === value;
        return (
          <button
            key={o.value}
            type="button"
            onClick={() => onChange(o.value)}
            aria-pressed={active}
            className={`rounded-full border px-3 py-1.5 text-sm font-medium transition ${
              active
                ? "border-stone-900 bg-stone-900 text-white"
                : "border-stone-300 bg-white text-stone-600 hover:bg-stone-100"
            }`}
          >
            {o.label}
            {o.count !== undefined && (
              <span className={active ? "ml-1.5 text-stone-300" : "ml-1.5 text-stone-400"}>
                {o.count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
