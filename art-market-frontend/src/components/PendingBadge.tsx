/**
 * ป้ายแจ้งเตือนจำนวนรายการที่รอดำเนินการ
 *
 * ซ่อนตัวเองเมื่อ count เป็น 0 — ป้ายที่ขึ้นเลข 0 ค้างไว้ทำให้คนอ่านชินตา
 * แล้วเลิกสังเกตตอนมีของจริงเข้ามา
 */
export function PendingBadge({
  count,
  label = "รอดำเนินการ",
  className = "",
}: {
  count: number;
  label?: string;
  className?: string;
}) {
  if (!count) return null;
  return (
    <span
      className={`inline-flex min-w-[1.25rem] items-center justify-center rounded-full bg-rose-600 px-1.5 text-xs font-semibold leading-5 text-white ${className}`}
      title={`${label} ${count} รายการ`}
      aria-label={`${label} ${count} รายการ`}
    >
      {count > 99 ? "99+" : count}
    </span>
  );
}
