import type { SyntheticEvent } from "react";

/**
 * props ที่ใส่ให้ <img> / next/image ของรูปผลงาน เพื่อกันการบันทึกรูปแบบง่าย ๆ
 *   - คลิกขวาไม่ขึ้นเมนู (ไม่มี "บันทึกรูปภาพเป็น..." / "คัดลอกรูปภาพ")
 *   - ลากรูปออกไปวางบนเดสก์ท็อปหรือแท็บใหม่ไม่ได้
 *   - กดค้างบนมือถือไม่ขึ้นเมนูบันทึกรูป (-webkit-touch-callout) และไม่เลือกรูปเป็นข้อความ
 *
 * นี่เป็นแค่ด่านแรกสำหรับผู้ใช้ทั่วไป คนที่ตั้งใจจริงยังแคปหน้าจอหรือเปิด DevTools ได้
 * การป้องกันจริงอยู่ที่ backend: รูปที่ส่งมาถึงเบราว์เซอร์ของคนที่ไม่ใช่เจ้าของงาน
 * เป็นภาพตัวอย่างที่ฝังลายน้ำไว้ในตัวไฟล์แล้ว (ดู image/Watermark.java) — ได้ไปก็มีลายน้ำ
 */
const block = (e: SyntheticEvent) => e.preventDefault();

export const protectedImageProps = {
  onContextMenu: block,
  onDragStart: block,
  draggable: false,
} as const;

/** ใส่คู่กับ protectedImageProps — Tailwind arbitrary property สำหรับ iOS Safari */
export const PROTECTED_IMAGE_CLASS = "select-none [-webkit-touch-callout:none]";
