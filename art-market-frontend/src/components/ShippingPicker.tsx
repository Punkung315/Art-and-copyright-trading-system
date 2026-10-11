"use client";

import { useEffect, useState } from "react";
import { getShippingQuotes } from "@/lib/api";
import { ShippingCompanyCode, ShippingOption } from "@/types";

/**
 * ให้ผู้ขายเลือกขนส่ง 1 เจ้า โดยเห็นราคาประเมินของทุกเจ้าเทียบกันไปด้วย
 *
 * ราคามาจาก backend เสมอ (GET /api/shipping/quote) ไม่คำนวณซ้ำฝั่ง frontend
 * เพราะตารางราคาเป็นตัวเดียวกับที่ใช้คิดเงินจริงตอนยืนยันคำสั่งซื้อ
 * ถ้าเขียนสูตรไว้สองที่ วันหนึ่งมันจะไม่ตรงกันแล้วหาสาเหตุยาก
 *
 * ตัวเลขที่โชว์เป็น "ค่าประเมิน" เส้นทางข้ามจังหวัด ยังไม่รู้ปลายทางจริง
 */
export function ShippingPicker({
  value,
  onChange,
  weight,
  width,
  length,
  height,
  error,
}: {
  value?: ShippingCompanyCode;
  onChange: (company: ShippingCompanyCode) => void;
  weight?: number;
  width?: number;
  length?: number;
  height?: number;
  error?: string | null;
}) {
  const [options, setOptions] = useState<ShippingOption[]>([]);
  const [loading, setLoading] = useState(false);

  const hasDims = [weight, width, length, height].every((v) => v != null && v > 0);

  useEffect(() => {
    if (!hasDims) {
      setOptions([]);
      return;
    }
    let cancelled = false;
    setLoading(true);
    // หน่วงไว้เล็กน้อย ไม่งั้นพิมพ์น้ำหนักทีละหลักจะยิง API ทุกตัวอักษร
    const timer = setTimeout(() => {
      getShippingQuotes({ weight, width, length, height })
        .then((res) => {
          if (!cancelled) setOptions(res);
        })
        .finally(() => {
          if (!cancelled) setLoading(false);
        });
    }, 400);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [hasDims, weight, width, length, height]);

  return (
    <div className="sm:col-span-2">
      <p className="mb-1 text-sm font-medium text-stone-700">บริษัทขนส่ง</p>

      {!hasDims && (
        <p className="rounded-lg bg-stone-100 px-3 py-2 text-sm text-stone-600">
          กรอกน้ำหนักและขนาดให้ครบก่อน ระบบจะประเมินค่าจัดส่งของแต่ละเจ้าให้เทียบกัน
        </p>
      )}

      {hasDims && loading && options.length === 0 && (
        <p className="text-sm text-stone-500">กำลังประเมินค่าจัดส่ง...</p>
      )}

      {hasDims && options.length > 0 && (
        <>
          <div className="grid gap-2 sm:grid-cols-2">
            {options.map((o) => {
              const selected = value === o.company;
              return (
                <label
                  key={o.company}
                  className={`flex cursor-pointer items-start justify-between gap-3 rounded-lg border p-3 text-sm ${
                    selected
                      ? "border-amber-500 bg-amber-50"
                      : o.available
                        ? "border-stone-200 hover:bg-stone-50"
                        : "border-stone-200 bg-stone-50 opacity-60"
                  }`}
                >
                  <span className="flex items-start gap-2">
                    <input
                      type="radio"
                      name="shippingCompany"
                      className="mt-1"
                      checked={selected}
                      disabled={!o.available}
                      onChange={() => onChange(o.company)}
                    />
                    <span>
                      <span className="font-medium text-stone-800">{o.companyName}</span>
                      {!o.available && (
                        <span className="mt-0.5 block text-xs text-rose-700">เกินพิกัดที่รับได้</span>
                      )}
                    </span>
                  </span>
                  {/*
                    เกินพิกัดแล้วยังโชว์ราคาจะทำให้เข้าใจผิดว่าส่งได้จริงในราคานั้น
                    จึงโชว์ขีดแทน
                  */}
                  <span className="shrink-0 font-semibold text-stone-900">
                    {o.available ? `${o.cost.toLocaleString()} บาท` : "—"}
                  </span>
                </label>
              );
            })}
          </div>

          <p className="mt-2 text-xs text-stone-400">
            ค่าประเมินเส้นทางข้ามจังหวัด คิดจากน้ำหนักที่ใช้จริง{" "}
            {options[0]?.billableWeightKg?.toLocaleString()} กก. (สูงกว่าระหว่างน้ำหนักชั่งกับน้ำหนักปริมาตร)
            และผลบวกสามด้าน {options[0]?.dimensionSumCm?.toLocaleString()} ซม. —
            ค่าจริงคำนวณอีกครั้งตอนผู้ซื้อเลือกที่อยู่ปลายทาง
          </p>
        </>
      )}

      {error && <p className="mt-1 text-sm text-rose-600">{error}</p>}
    </div>
  );
}
