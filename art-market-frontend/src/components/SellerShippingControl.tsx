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
 * ลำดับเดินหน้าอย่างเดียว และแต่ละขั้นต้องมีหลักฐาน:
 *   ยังไม่จัดส่ง → แพ็คสินค้าแล้ว (แนบรูป) → จัดส่งแล้ว (กรอกรหัสพัสดุ) → จัดส่งสำเร็จ (ผู้ซื้อยืนยัน)
 *
 * เดิมเป็น dropdown เดียวทั้งคำสั่งซื้อ ข้ามขั้นได้ และผู้ขายเลือก "จัดส่งสำเร็จ" เองได้
 * ผู้ซื้อกับผู้ดูแลระบบจึงไม่มีอะไรให้ตรวจสอบเลยว่าของออกจากร้านจริงหรือไม่
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
  const [changingImage, setChangingImage] = useState(false);
  const [tracking, setTracking] = useState(item.trackingNumber ?? "");
  const [editingTracking, setEditingTracking] = useState(false);
  const [busy, setBusy] = useState(false);

  const trackingError =
    tracking.trim() && !isValidTrackingNumber(tracking)
      ? "รหัสพัสดุต้องเป็นตัวอักษรภาษาอังกฤษหรือตัวเลข 8–30 ตัว"
      : null;

  async function save(next: "packed" | "shipped") {
    setBusy(true);
    try {
      await updateItemShipping(item.id, next, {
        packingImage: image || undefined,
        trackingNumber: next === "shipped" ? normalizeTrackingNumber(tracking) : undefined,
      });
      notify(next === "packed" ? "บันทึกว่าแพ็คสินค้าแล้ว" : "บันทึกว่าจัดส่งแล้ว", "success");
      setImage("");
      setChangingImage(false);
      setEditingTracking(false);
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

      {/* ขั้นที่ 1 — แพ็คสินค้า: ต้องแนบรูป */}
      {(status === "not_shipped" || (status === "packed" && changingImage)) && (
        <div className="flex flex-col gap-3">
          <ImageUploadField
            label={status === "not_shipped" ? "รูปสินค้าที่แพ็คแล้ว *" : "รูปแพ็คสินค้าใหม่"}
            value={image}
            onChange={setImage}
            onError={(m) => notify(m, "error")}
            hint="ถ่ายให้เห็นสินค้าและกล่อง/หีบห่อชัดเจน · png หรือ jpg"
          />
          <div className="flex flex-wrap gap-2">
            <Button disabled={busy || !image} onClick={() => save("packed")}>
              {busy ? "กำลังบันทึก..." : status === "not_shipped" ? "บันทึก: แพ็คสินค้าแล้ว" : "บันทึกรูปใหม่"}
            </Button>
            {changingImage && (
              <Button variant="ghost" disabled={busy} onClick={() => setChangingImage(false)}>
                ยกเลิก
              </Button>
            )}
          </div>
          {status === "not_shipped" && !image && (
            <p className="text-xs text-stone-500">
              แนบรูปก่อนจึงจะบันทึกได้ — ผู้ซื้อและผู้ดูแลระบบจะเห็นรูปนี้เพื่อตรวจสอบ
            </p>
          )}
        </div>
      )}

      {/* ขั้นที่ 2 — จัดส่ง: ต้องกรอกรหัสพัสดุ */}
      {((status === "packed" && !changingImage) || (status === "shipped" && editingTracking)) && (
        <div className="flex flex-col gap-2">
          <label className="flex flex-col gap-1.5">
            <span className="text-sm font-medium text-stone-700">
              รหัสพัสดุ (Tracking number){item.shippingCompanyName ? ` · ${item.shippingCompanyName}` : ""} *
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
            <Button
              disabled={busy || !tracking.trim() || !!trackingError}
              onClick={() => save("shipped")}
            >
              {busy ? "กำลังบันทึก..." : status === "shipped" ? "บันทึกรหัสพัสดุ" : "บันทึก: จัดส่งแล้ว"}
            </Button>
            {status === "packed" && (
              <Button variant="ghost" disabled={busy} onClick={() => setChangingImage(true)}>
                เปลี่ยนรูปแพ็คสินค้า
              </Button>
            )}
            {editingTracking && (
              <Button
                variant="ghost"
                disabled={busy}
                onClick={() => {
                  setEditingTracking(false);
                  setTracking(item.trackingNumber ?? "");
                }}
              >
                ยกเลิก
              </Button>
            )}
          </div>
        </div>
      )}

      {/* ขั้นที่ 3 — รอผู้ซื้อยืนยัน ผู้ขายกดจัดส่งสำเร็จเองไม่ได้ */}
      {status === "shipped" && !editingTracking && (
        <div className="flex flex-col gap-2">
          <p className="rounded-lg bg-sky-50 px-3 py-2 text-sm text-sky-800">
            รอผู้ซื้อยืนยันการได้รับสินค้า
            {autoDeliveryConfirmAt &&
              ` · หากผู้ซื้อไม่ยืนยัน ระบบจะเปลี่ยนเป็นจัดส่งสำเร็จให้อัตโนมัติวันที่ ${formatThaiDate(autoDeliveryConfirmAt)}`}
          </p>
          <div>
            <Button variant="ghost" onClick={() => setEditingTracking(true)}>
              แก้ไขรหัสพัสดุ
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
