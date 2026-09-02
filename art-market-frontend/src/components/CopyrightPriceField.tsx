"use client";

import { Field, Input } from "./ui";
import { COPYRIGHT_PRICE_MULTIPLIER, calcCopyrightPrice } from "@/lib/format";

/**
 * ส่วนตั้งค่าการขายลิขสิทธิ์ — ใช้ร่วมกันทั้งหน้าเพิ่มและหน้าแก้ไขงานศิลปะ
 *
 * มีสองสวิตช์ที่คนละความหมายกัน อย่าเอามารวมเป็นอันเดียว
 *   1. "เปิดให้ซื้อลิขสิทธิ์"  — จะขายลิขสิทธิ์ของงานชิ้นนี้ไหม
 *   2. "คำนวณราคาอัตโนมัติ"   — ราคานั้นมาจากสูตรหรือผู้ขายกรอกเอง (ค่าเริ่มต้น = เปิด)
 *
 * ตอนเปิดโหมดอัตโนมัติ ช่องราคาจะล็อกไว้และโชว์ผลลัพธ์สดๆ ตามราคาขายที่พิมพ์
 * ไม่ปล่อยให้พิมพ์แล้วค่าถูกเขียนทับตอนบันทึก ซึ่งงงกว่าการล็อกไปเลย
 */
export function CopyrightPriceField({
  available,
  onAvailableChange,
  autoPrice,
  onAutoPriceChange,
  price,
  manualPrice,
  onManualPriceChange,
  error,
}: {
  available: boolean;
  onAvailableChange: (v: boolean) => void;
  autoPrice: boolean;
  onAutoPriceChange: (v: boolean) => void;
  /** ราคาขายของชิ้นงาน ใช้คำนวณราคาลิขสิทธิ์ */
  price: number | undefined;
  manualPrice: string;
  onManualPriceChange: (v: string) => void;
  error?: string | null;
}) {
  const computed = calcCopyrightPrice(price);

  return (
    <div className="sm:col-span-2">
      <div className="flex items-center gap-2">
        <input
          id="copyrightAvailable"
          type="checkbox"
          checked={available}
          onChange={(e) => onAvailableChange(e.target.checked)}
        />
        <label htmlFor="copyrightAvailable" className="text-sm text-stone-700">
          เปิดให้ซื้อลิขสิทธิ์ของผลงานนี้
        </label>
      </div>

      {available && (
        <div className="mt-3 rounded-lg border border-stone-200 p-4">
          <div className="flex items-center gap-2">
            <input
              id="copyrightAutoPrice"
              type="checkbox"
              checked={autoPrice}
              onChange={(e) => onAutoPriceChange(e.target.checked)}
            />
            <label htmlFor="copyrightAutoPrice" className="text-sm text-stone-700">
              คำนวณราคาลิขสิทธิ์อัตโนมัติ (ราคาขาย x {COPYRIGHT_PRICE_MULTIPLIER})
            </label>
          </div>

          {autoPrice ? (
            <div className="mt-3">
              <p className="text-sm font-medium text-stone-700">ราคาลิขสิทธิ์</p>
              {computed > 0 ? (
                <>
                  <p className="mt-1 text-xl font-bold text-stone-900">
                    ฿{computed.toLocaleString()}
                  </p>
                  <p className="mt-1 text-xs text-stone-500">
                    คำนวณจากราคาขาย ฿{(price ?? 0).toLocaleString()} x{" "}
                    {COPYRIGHT_PRICE_MULTIPLIER} — แก้ราคาขายแล้วราคานี้จะขยับตามให้เอง
                  </p>
                </>
              ) : (
                <p className="mt-1 text-sm text-stone-500">กรอกราคาขายก่อน ระบบจะคำนวณให้</p>
              )}
            </div>
          ) : (
            <div className="mt-3">
              <Field label="ราคาลิขสิทธิ์ (บาท)" error={error}>
                <Input
                  type="number"
                  min={0}
                  value={manualPrice}
                  onChange={(e) => onManualPriceChange(e.target.value)}
                  placeholder={`เช่น ${computed > 0 ? computed : 30000}`}
                />
              </Field>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
