/**
 * แปลงจำนวนเงินเป็นตัวหนังสือไทย เช่น 135013 -> "หนึ่งแสนสามหมื่นห้าพันสิบสามบาทถ้วน"
 *
 * ใบเสนอราคาของไทยต้องมีบรรทัดนี้เสมอ — เป็นกันการแก้ตัวเลขในเอกสารทีหลัง
 * ตัวเลขอย่างเดียวเติมหลักได้ง่าย แต่ตัวหนังสือแก้ไม่เนียน
 *
 * กฎภาษาไทยที่โค้ดนี้ต้องทำให้ถูก (คนมักพลาดสามข้อนี้):
 *   1. หลักสิบที่เป็น 1 อ่าน "สิบ" ไม่ใช่ "หนึ่งสิบ"   -> 10 = สิบ
 *   2. หลักสิบที่เป็น 2 อ่าน "ยี่สิบ" ไม่ใช่ "สองสิบ"  -> 20 = ยี่สิบ
 *   3. หลักหน่วยที่เป็น 1 และมีหลักอื่นนำหน้า อ่าน "เอ็ด" -> 21 = ยี่สิบเอ็ด
 * และตัวเลขเกินล้านอ่านเป็นชุดละ 6 หลักต่อกันด้วยคำว่า "ล้าน" -> 12,000,000 = สิบสองล้าน
 */

const DIGITS = ["", "หนึ่ง", "สอง", "สาม", "สี่", "ห้า", "หก", "เจ็ด", "แปด", "เก้า"];
const PLACES = ["", "สิบ", "ร้อย", "พัน", "หมื่น", "แสน"];

/** อ่านจำนวนเต็มไม่เกิน 6 หลัก (0–999,999) — ศูนย์คืนค่าว่าง ให้ผู้เรียกจัดการเอง */
function readGroup(n: number): string {
  let out = "";
  const s = String(n);
  const len = s.length;

  for (let i = 0; i < len; i++) {
    const digit = Number(s[i]);
    if (digit === 0) continue;

    const place = len - i - 1; // 0 = หลักหน่วย
    if (place === 1 && digit === 1) {
      out += PLACES[1]; // สิบ ไม่ใช่ หนึ่งสิบ
    } else if (place === 1 && digit === 2) {
      out += "ยี่" + PLACES[1];
    } else if (place === 0 && digit === 1 && len > 1) {
      out += "เอ็ด"; // หนึ่งท้ายสุดที่มีหลักอื่นนำหน้า
    } else {
      out += DIGITS[digit] + PLACES[place];
    }
  }
  return out;
}

/** อ่านจำนวนเต็มทุกขนาด โดยตัดเป็นชุดละ 6 หลักแล้วต่อด้วยคำว่า "ล้าน" */
function readInteger(n: number): string {
  if (n === 0) return "ศูนย์";

  const groups: number[] = [];
  let rest = n;
  while (rest > 0) {
    groups.unshift(rest % 1_000_000);
    rest = Math.floor(rest / 1_000_000);
  }

  return groups
    .map((g, i) => {
      const isLast = i === groups.length - 1;
      /*
       * ชุดกลางที่เป็นศูนย์ล้วน (เช่น 1,000,000,000,000) ต้องไม่หายไปเฉย ๆ
       * ไม่งั้นจะอ่านว่า "หนึ่งล้าน" ทั้งที่เป็นล้านล้าน — ใส่คำว่าล้านไว้ตามจำนวนชุด
       */
      const text = g === 0 ? "" : readGroup(g);
      return isLast ? text : text + "ล้าน";
    })
    .join("");
}

/**
 * แปลงเป็นข้อความเต็ม "...บาทถ้วน" หรือ "...บาท...สตางค์"
 *
 * ปัดเศษที่ทศนิยม 2 ตำแหน่งก่อนเสมอ เพราะเลขทศนิยมของ JavaScript
 * ทำให้ 0.615 * 100 ได้ 61.49999 ถ้าไม่ปัดก่อนจะอ่านสตางค์ขาดไปหนึ่ง
 */
export function bahtText(amount: number): string {
  if (!Number.isFinite(amount)) return "";

  const negative = amount < 0;
  const rounded = Math.round(Math.abs(amount) * 100) / 100;
  const baht = Math.floor(rounded);
  const satang = Math.round((rounded - baht) * 100);

  let text = readInteger(baht) + "บาท";
  text += satang === 0 ? "ถ้วน" : readInteger(satang) + "สตางค์";

  return negative ? "ลบ" + text : text;
}
