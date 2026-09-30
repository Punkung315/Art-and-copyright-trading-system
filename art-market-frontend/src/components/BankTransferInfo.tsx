"use client";

import { useEffect, useState } from "react";

/**
 * แถบบอกบัญชีรับเงินของเว็บ — ใช้บนหน้าชำระเงิน
 *
 * ข้อมูลบัญชีฝังไว้ในไฟล์นี้ตรง ๆ ไม่ได้เก็บในฐานข้อมูลหรือดึงจาก backend
 * แก้ข้อมูลได้ที่ค่าคงที่ BANK_ACCOUNT ด้านล่างนี้ที่เดียว
 *
 * BANK_ACCOUNT export ออกไปให้ใบเสนอราคาใช้พิมพ์ "ช่องทางการชำระเงิน" ด้วย
 * จะได้ไม่มีเลขบัญชีสองชุดในโค้ดที่หลุดไม่ตรงกันเวลาแก้บัญชีจริง
 */

// =============================================================================
//  ⬇⬇⬇  แก้ข้อมูลบัญชีตรงนี้  ⬇⬇⬇
//
//  ตอนนี้เป็นข้อมูลตัวอย่าง ยังโอนจริงไม่ได้
//  เปลี่ยนเป็นบัญชีจริงแล้วตั้ง sample เป็น false เพื่อเอาป้ายเตือนออก
// =============================================================================
export const BANK_ACCOUNT = {
  bankName: "ธนาคารกสิกรไทย",
  accountNumber: "123-4-56789-0",
  accountName: "บริษัท อาร์ทมารา จำกัด",
  accountType: "ออมทรัพย์",
  /** เว้นเป็นค่าว่างถ้าไม่มีพร้อมเพย์ แถวนี้จะไม่แสดง */
  promptPay: "0-1234-56789-01-2",
  /** ข้อความเพิ่มเติมใต้กล่อง เว้นว่างได้ */
  note: "กรุณาโอนตามยอดที่ระบุให้ตรงทุกบาท แล้วแนบสลิปด้านล่าง",
  /** true = ยังเป็นข้อมูลตัวอย่าง จะขึ้นป้ายเตือนสีเหลือง */
  sample: true,
};
// =============================================================================
//  ⬆⬆⬆  แก้ข้อมูลบัญชีตรงนี้  ⬆⬆⬆
// =============================================================================

/** ปุ่มคัดลอก — พิมพ์เลขบัญชีผิดตัวเดียว เงินไปเข้าบัญชีคนอื่น */
function CopyButton({ value, label }: { value: string; label: string }) {
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!copied) return;
    const timer = setTimeout(() => setCopied(false), 2000);
    return () => clearTimeout(timer);
  }, [copied]);

  async function copy() {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
    } catch {
      /*
       * clipboard API ใช้ไม่ได้ในบางบริบท (หน้าเว็บที่ไม่ใช่ https, เบราว์เซอร์เก่า)
       * ไม่ต้องขึ้น error ให้ตกใจ — ตัวเลขแสดงอยู่บนจอให้พิมพ์เองได้อยู่แล้ว
       */
      setCopied(false);
    }
  }

  return (
    <button
      type="button"
      onClick={copy}
      aria-label={`คัดลอก${label}`}
      className="shrink-0 rounded-md border border-stone-300 px-2 py-0.5 text-xs font-medium text-stone-600 transition hover:bg-stone-100"
    >
      {copied ? "คัดลอกแล้ว" : "คัดลอก"}
    </button>
  );
}

function Line({
  label,
  value,
  copyable = false,
  strong = false,
}: {
  label: string;
  value: string;
  copyable?: boolean;
  strong?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="shrink-0 text-stone-500">{label}</span>
      <span className="flex min-w-0 items-center gap-2">
        <span
          className={`truncate ${
            strong ? "font-mono text-base font-semibold text-stone-900" : "text-stone-800"
          }`}
        >
          {value}
        </span>
        {copyable && <CopyButton value={value} label={label} />}
      </span>
    </div>
  );
}

export function BankTransferInfo() {
  const a = BANK_ACCOUNT;

  return (
    <div className="mt-6 rounded-lg border border-stone-200 bg-white p-4">
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <h2 className="text-sm font-semibold text-stone-900">โอนเงินมาที่บัญชีนี้</h2>
      </div>

      <div className="flex flex-col gap-2 text-sm">
        {a.bankName && <Line label="ธนาคาร" value={a.bankName} />}
        <Line label="เลขที่บัญชี" value={a.accountNumber} copyable strong />
        {a.accountName && <Line label="ชื่อบัญชี" value={a.accountName} />}
        {a.accountType && <Line label="ประเภทบัญชี" value={a.accountType} />}
        {a.promptPay && <Line label="พร้อมเพย์" value={a.promptPay} copyable />}
      </div>

      {a.note && (
        <p className="mt-3 rounded-md bg-stone-50 px-3 py-2 text-xs leading-relaxed text-stone-600">
          {a.note}
        </p>
      )}
    </div>
  );
}
