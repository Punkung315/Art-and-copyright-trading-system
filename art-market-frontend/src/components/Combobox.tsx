"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import { normalizeOption } from "@/lib/artworkOptions";

/**
 * ช่องกรอกข้อความที่ "พิมพ์เองได้" พร้อมรายการแนะนำเลื่อนลงมาให้เลือก
 *
 * ใช้กับช่องที่ไม่ควรบังคับให้เลือกจากรายการตายตัว (สไตล์ / เทคนิค / วัสดุ ของผลงานศิลปะ)
 * งานสื่อผสมมีจริง การล็อกตัวเลือกจะทำให้ผู้ขายกรอกข้อมูลจริงไม่ได้
 *
 * ทำไมไม่ใช้ <datalist> ของ HTML: หน้าตา popup คุมสไตล์ไม่ได้ (เป็นของเบราว์เซอร์)
 * จะดูไม่เข้ากับช่องกรอกอื่นในระบบ และคุม keyboard navigation เองไม่ได้
 *
 * รองรับ: พิมพ์เพื่อกรองรายการ, ลูกศรขึ้น-ลงเลือก, Enter ยืนยัน, Esc ปิด, คลิกนอกช่องเพื่อปิด
 */
export function Combobox({
  value,
  onChange,
  options,
  placeholder,
  ariaLabel,
  id,
}: {
  value: string;
  onChange: (next: string) => void;
  options: string[];
  placeholder?: string;
  ariaLabel?: string;
  id?: string;
}) {
  const [open, setOpen] = useState(false);
  const [highlight, setHighlight] = useState(-1);
  const wrapRef = useRef<HTMLDivElement>(null);
  const listId = useId();

  // กรองรายการตามสิ่งที่พิมพ์ ถ้ายังไม่พิมพ์อะไรให้เห็นรายการทั้งหมด
  const filtered = useMemo(() => {
    const q = normalizeOption(value).toLowerCase();
    if (!q) return options;
    const matched = options.filter((o) => o.toLowerCase().includes(q));
    // ค่าที่ตรงเป๊ะอยู่แล้วไม่ต้องเสนอซ้ำ
    return matched.length === 1 && matched[0].toLowerCase() === q ? [] : matched;
  }, [options, value]);

  // คลิกที่อื่นในหน้าแล้วปิดรายการ
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open]);

  function choose(option: string) {
    onChange(option);
    setOpen(false);
    setHighlight(-1);
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      if (!open) {
        setOpen(true);
        return;
      }
      if (filtered.length === 0) return;
      e.preventDefault();
      const step = e.key === "ArrowDown" ? 1 : -1;
      setHighlight((h) => (h + step + filtered.length) % filtered.length);
      return;
    }
    if (e.key === "Enter" && open && highlight >= 0 && filtered[highlight]) {
      // เลือกจากรายการ — ห้ามให้ Enter ไป submit ฟอร์มทั้งหน้า
      e.preventDefault();
      choose(filtered[highlight]);
      return;
    }
    if (e.key === "Escape" && open) {
      e.preventDefault();
      setOpen(false);
      setHighlight(-1);
    }
  }

  return (
    <div ref={wrapRef} className="relative">
      <input
        id={id}
        role="combobox"
        aria-expanded={open}
        aria-controls={listId}
        aria-autocomplete="list"
        aria-label={ariaLabel}
        autoComplete="off"
        value={value}
        placeholder={placeholder}
        onChange={(e) => {
          onChange(e.target.value);
          setOpen(true);
          setHighlight(-1);
        }}
        onFocus={() => setOpen(true)}
        onKeyDown={onKeyDown}
        // ล้างช่องว่างส่วนเกินทันทีที่ออกจากช่อง ค่านี้ถูกนำไปทำตัวกรองในหน้าค้นหา
        onBlur={() => onChange(normalizeOption(value))}
        className="w-full rounded-lg border border-stone-300 bg-white px-3 py-2.5 text-sm text-stone-900 placeholder:text-stone-400 focus:border-stone-500 focus:outline-none focus:ring-2 focus:ring-stone-200"
      />

      {open && filtered.length > 0 && (
        <div className="absolute z-20 mt-1 w-full overflow-hidden rounded-lg border border-stone-200 bg-white shadow-lg">
        <ul id={listId} role="listbox" className="max-h-56 overflow-auto py-1">
          {filtered.map((option, i) => (
            <li key={option}>
              <button
                type="button"
                role="option"
                aria-selected={i === highlight}
                // ใช้ onMouseDown เพราะ onBlur ของ input ทำงานก่อน onClick แล้วรายการจะปิดไปก่อนคลิกติด
                onMouseDown={(e) => {
                  e.preventDefault();
                  choose(option);
                }}
                onMouseEnter={() => setHighlight(i)}
                className={`flex w-full items-center gap-2 px-3 py-2 text-left text-sm ${
                  i === highlight ? "bg-stone-100 text-stone-900" : "text-stone-700"
                }`}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                     strokeWidth="2" className="shrink-0 text-stone-400" aria-hidden>
                  <circle cx="11" cy="11" r="7" />
                  <path d="m20 20-3.5-3.5" />
                </svg>
                {option}
              </button>
            </li>
          ))}
        </ul>
        {/* บอกให้ชัดว่าไม่ได้บังคับเลือกจากรายการ งานสื่อผสมพิมพ์ค่าของตัวเองได้ */}
        <p className="border-t border-stone-100 px-3 py-1.5 text-[11px] text-stone-400">
          พิมพ์ค่าอื่นเองได้ ไม่จำเป็นต้องเลือกจากรายการ
        </p>
        </div>
      )}
    </div>
  );
}
