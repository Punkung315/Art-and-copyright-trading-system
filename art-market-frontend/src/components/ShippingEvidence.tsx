"use client";

import { useEffect, useState } from "react";
import { OrderItem } from "@/types";
import { formatThaiDateTime } from "@/lib/format";

type Evidence = Pick<
  OrderItem,
  | "shippingStatus"
  | "packingImage"
  | "packedAt"
  | "trackingNumber"
  | "shippingCompanyName"
  | "shippedAt"
  | "deliveredAt"
  | "deliveryConfirmedBy"
>;

/**
 * รูปย่อที่กดแล้วเปิดดูเต็มจอ
 *
 * ไม่ใช้ ZoomableImage เพราะตัวนั้นออกแบบมาเป็นรูปหลักของหน้า (สูงถึง 70vh)
 * ส่วนรูปแพ็คสินค้าเป็นหลักฐานประกอบ ต้องเล็กพอจะวางข้างข้อมูลอื่นได้
 */
export function EvidenceThumb({ src, alt }: { src: string; alt: string }) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label={`ขยายดู ${alt}`}
        className="group relative h-20 w-20 shrink-0 overflow-hidden rounded-lg border border-stone-200 bg-stone-100"
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={src} alt={alt} className="h-full w-full object-cover" />
        <span className="absolute inset-x-0 bottom-0 bg-stone-900/60 py-0.5 text-center text-[10px] text-white opacity-0 transition group-hover:opacity-100">
          กดเพื่อขยาย
        </span>
      </button>
      {open && (
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

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(text);
          setCopied(true);
          setTimeout(() => setCopied(false), 1500);
        } catch {
          /* บางเบราว์เซอร์ไม่ให้เข้าถึงคลิปบอร์ด — ผู้ใช้ยังเลือกข้อความเองได้ */
        }
      }}
      className="rounded-md border border-stone-300 px-2 py-0.5 text-xs text-stone-600 hover:bg-stone-50"
    >
      {copied ? "คัดลอกแล้ว" : "คัดลอก"}
    </button>
  );
}

/**
 * หลักฐานการจัดส่งของสินค้า 1 ชิ้น แบบไทม์ไลน์
 * แสดงเหมือนกันทั้งฝั่งผู้ซื้อ ผู้ขาย และผู้ดูแลระบบ — ทุกฝ่ายต้องเห็นหลักฐานชุดเดียวกัน
 */
export function ShippingEvidence({ item }: { item: Evidence }) {
  const status = item.shippingStatus ?? "not_shipped";
  if (status === "not_shipped" && !item.packingImage) {
    return <p className="text-xs text-stone-500">ผู้ขายยังไม่ได้แพ็คสินค้า</p>;
  }

  return (
    <ol className="flex flex-col gap-3 border-l-2 border-stone-200 pl-4 text-sm">
      <li className="relative">
        <span className="absolute -left-[21px] top-1 h-2.5 w-2.5 rounded-full bg-sky-500" />
        <p className="font-medium text-stone-800">
          แพ็คสินค้าแล้ว{" "}
          <span className="font-normal text-stone-500">· {formatThaiDateTime(item.packedAt)}</span>
        </p>
        {item.packingImage ? (
          <div className="mt-2">
            <EvidenceThumb src={item.packingImage} alt="รูปสินค้าที่แพ็คแล้ว" />
          </div>
        ) : (
          <p className="text-xs text-stone-500">ไม่มีรูปแพ็คสินค้า (รายการก่อนระบบบังคับแนบรูป)</p>
        )}
      </li>

      {(status === "shipped" || status === "delivered") && (
        <li className="relative">
          <span className="absolute -left-[21px] top-1 h-2.5 w-2.5 rounded-full bg-sky-500" />
          <p className="font-medium text-stone-800">
            จัดส่งแล้ว{" "}
            <span className="font-normal text-stone-500">· {formatThaiDateTime(item.shippedAt)}</span>
          </p>
          {item.trackingNumber ? (
            <p className="mt-1 flex flex-wrap items-center gap-2 text-stone-700">
              <span className="text-xs text-stone-500">
                รหัสพัสดุ{item.shippingCompanyName ? ` (${item.shippingCompanyName})` : ""}
              </span>
              <span className="rounded bg-stone-100 px-2 py-0.5 font-mono text-sm tracking-wide">
                {item.trackingNumber}
              </span>
              <CopyButton text={item.trackingNumber} />
            </p>
          ) : (
            <p className="text-xs text-stone-500">ไม่มีรหัสพัสดุ (รายการก่อนระบบบังคับกรอก)</p>
          )}
        </li>
      )}

      {status === "delivered" && (
        <li className="relative">
          <span className="absolute -left-[21px] top-1 h-2.5 w-2.5 rounded-full bg-emerald-500" />
          <p className="font-medium text-emerald-800">
            จัดส่งสำเร็จ{" "}
            <span className="font-normal text-stone-500">· {formatThaiDateTime(item.deliveredAt)}</span>
          </p>
          <p className="text-xs text-stone-500">
            {item.deliveryConfirmedBy === "auto"
              ? "ระบบยืนยันให้อัตโนมัติเมื่อครบกำหนด (ผู้ซื้อไม่ได้กดยืนยัน)"
              : item.deliveryConfirmedBy === "buyer"
                ? "ผู้ซื้อยืนยันว่าได้รับสินค้าแล้ว"
                : ""}
          </p>
        </li>
      )}
    </ol>
  );
}
