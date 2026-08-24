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

/** ฟอร์มกรอกที่อยู่หนึ่งรายการ ใช้ทั้งตอนเพิ่มใหม่และตอนแก้ของเดิม */
function AddressForm({
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
}: {
  addresses: Address[];
  busy: boolean;
  onAdd: (value: AddressDraft) => Promise<void>;
  onUpdate: (id: string, value: AddressDraft) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
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
