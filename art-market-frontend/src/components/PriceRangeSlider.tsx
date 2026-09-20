"use client";

import { useEffect, useRef, useState } from "react";

/**
 * ตัวเลือกช่วงราคาแบบสไลเดอร์สองหัว + ช่องกรอกตัวเลข
 *
 * ทำไมไม่ใช้ radio ช่วงราคาสำเร็จรูปแบบเดิม:
 * ช่วงที่ hardcode ไว้ ("ต่ำกว่า ฿5,000", "฿5,000 - ฿10,000" ...) ไม่มีวันตรงกับ
 * ราคาจริงในระบบ ผู้ซื้อที่อยากได้งาน 6,000-7,000 ต้องเลือกช่วง 5,000-10,000
 * แล้วไปไล่ดูเอง สไลเดอร์ให้ระบุช่วงเองได้ตรงกว่า และขอบบน/ล่างมาจากราคาจริง
 * ที่มีอยู่ในฐานข้อมูล (endpoint facets) จึงไม่มีช่วงที่ไม่มีของอยู่เลย
 *
 * วิธีทำหัวจับสองหัว: ซ้อน <input type="range"> สองตัวทับกัน
 * ตัวราง (track) ปิด pointer-events ไว้ เปิดเฉพาะหัวจับ ทำให้กดโดนหัวที่ต้องการ
 * และยังเลื่อนด้วยคีย์บอร์ดได้ตามปกติ (สำคัญกับการเข้าถึง)
 */

/** ปัดขอบบนขึ้นเป็นเลขกลม ๆ เพื่อให้ตัวเลขใต้สไลเดอร์อ่านง่าย */
function roundCeiling(value: number): number {
  if (value <= 0) return 1000;
  const step = value >= 100000 ? 10000 : value >= 10000 ? 1000 : 100;
  return Math.ceil(value / step) * step;
}

export function PriceRangeSlider({
  floor,
  ceiling,
  min,
  max,
  onChange,
}: {
  /** ราคาต่ำสุดที่เลือกได้ */
  floor: number;
  /** ราคาสูงสุดที่เลือกได้ */
  ceiling: number;
  /** ค่าที่เลือกอยู่ — null = ยังไม่กรอง (ใช้ค่าสุดขอบแทน) */
  min: number | null;
  max: number | null;
  onChange: (next: { min: number | null; max: number | null }) => void;
}) {
  const top = Math.max(roundCeiling(ceiling), floor + 100);
  const lo = min ?? floor;
  const hi = max ?? top;

  /*
   * ช่องกรอกตัวเลขเก็บเป็น string แยกจากค่าจริง
   * ถ้าผูกกับตัวเลขตรง ๆ ผู้ใช้จะลบตัวเลขจนว่างไม่ได้เลย (กลายเป็น 0 ทันที)
   * และพิมพ์ "1" ระหว่างทางไป "1500" จะถูกตีความเป็นราคา 1 บาทไปแล้ว
   */
  const [fromText, setFromText] = useState(String(lo));
  const [toText, setToText] = useState(String(hi));

  /*
   * ช่องที่ผู้ใช้กำลังพิมพ์อยู่ห้ามถูกเขียนทับ
   *
   * การแก้ช่องหนึ่งทำให้หน้าแม่ค้นหาใหม่แล้ว re-render ลงมา ถ้า effect ด้านล่าง
   * เขียนค่าใหม่ลงทุกช่องโดยไม่ดู ค่าที่ผู้ใช้เพิ่งพิมพ์ในอีกช่องจะหายไปเงียบ ๆ
   * ก่อนจะทันกด Enter — เจอตอนกรอกสองช่องติดกันเร็ว ๆ
   */
  const focused = useRef<"from" | "to" | null>(null);

  useEffect(() => {
    if (focused.current !== "from") setFromText(String(min ?? floor));
    if (focused.current !== "to") setToText(String(max ?? top));
  }, [min, max, floor, top]);

  const span = Math.max(top - floor, 1);
  const pctLo = ((lo - floor) / span) * 100;
  const pctHi = ((hi - floor) / span) * 100;

  /*
   * ก้าวของสไลเดอร์ — แบ่งช่วงทั้งหมดเป็นราว 100 ขั้น
   * ถ้าปล่อยเป็นค่าเริ่มต้น (1 บาท) การกดลูกศรซ้าย/ขวาจะขยับทีละบาท
   * ผู้ใช้คีย์บอร์ดต้องกดหลายพันครั้งกว่าจะข้ามช่วงราคา 20,000 บาท
   */
  const step = Math.max(1, Math.round(span / 100));

  /** ส่งค่าออกไปโดยบังคับไม่ให้หัวสองข้างไขว้กัน */
  function commit(nextLo: number, nextHi: number) {
    const a = Math.min(Math.max(nextLo, floor), top);
    const b = Math.min(Math.max(nextHi, floor), top);
    const lowest = Math.min(a, b);
    const highest = Math.max(a, b);
    // ค่าที่เท่ากับขอบพอดี = ไม่ได้กรอง ส่ง null เพื่อไม่ให้ URL รกและนับเป็นตัวกรอง
    onChange({
      min: lowest <= floor ? null : lowest,
      max: highest >= top ? null : highest,
    });
  }

  /** อ่านตัวเลขจากช่องกรอก — คืน fallback ถ้าว่างหรือไม่ใช่ตัวเลข */
  function parseField(raw: string, fallback: number): number {
    const cleaned = raw.replace(/[^\d.]/g, "");
    if (cleaned.trim() === "") return fallback;
    const parsed = Number(cleaned);
    return Number.isFinite(parsed) ? parsed : fallback;
  }

  /**
   * ผู้ใช้พิมพ์ในช่อง From/To — ยอมรับเมื่อออกจากช่องหรือกด Enter
   *
   * อ่านค่าจากช่องกรอก "ทั้งสองช่อง" เสมอ ไม่ใช่เอาช่องที่เพิ่งแก้มารวมกับ prop เดิม
   * เพราะถ้าผู้ใช้กรอกสองช่องติดกันเร็ว ๆ prop ของช่องแรกอาจยังไม่ทันไหลกลับลงมา
   * การอ่านจาก prop ตอนนั้นจะได้ค่าเก่า แล้วค่าที่เพิ่งกรอกไปจะหายไปเงียบ ๆ
   */
  function commitText() {
    commit(parseField(fromText, lo), parseField(toText, hi));
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="relative h-5">
        <div className="pointer-events-none absolute inset-x-0 top-1/2 h-[3px] -translate-y-1/2 rounded-full bg-stone-200" />
        <div
          className="pointer-events-none absolute top-1/2 h-[3px] -translate-y-1/2 rounded-full bg-stone-900"
          style={{ left: `${pctLo}%`, right: `${100 - pctHi}%` }}
        />
        <input
          type="range"
          className="price-range"
          aria-label="ราคาต่ำสุด"
          min={floor}
          max={top}
          step={step}
          value={lo}
          onChange={(e) => commit(Number(e.target.value), hi)}
          /*
           * หัวซ้ายต้องอยู่บนสุดเมื่อหัวสองข้างชนกันที่ปลายขวา
           * ไม่งั้นหัวขวาจะทับไว้จนลากหัวซ้ายกลับมาไม่ได้อีกเลย
           */
          style={{ zIndex: pctLo > 90 ? 5 : 3 }}
        />
        <input
          type="range"
          className="price-range"
          aria-label="ราคาสูงสุด"
          min={floor}
          max={top}
          step={step}
          value={hi}
          onChange={(e) => commit(lo, Number(e.target.value))}
          style={{ zIndex: 4 }}
        />
      </div>

      <div className="flex items-center justify-between text-xs text-stone-400">
        <span>{floor.toLocaleString()}</span>
        <span>{top.toLocaleString()}</span>
      </div>

      <div className="flex items-center gap-2">
        <label className="flex items-center gap-2 text-xs text-stone-500">
          จาก
          <input
            inputMode="numeric"
            value={fromText}
            onFocus={() => (focused.current = "from")}
            onChange={(e) => setFromText(e.target.value)}
            onBlur={() => {
              focused.current = null;
              commitText();
            }}
            onKeyDown={(e) => e.key === "Enter" && commitText()}
            aria-label="ราคาต่ำสุด (บาท)"
            className="w-24 rounded-lg border border-stone-300 bg-white px-2.5 py-1.5 text-sm font-medium text-stone-900 focus:border-stone-900 focus:outline-none"
          />
        </label>
        <label className="flex items-center gap-2 text-xs text-stone-500">
          ถึง
          <input
            inputMode="numeric"
            value={toText}
            onFocus={() => (focused.current = "to")}
            onChange={(e) => setToText(e.target.value)}
            onBlur={() => {
              focused.current = null;
              commitText();
            }}
            onKeyDown={(e) => e.key === "Enter" && commitText()}
            aria-label="ราคาสูงสุด (บาท)"
            className="w-24 rounded-lg border border-stone-300 bg-white px-2.5 py-1.5 text-sm font-medium text-stone-900 focus:border-stone-900 focus:outline-none"
          />
        </label>
      </div>
    </div>
  );
}
