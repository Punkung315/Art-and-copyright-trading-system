"use client";

import { useCallback, useEffect, useRef } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

/**
 * อ่าน/เขียนตัวกรองที่เก็บไว้ใน URL แบบ "แก้เฉพาะคีย์ที่ส่งมา"
 *
 * ของเดิมแต่ละหน้าสร้าง query ใหม่ทั้งก้อนทุกครั้งที่กดตัวกรอง พอมีตัวกรองเดือน/ปีเพิ่มมา
 * การกดชิปสถานะจะลบเดือน/ปีที่เลือกไว้ทิ้งไปด้วย — ตัวนี้รวมกับค่าเดิมแทน
 * ค่า null หรือ "" = ลบคีย์นั้นออกจาก URL
 */
export function useUrlQuery() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  /*
    query ที่เพิ่งสั่งเขียนไปแต่ URL ยังไม่อัปเดต

    router.replace ของ Next ทำงานแบบ transition — URL กับ searchParams เปลี่ยนหลัง render
    รอบถัดไป ถ้ากดตัวกรองสองอันติดกันเร็ว ๆ (ชิปประเภทแล้วต่อด้วยชิปสถานะ) ตัวที่สอง
    จะยังเห็นค่าเก่าแล้วเขียนทับสิ่งที่ตัวแรกเพิ่งเปลี่ยน — เจอจากชุดทดสอบ:
    กด "ทุกประเภท" แล้ว "ยืนยันแล้ว" ทันที ประเภทเด้งกลับเป็น "ค่าลิขสิทธิ์"
    เก็บค่าที่เพิ่งเขียนไว้ใน ref แล้วต่อยอดจากค่านั้นจนกว่า URL จริงจะตามทัน
  */
  const pending = useRef<string | null>(null);
  useEffect(() => {
    pending.current = null;
  }, [searchParams]);

  const update = useCallback(
    (patch: Record<string, string | null>) => {
      const params = new URLSearchParams(pending.current ?? searchParams.toString());
      for (const [key, value] of Object.entries(patch)) {
        if (value === null || value === "") params.delete(key);
        else params.set(key, value);
      }
      const qs = params.toString();
      pending.current = qs;
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    },
    [pathname, router, searchParams]
  );

  return { searchParams, update };
}
