/**
 * ตัวกรอง "เดือน / ปี" ของหน้ารายการคำสั่งซื้อและรายการโอนเงิน
 *
 * ปีเก็บเป็น พ.ศ. ทั้งใน URL (?year=2569&month=9) และบนหน้าจอ ผู้ใช้จะได้เห็นเลขเดียวกัน
 * ทุกที่ ไม่ต้องแปลงในหัว — แปลงเป็น ค.ศ. เฉพาะตอนเทียบกับวันที่จริงเท่านั้น
 *
 * เดือนต้องเลือกคู่กับปีเสมอ ("กันยายน" เฉย ๆ โดยไม่บอกปี จะรวมกันยายนของทุกปี
 * ซึ่งไม่มีใครต้องการจริง และทำให้ยอดสรุปอ่านผิดได้ง่าย)
 */

export interface Period {
  /** ปี พ.ศ. — null = ทุกปี */
  year: number | null;
  /** 1–12 — null = ทั้งปี */
  month: number | null;
}

export const ALL_TIME: Period = { year: null, month: null };

export const THAI_MONTHS = [
  "มกราคม",
  "กุมภาพันธ์",
  "มีนาคม",
  "เมษายน",
  "พฤษภาคม",
  "มิถุนายน",
  "กรกฎาคม",
  "สิงหาคม",
  "กันยายน",
  "ตุลาคม",
  "พฤศจิกายน",
  "ธันวาคม",
];

const BE_OFFSET = 543;

/** ปี พ.ศ. ของวันที่ — null ถ้าวันที่อ่านไม่ได้ */
export function buddhistYearOf(iso?: string | null): number | null {
  if (!iso) return null;
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? null : d.getFullYear() + BE_OFFSET;
}

/**
 * อ่านช่วงเวลาจาก URL — ค่าแปลกปลอมให้ตกเป็น "ทุกช่วงเวลา"
 * เดือนที่มาโดยไม่มีปีถูกทิ้ง ด้วยเหตุผลเดียวกับที่หน้าจอไม่ให้เลือกเดือนก่อนปี
 */
export function parsePeriod(params: { get(name: string): string | null }): Period {
  const y = Number(params.get("year"));
  const m = Number(params.get("month"));
  const year = Number.isInteger(y) && y >= 2500 && y <= 2700 ? y : null;
  const month = year !== null && Number.isInteger(m) && m >= 1 && m <= 12 ? m : null;
  return { year, month };
}

export function isAllTime(p: Period): boolean {
  return p.year === null;
}

/**
 * วันที่นี้อยู่ในช่วงที่เลือกไหม
 *
 * ใช้เวลาท้องถิ่นของเบราว์เซอร์ (getMonth) — ตรงกับที่ toLocaleDateString แสดงบนหน้าจอ
 * รายการที่โชว์ว่า "30/9/2569" จึงอยู่ในเดือนกันยายนเสมอ ไม่เลื่อนไปตุลาคมเพราะโซนเวลา
 */
export function inPeriod(iso: string | undefined | null, p: Period): boolean {
  if (p.year === null) return true;
  if (!iso) return false;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return false;
  if (d.getFullYear() + BE_OFFSET !== p.year) return false;
  return p.month === null || d.getMonth() + 1 === p.month;
}

/** ปี พ.ศ. ที่มีข้อมูลจริง ใหม่ไปเก่า — ไม่มีปีว่าง ๆ ให้เลือกแล้วเจอหน้าเปล่า */
export function yearsOf(dates: (string | undefined | null)[], keep?: number | null): number[] {
  const set = new Set<number>();
  for (const iso of dates) {
    const y = buddhistYearOf(iso);
    if (y !== null) set.add(y);
  }
  // ปีที่มาจาก URL ต้องอยู่ในรายการเสมอ ไม่งั้น <select> จะแสดงค่าที่ไม่มีอยู่จริง
  if (keep) set.add(keep);
  return [...set].sort((a, b) => b - a);
}

/** ข้อความสั้นของช่วงที่เลือก เช่น "กันยายน 2569" / "ปี 2569" — null ถ้าทุกช่วงเวลา */
export function periodLabel(p: Period): string | null {
  if (p.year === null) return null;
  return p.month === null ? `ปี ${p.year}` : `${THAI_MONTHS[p.month - 1]} ${p.year}`;
}

/** ค่าที่จะเขียนกลับลง URL */
export function periodQuery(p: Period): Record<string, string | null> {
  return {
    year: p.year === null ? null : String(p.year),
    month: p.year === null || p.month === null ? null : String(p.month),
  };
}
