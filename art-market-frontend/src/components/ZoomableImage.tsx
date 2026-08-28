"use client";

import { useEffect, useState } from "react";

/**
 * รูปที่กดขยายดูเต็มจอได้
 *
 * ตั้งใจใช้ object-contain ไม่ใช่ object-cover — งานศิลปะมีสัดส่วนไม่เท่ากันทุกชิ้น
 * ถ้า crop ให้พอดีกรอบ ภาพแนวตั้งหรือแนวยาวจะถูกตัดขอบหายไป ซึ่งเป็นสิ่งที่คนซื้อต้องเห็น
 * และจำกัดความสูงด้วย vh เพื่อไม่ให้ภาพใหญ่ดันเนื้อหาที่เหลือตกจอ
 */
export function ZoomableImage({
  src,
  alt,
  className = "",
}: {
  src: string;
  alt: string;
  className?: string;
}) {
  const [open, setOpen] = useState(false);

  // ปิดด้วย Esc และล็อกไม่ให้หน้าเลื่อนตอนเปิดดูเต็มจอ
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = previousOverflow;
    };
  }, [open]);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label={`ขยายดูรูป ${alt}`}
        className={`group relative flex w-full items-center justify-center overflow-hidden rounded-xl border border-stone-200 bg-stone-100 p-2 ${className}`}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={src}
          alt={alt}
          className="max-h-[70vh] w-auto max-w-full rounded-lg object-contain"
        />
        <span className="pointer-events-none absolute bottom-3 right-3 rounded-full bg-stone-900/70 px-3 py-1 text-xs text-white opacity-0 transition group-hover:opacity-100">
          กดเพื่อขยาย
        </span>
      </button>

      {open && (
        // คลิกที่พื้นหลังตรงไหนก็ปิดได้ — เป็นสิ่งที่คนคาดหวังจากภาพเต็มจอ
        <div
          role="dialog"
          aria-modal="true"
          aria-label={alt}
          onClick={() => setOpen(false)}
          className="fixed inset-0 z-50 flex items-center justify-center bg-stone-900/90 p-4"
        >
          <button
            type="button"
            onClick={() => setOpen(false)}
            aria-label="ปิด"
            className="absolute right-4 top-4 rounded-full bg-white/10 px-3 py-1.5 text-sm text-white hover:bg-white/20"
          >
            ปิด (Esc)
          </button>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={src}
            alt={alt}
            onClick={(e) => e.stopPropagation()}
            className="max-h-full max-w-full object-contain"
          />
        </div>
      )}
    </>
  );
}
