import { Artwork } from "@/types";

/** ตัดทศนิยมที่ไม่จำเป็นออก 60.0 -> "60", 42.5 -> "42.5" */
function cm(n: number): string {
  return String(Number(n.toFixed(2)));
}

/**
 * ขนาดงานศิลปะในรูปแบบ "กว้าง x ยาว ซม."
 *
 * DB เก็บมิติแยกเป็น width / length / height ตาม SRS (Size = Height x Width x Depth)
 * ด้านหน้าของชิ้นงานที่คนทั่วไปเรียกว่า "กว้าง x ยาว" จึงเป็น width x height
 * ส่วน length คือความหนา (ภาพวาดบนผ้าใบมีค่านี้แค่ 3-6 ซม.) ไม่นำมาแสดง
 *
 * width บังคับกรอกแล้วตั้งแต่ชั้น backend งานที่ไม่มีค่าจึงมีได้เฉพาะข้อมูลเก่า
 * ก่อนบังคับ — แสดง "—" ไปตรง ๆ ดีกว่าเดาตัวเลขให้ผู้ใช้
 */
export function formatArtworkSize(artwork: Artwork): string {
  const { width, height } = artwork;
  if (width && height) return `${cm(width)} x ${cm(height)} ซม.`;
  if (width) return `${cm(width)} ซม.`;
  return "—";
}

/**
 * ตัวคูณราคาลิขสิทธิ์ ต้องตรงกับ COPYRIGHT_PRICE_MULTIPLIER ใน ArtworkService.java
 *
 * ฝั่งนี้ใช้แค่ "แสดงตัวอย่าง" ให้ผู้ขายเห็นทันทีที่พิมพ์ราคา
 * ค่าที่บันทึกจริงคำนวณจาก backend เสมอ frontend ไม่ได้ส่งตัวเลขนี้ไป
 */
export const COPYRIGHT_PRICE_MULTIPLIER = 3;

/** ราคาลิขสิทธิ์ที่ระบบจะคำนวณให้ จากราคาขาย */
export function calcCopyrightPrice(price: number | undefined): number {
  if (!price || !Number.isFinite(price) || price <= 0) return 0;
  return Math.round(price * COPYRIGHT_PRICE_MULTIPLIER * 100) / 100;
}
