"use client";

import { useState } from "react";
import { OrderItem } from "@/types";
import { ApiError, updateItemShipping } from "@/lib/api";
import { isValidTrackingNumber, normalizeTrackingNumber, formatThaiDate } from "@/lib/format";
import { useToast } from "@/context/ToastContext";
import { Button, Input } from "./ui";
import { ImageUploadField } from "./ImageUploadField";
import { StatusBadge } from "./StatusBadge";
import { ShippingEvidence } from "./ShippingEvidence";

/**
 * แผงจัดการการจัดส่งของผู้ขาย "ทีละชิ้น"
 *
 * กรอกทีเดียวจบ: ช่องรูปแพ็คสินค้ากับช่องรหัสพัสดุอยู่ในฟอร์มเดียวกัน กดบันทึกครั้งเดียว
 * แล้วข้ามไปเป็น "จัดส่งแล้ว" ได้เลย
 *
 * เดิมบังคับเป็นสองรอบ (บันทึกรูป → แล้วค่อยกลับมากรอกเลขพัสดุ) ซึ่งไม่ตรงกับงานจริง
 * ผู้ขายแพ็คของแล้วหิ้วไปส่งขนส่งรอบเดียว ได้ใบเสร็จมาพร้อมเลขพัสดุ แล้วจึงมานั่งบันทึก
 * การบังคับแยกสองครั้งจึงเป็นข้อจำกัดของหน้าจอ ไม่ใช่ของกระบวนการ
 *
 * สิ่งที่ยังเหมือนเดิมโดยตั้งใจ:
 *   - หลักฐานต้องครบ ไม่มีรูปแพ็ค = บันทึกจัดส่งไม่ได้ (ตรวจซ้ำที่ backend ด้วย)
 *   - บันทึกเฉพาะรูปก่อนได้ สำหรับคนที่แพ็ควันนี้ส่งพรุ่งนี้
 *   - ประวัติยังเก็บเป็นสองขั้น (เวลาแพ็ค / เวลาส่ง) ให้ผู้ซื้อกับผู้ดูแลระบบตรวจสอบ
 *   - "จัดส่งสำเร็จ" ยังเป็นของผู้ซื้อเท่านั้น ผู้ขายกดเองไม่ได้
 */
export function SellerShippingControl({
  item,
  autoDeliveryConfirmAt,
  onChanged,
}: {
  item: OrderItem;
  autoDeliveryConfirmAt?: string;
  onChanged: () => Promise<void> | void;
}) {
  const { notify } = useToast();
  const status = item.shippingStatus ?? "not_shipped";
  const [image, setImage] = useState("");
  const [tracking, setTracking] = useState(item.trackingNumber ?? "");
  const [editing, setEditing] = useState(false);
  const [busy, setBusy] = useState(false);

  /** จัดส่งไปแล้ว ฟอร์มจึงพับเก็บไว้จนกว่าจะกดแก้ไข */
  const formOpen = status === "not_shipped" || status === "packed" || editing;

  /** มีรูปแพ็คอยู่แล้วหรือกำลังแนบใหม่ — ใช้ตัดสินว่ากดบันทึกจัดส่งได้หรือยัง */
  const hasPackingImage = !!image || !!item.packingImage;

  const trackingError =
    tracking.trim() && !isValidTrackingNumber(tracking)
      ? "รหัสพัสดุต้องเป็นตัวอักษรภาษาอังกฤษหรือตัวเลข 8–30 ตัว"
      : null;

  const canSaveShipped = hasPackingImage && !!tracking.trim() && !trackingError;

  async function save(next: "packed" | "shipped") {
    setBusy(true);
    try {
      await updateItemShipping(item.id, next, {
        packingImage: image || undefined,
        trackingNumber: next === "shipped" ? normalizeTrackingNumber(tracking) : undefined,
      });
      notify(
        next === "packed" ? "บันทึกว่าแพ็คสินค้าแล้ว" : "บันทึกข้อมูลการจัดส่งแล้ว",
        "success"
      );
      setImage("");
      setEditing(false);
      await onChanged();
    } catch (err) {
      notify(
        err instanceof ApiError ? err.message : "ไม่สามารถแก้ไขสถานะได้ กรุณาลองใหม่อีกครั้ง",
        "error"
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="rounded-lg border border-stone-200 p-4" data-testid={`ship-item-${item.id}`}>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <span className="text-sm font-medium text-stone-800">{item.artworkName}</span>
        <StatusBadge status={status} domain="shipping" />
      </div>

      {status !== "not_shipped" && (
        <div className="mb-3">
          <ShippingEvidence item={item} />
        </div>
      )}

      {formOpen && (
        <div className="flex flex-col gap-3" data-testid={`ship-form-${item.id}`}>
          <ImageUploadField
            label={
              item.packingImage ? "เปลี่ยนรูปสินค้าที่แพ็คแล้ว (ไม่บังคับ)" : "รูปสินค้าที่แพ็คแล้ว *"
            }
            value={image}
            onChange={setImage}
            onError={(m) => notify(m, "error")}
            hint="ถ่ายให้เห็นสินค้าและกล่อง/หีบห่อชัดเจน · png หรือ jpg"
          />

          <label className="flex flex-col gap-1.5">
            <span className="text-sm font-medium text-stone-700">
              รหัสพัสดุ{item.shippingCompanyName ? ` · ${item.shippingCompanyName}` : ""} *
            </span>
            <Input
              value={tracking}
              onChange={(e) => setTracking(e.target.value)}
              placeholder="เช่น TH0123456789A"
              aria-label="รหัสพัสดุ"
              className="font-mono sm:w-72"
            />
          </label>
          {trackingError && <p className="text-xs text-rose-600">{trackingError}</p>}

          <div className="flex flex-wrap gap-2">
            <Button disabled={busy || !canSaveShipped} onClick={() => save("shipped")}>
              {busy
                ? "กำลังบันทึก..."
                : status === "shipped"
                  ? "บันทึกการแก้ไข"
                  : "บันทึก: จัดส่งแล้ว"}
            </Button>

            {/*
              ทางออกสำหรับคนที่แพ็ควันนี้แต่ยังไม่ได้เอาไปส่ง จึงยังไม่มีเลขพัสดุ
              ขึ้นเฉพาะตอนที่ยังไม่เคยบันทึกว่าแพ็ค ไม่งั้นปุ่มนี้ไม่มีความหมาย
            */}
            {status === "not_shipped" && (
              <Button variant="secondary" disabled={busy || !image} onClick={() => save("packed")}>
                บันทึกเฉพาะรูปไว้ก่อน
              </Button>
            )}

            {editing && (
              <Button
                variant="ghost"
                disabled={busy}
                onClick={() => {
                  setEditing(false);
                  setImage("");
                  setTracking(item.trackingNumber ?? "");
                }}
              >
                ยกเลิก
              </Button>
            )}
          </div>

          {!hasPackingImage && (
            <p className="text-xs text-stone-500">
              แนบรูปก่อนจึงจะบันทึกได้ — ผู้ซื้อและผู้ดูแลระบบจะเห็นรูปนี้เพื่อตรวจสอบ
            </p>
          )}
          {hasPackingImage && !tracking.trim() && status === "not_shipped" && (
            <p className="text-xs text-stone-500">
              ยังไม่มีรหัสพัสดุตอนนี้? กด &quot;บันทึกเฉพาะรูปไว้ก่อน&quot; แล้วกลับมากรอกทีหลังได้
            </p>
          )}
        </div>
      )}

      {/* จัดส่งแล้ว — รอผู้ซื้อยืนยัน ผู้ขายกดจัดส่งสำเร็จเองไม่ได้ */}
      {status === "shipped" && !editing && (
        <div className="flex flex-col gap-2">
          <p className="rounded-lg bg-sky-50 px-3 py-2 text-sm text-sky-800">
            รอผู้ซื้อยืนยันการได้รับสินค้า
            {autoDeliveryConfirmAt &&
              ` · หากผู้ซื้อไม่ยืนยัน ระบบจะเปลี่ยนเป็นจัดส่งสำเร็จให้อัตโนมัติวันที่ ${formatThaiDate(autoDeliveryConfirmAt)}`}
          </p>
          <div>
            <Button variant="ghost" onClick={() => setEditing(true)}>
              แก้ไขข้อมูลการจัดส่ง
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
