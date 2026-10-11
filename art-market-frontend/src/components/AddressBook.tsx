"use client";

import { useState } from "react";
import { Address } from "@/types";
import { Button, Card, Field, Input } from "./ui";
import { validatePostalCode, validateNotEmpty } from "@/lib/validation";

export type AddressDraft = Omit<Address, "id">;

const EMPTY: AddressDraft = {
  houseNo: "",
  villageNo: "",
  thoroughfare: "",
  subDistrict: "",
  district: "",
  province: "",
  postalCode: "",
};

export function formatAddress(a: Address | AddressDraft) {
  return [
    a.houseNo,
    a.villageNo ? `หมู่ ${a.villageNo}` : "",
    a.thoroughfare,
    `ต.${a.subDistrict}`,
    `อ.${a.district}`,
    `จ.${a.province}`,
    a.postalCode,
  ]
    .filter((s) => s && String(s).trim())
    .join(" ");
}

/**
 * ฟอร์มกรอกที่อยู่หนึ่งรายการ ใช้ทั้งตอนเพิ่มใหม่ ตอนแก้ของเดิม
 * และตอนบังคับให้ผู้ซื้อกรอกที่อยู่ก่อนยืนยันคำสั่งซื้อ (หน้า checkout)
 */
export function AddressForm({
  initial,
  submitLabel,
  busy,
  onSubmit,
  onCancel,
}: {
  initial: AddressDraft;
  submitLabel: string;
  busy: boolean;
  onSubmit: (value: AddressDraft) => void;
  onCancel?: () => void;
}) {
  const [draft, setDraft] = useState<AddressDraft>(initial);
  const [errors, setErrors] = useState<Record<string, string | null>>({});

  function set<K extends keyof AddressDraft>(key: K, value: string) {
    setDraft((d) => ({ ...d, [key]: value }));
  }

  function handleSubmit() {
    const next = {
      subDistrict: validateNotEmpty(draft.subDistrict, "ตำบล/แขวง"),
      district: validateNotEmpty(draft.district, "อำเภอ/เขต"),
      province: validateNotEmpty(draft.province, "จังหวัด"),
      postalCode: validatePostalCode(draft.postalCode),
    };
    setErrors(next);
    if (Object.values(next).some(Boolean)) return;
    onSubmit(draft);
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <Field label="บ้านเลขที่">
        <Input value={draft.houseNo} onChange={(e) => set("houseNo", e.target.value)} />
      </Field>
      <Field label="หมู่ที่">
        <Input value={draft.villageNo ?? ""} onChange={(e) => set("villageNo", e.target.value)} />
      </Field>
      <Field label="ถนน">
        <Input
          value={draft.thoroughfare ?? ""}
          onChange={(e) => set("thoroughfare", e.target.value)}
        />
      </Field>
      <Field label="ตำบล / แขวง" error={errors.subDistrict}>
        <Input value={draft.subDistrict} onChange={(e) => set("subDistrict", e.target.value)} />
      </Field>
      <Field label="อำเภอ / เขต" error={errors.district}>
        <Input value={draft.district} onChange={(e) => set("district", e.target.value)} />
      </Field>
      <Field label="จังหวัด" error={errors.province}>
        <Input value={draft.province} onChange={(e) => set("province", e.target.value)} />
      </Field>
      <Field label="รหัสไปรษณีย์" error={errors.postalCode}>
        <Input value={draft.postalCode} onChange={(e) => set("postalCode", e.target.value)} />
      </Field>

      <div className="flex items-end gap-2 sm:col-span-2">
        {/*
          ปุ่มในนี้ต้องเป็น type="button" ทั้งหมด
          คอมโพเนนต์นี้ถูกวางอยู่ในหน้าเดียวกับฟอร์มแก้โปรไฟล์ ถ้าปล่อยเป็น submit
          การกด "เพิ่มที่อยู่" จะไปยิงบันทึกโปรไฟล์แทน
        */}
        <Button type="button" disabled={busy} onClick={handleSubmit}>
          {busy ? "กำลังบันทึก..." : submitLabel}
        </Button>
        {onCancel && (
          <Button type="button" variant="ghost" disabled={busy} onClick={onCancel}>
            ยกเลิก
          </Button>
        )}
      </div>
    </div>
  );
}

/**
 * ตัวเลือกที่อยู่ — เลือกจากสมุดที่อยู่ หรือเพิ่มรายการใหม่ตรงนั้นเลย
 *
 * ใช้ร่วมกันทุกหน้าที่ต้องการ "ที่อยู่หนึ่งรายการ" จากผู้ใช้
 * (ยืนยันคำสั่งซื้อ / ส่งคำขอโอนลิขสิทธิ์ / สมัครเป็นผู้ขาย)
 *
 * ทำไมต้องรวมเป็นคอมโพเนนต์เดียว: ของเดิมแต่ละหน้าทำกันเอง หน้าชำระเงินให้เลือกจากสมุด
 * แต่หน้าขอลิขสิทธิ์ให้พิมพ์ที่อยู่ใหม่ทั้ง 7 ช่องทุกครั้ง ทั้งที่เป็นข้อมูลชุดเดียวกัน
 * ของผู้ใช้คนเดียวกัน — นอกจากเสียเวลาแล้วยังพิมพ์ไม่ตรงกับที่เคยกรอกไว้ได้ง่าย
 *
 * ที่อยู่ที่เพิ่มใหม่จะถูกบันทึกเข้าสมุดที่อยู่ด้วยเสมอ ไม่ใช่ใช้ครั้งเดียวทิ้ง
 * เพราะคนที่กรอกที่อยู่ใหม่ตอนนี้ มีแนวโน้มจะใช้ที่อยู่เดิมนั้นอีกในครั้งถัดไป
 */
export function AddressPicker({
  addresses,
  selectedId,
  onSelect,
  onAdded,
  busy = false,
  onAdd,
  addLabel = "+ เพิ่มที่อยู่ใหม่",
  emptyHint = "ยังไม่มีที่อยู่ในระบบ กรุณาเพิ่มที่อยู่",
}: {
  addresses: Address[];
  selectedId: string | null;
  onSelect: (address: Address) => void;
  /** เรียกหลังเพิ่มที่อยู่สำเร็จ ให้หน้าแม่อัปเดตรายการของตัวเอง */
  onAdded?: (addresses: Address[]) => void;
  busy?: boolean;
  /** บันทึกที่อยู่ใหม่ คืนรายการที่อยู่ทั้งหมดหลังบันทึก */
  onAdd: (draft: AddressDraft) => Promise<Address[]>;
  addLabel?: string;
  emptyHint?: string;
}) {
  const [adding, setAdding] = useState(false);
  const [saving, setSaving] = useState(false);

  // ยังไม่มีที่อยู่เลย = ต้องกรอกอยู่ดี เปิดฟอร์มค้างไว้ ไม่ต้องให้กดปุ่มเพิ่มก่อน
  const empty = addresses.length === 0;
  const showForm = adding || empty;

  async function handleAdd(draft: AddressDraft) {
    setSaving(true);
    try {
      const list = await onAdd(draft);
      onAdded?.(list);
      // เลือกรายการที่เพิ่งเพิ่มให้เลย เพราะผู้ใช้กรอกมันเพื่อจะใช้รอบนี้
      if (list.length > 0) onSelect(list[list.length - 1]);
      setAdding(false);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex flex-col gap-2">
      {empty && <p className="text-sm text-stone-500">{emptyHint}</p>}

      {addresses.map((a) => (
        <label
          key={a.id}
          className={`flex cursor-pointer items-start gap-3 rounded-lg border p-3 text-sm transition ${
            selectedId === a.id
              ? "border-stone-900 bg-stone-50"
              : "border-stone-200 hover:bg-stone-50"
          }`}
        >
          <input
            type="radio"
            name="addressPicker"
            className="mt-1 accent-stone-900"
            checked={selectedId === a.id}
            onChange={() => onSelect(a)}
          />
          <span className="text-stone-700">{formatAddress(a)}</span>
        </label>
      ))}

      {!showForm && (
        <button
          type="button"
          className="self-start text-sm text-amber-700 underline"
          onClick={() => setAdding(true)}
        >
          {addLabel}
        </button>
      )}

      {showForm && (
        <div className="mt-1 rounded-lg border border-stone-200 p-4">
          <AddressForm
            initial={EMPTY}
            submitLabel="บันทึกที่อยู่"
            busy={busy || saving}
            onSubmit={handleAdd}
            // ไม่มีที่อยู่เลยก็ยกเลิกไม่ได้ เพราะยกเลิกแล้วจะไม่เหลืออะไรให้เลือก
            onCancel={empty ? undefined : () => setAdding(false)}
          />
        </div>
      )}
    </div>
  );
}

/**
 * สมุดที่อยู่ — เพิ่ม / แก้ไข / ลบ ได้หลายรายการ
 *
 * บันทึกทันทีทีละรายการ ไม่รอปุ่ม "บันทึกการแก้ไข" ของฟอร์มโปรไฟล์
 * เพราะการลบที่อยู่แล้วต้องไปกดบันทึกอีกทีเป็นพฤติกรรมที่คนคาดไม่ถึง
 * และการเก็บรายการที่ลบไว้รอ submit ทำให้ต้องไปคิดเรื่อง diff โดยไม่จำเป็น
 */
export function AddressBook({
  addresses,
  busy,
  onAdd,
  onUpdate,
  onDelete,
  onSetPickup,
  showPickup = false,
}: {
  addresses: Address[];
  busy: boolean;
  onAdd: (value: AddressDraft) => Promise<void>;
  onUpdate: (id: string, value: AddressDraft) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  /** ตั้งที่อยู่ต้นทางส่งของ — ส่งมาเฉพาะตอน showPickup */
  onSetPickup?: (id: string) => Promise<void>;
  /**
   * แสดงตัวเลือก "ที่อยู่ต้นทางส่งของ" — เปิดเฉพาะผู้ขาย
   * ผู้ซื้อไม่ต้องเห็น เพราะไม่ได้เป็นคนส่งของ
   */
  showPickup?: boolean;
}) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  return (
    <div className="flex flex-col gap-3">
      {addresses.length === 0 && !adding && (
        <p className="text-sm text-stone-400">ยังไม่มีที่อยู่ในระบบ</p>
      )}

      {addresses.map((a, i) => (
        <Card key={a.id} className="p-4">
          {editingId === a.id ? (
            <>
              <p className="mb-3 text-sm font-medium text-stone-700">แก้ไขที่อยู่</p>
              <AddressForm
                initial={a}
                submitLabel="บันทึกที่อยู่"
                busy={busy}
                onCancel={() => setEditingId(null)}
                onSubmit={async (value) => {
                  await onUpdate(a.id, value);
                  setEditingId(null);
                }}
              />
            </>
          ) : (
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-xs text-stone-400">
                  ที่อยู่ที่ {i + 1}
                  {i === 0 && " · ใช้เติมฟอร์มอัตโนมัติ"}
                </p>
                <p className="text-sm text-stone-800">{formatAddress(a)}</p>
                {showPickup && a.pickupAddress && (
                  <span className="mt-1 inline-flex items-center rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-medium text-emerald-800">
                    ที่อยู่ต้นทางส่งของ · ใช้คิดค่าจัดส่ง
                  </span>
                )}
              </div>
              <div className="flex gap-2">
                {confirmDeleteId === a.id ? (
                  <>
                    <span className="self-center text-sm text-stone-500">ยืนยันลบ?</span>
                    <Button
                      type="button"
                      variant="danger"
                      disabled={busy}
                      onClick={async () => {
                        await onDelete(a.id);
                        setConfirmDeleteId(null);
                      }}
                    >
                      ลบ
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      disabled={busy}
                      onClick={() => setConfirmDeleteId(null)}
                    >
                      ยกเลิก
                    </Button>
                  </>
                ) : (
                  <>
                    <Button
                      type="button"
                      variant="secondary"
                      disabled={busy}
                      onClick={() => {
                        setEditingId(a.id);
                        setAdding(false);
                      }}
                    >
                      แก้ไข
                    </Button>
                    {/*
                      ค่าจัดส่งคิดจากจังหวัดของที่อยู่ต้นทาง ผู้ขายจึงต้องเลือกเองได้
                      ว่าจะส่งของจากที่ไหน — บ้านกับสตูดิโออาจอยู่คนละจังหวัดกัน
                    */}
                    {showPickup && !a.pickupAddress && onSetPickup && (
                      <Button
                        type="button"
                        variant="secondary"
                        disabled={busy}
                        onClick={() => onSetPickup(a.id)}
                      >
                        ตั้งเป็นที่อยู่ต้นทาง
                      </Button>
                    )}
                    {/* ถามยืนยันก่อนลบ เพราะลบแล้วเรียกคืนไม่ได้ */}
                    <Button
                      type="button"
                      variant="ghost"
                      disabled={busy}
                      onClick={() => setConfirmDeleteId(a.id)}
                    >
                      ลบ
                    </Button>
                  </>
                )}
              </div>
            </div>
          )}
        </Card>
      ))}

      {adding ? (
        <Card className="p-4">
          <p className="mb-3 text-sm font-medium text-stone-700">เพิ่มที่อยู่ใหม่</p>
          <AddressForm
            initial={EMPTY}
            submitLabel="เพิ่มที่อยู่"
            busy={busy}
            onCancel={() => setAdding(false)}
            onSubmit={async (value) => {
              await onAdd(value);
              setAdding(false);
            }}
          />
        </Card>
      ) : (
        <div>
          <Button
            type="button"
            variant="secondary"
            disabled={busy}
            onClick={() => {
              setAdding(true);
              setEditingId(null);
            }}
          >
            + เพิ่มที่อยู่ใหม่
          </Button>
        </div>
      )}
    </div>
  );
}
