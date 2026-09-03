"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "./ui";

export type ConfirmStep = {
  title: string;
  description: string;
  /** ข้อความบนปุ่มยืนยันของขั้นนี้ */
  confirmLabel: string;
};

/**
 * กล่องยืนยันกลางหน้าจอ รองรับการยืนยันหลายขั้น
 *
 * ใช้กับงานที่ย้อนกลับไม่ได้และกระทบเงินจริง เช่นการยืนยันการโอนเงินของผู้ดูแลระบบ
 * การกดพลาดครั้งเดียวหมายถึงเงินถูกปล่อยให้ผู้ขายไปแล้ว จึงต้องผ่านสองขั้น
 * โดยขั้นที่สองสรุป "ผลที่จะเกิดขึ้น" ไม่ใช่แค่ถามซ้ำด้วยคำเดิม
 * — การถามซ้ำคำเดิมคนจะกดผ่านโดยไม่อ่าน ซึ่งไม่ได้กันอะไรเลย
 *
 * ปุ่มยืนยันเริ่มที่ตำแหน่งไม่ถูกโฟกัส และปิดด้วย Esc ได้
 * เพื่อไม่ให้เผลอกด Enter รัวแล้วผ่านทั้งสองขั้นรวดเดียว
 */
export function ConfirmDialog({
  open,
  steps,
  destructive = false,
  busy = false,
  onCancel,
  onConfirm,
}: {
  open: boolean;
  /** ขั้นตอนการยืนยันเรียงตามลำดับ อย่างน้อย 1 ขั้น */
  steps: ConfirmStep[];
  /** true = ใช้โทนสีแดง สำหรับการกระทำที่เป็นการปฏิเสธ/ทำลาย */
  destructive?: boolean;
  busy?: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  const [stepIndex, setStepIndex] = useState(0);
  const cancelRef = useRef<HTMLButtonElement>(null);

  // เปิดใหม่ทุกครั้งต้องเริ่มที่ขั้นแรกเสมอ ไม่ใช่ค้างอยู่ขั้นสุดท้ายของรอบก่อน
  useEffect(() => {
    if (open) setStepIndex(0);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !busy) onCancel();
    };
    window.addEventListener("keydown", onKey);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    // โฟกัสที่ปุ่มยกเลิก ไม่ใช่ปุ่มยืนยัน — ค่าเริ่มต้นควรเป็นทางที่ปลอดภัยกว่า
    cancelRef.current?.focus();
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = previousOverflow;
    };
  }, [open, busy, onCancel]);

  if (!open || steps.length === 0) return null;

  const step = steps[Math.min(stepIndex, steps.length - 1)];
  const isLastStep = stepIndex >= steps.length - 1;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={step.title}
      className="fixed inset-0 z-50 flex items-center justify-center bg-stone-900/60 p-4"
    >
      <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl">
        {steps.length > 1 && (
          <p className="mb-2 text-xs font-medium text-stone-400">
            ขั้นที่ {stepIndex + 1} จาก {steps.length}
          </p>
        )}

        <h2 className="font-serif text-lg font-bold text-stone-900">{step.title}</h2>
        <p className="mt-2 text-sm leading-relaxed text-stone-600">{step.description}</p>

        <div className="mt-6 flex flex-wrap justify-end gap-2">
          <Button ref={cancelRef} type="button" variant="ghost" disabled={busy} onClick={onCancel}>
            ยกเลิก
          </Button>
          <Button
            type="button"
            variant={destructive ? "danger" : "primary"}
            disabled={busy}
            onClick={() => {
              if (isLastStep) onConfirm();
              else setStepIndex((i) => i + 1);
            }}
          >
            {busy ? "กำลังบันทึก..." : step.confirmLabel}
          </Button>
        </div>
      </div>
    </div>
  );
}
