"use client";

import { Field, Input, Select } from "./ui";
import { ImageUploadField } from "./ImageUploadField";
import { THAI_BANKS } from "@/lib/banks";
import { normalizeBankAccountNumber, validateBankAccountNumber } from "@/lib/validation";
import { EvidenceThumb } from "./ShippingEvidence";

export type BankAccountDraft = {
  bankCode: string;
  accountNumber: string;
  accountName: string;
  /** รูปใหม่ที่เลือก (ว่าง = ยังไม่เลือก / คงรูปเดิม) */
  bankBookImage: string;
};

export const EMPTY_BANK_DRAFT: BankAccountDraft = {
  bankCode: "",
  accountNumber: "",
  accountName: "",
  bankBookImage: "",
};

/**
 * ตรวจช่องบัญชีธนาคาร — กฎเดียวกับ backend (SellerBankAccountService.apply)
 * @param hasExistingImage true = เคยแนบรูปหน้าสมุดไว้แล้ว ไม่ต้องแนบใหม่ก็ได้
 */
export function validateBankDraft(
  d: BankAccountDraft,
  hasExistingImage: boolean
): Record<string, string | null> {
  return {
    bankCode: d.bankCode ? null : "กรุณาเลือกธนาคาร",
    accountNumber: validateBankAccountNumber(d.accountNumber),
    accountName: d.accountName.trim() ? null : "กรุณากรอกชื่อบัญชี",
    bankBookImage: d.bankBookImage || hasExistingImage ? null : "กรุณาแนบรูปหน้าสมุดบัญชี",
  };
}

/**
 * ช่องกรอกบัญชีรับเงินของผู้ขาย ใช้ทั้งหน้าสมัครเป็นผู้ขายและหน้าแก้ไขบัญชี
 * ผู้ดูแลระบบโอนค่าผลงานให้ผู้ขายผ่านบัญชีนี้หลังจัดส่งสำเร็จ
 */
export function BankAccountFields({
  value,
  onChange,
  errors,
  existingImage,
  onImageError,
}: {
  value: BankAccountDraft;
  onChange: (next: BankAccountDraft) => void;
  errors: Record<string, string | null>;
  /** รูปหน้าสมุดที่บันทึกไว้แล้ว (หน้าแก้ไข) */
  existingImage?: string;
  onImageError?: (message: string) => void;
}) {
  const set = (patch: Partial<BankAccountDraft>) => onChange({ ...value, ...patch });
  const digits = normalizeBankAccountNumber(value.accountNumber);

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <Field label="ธนาคาร *" error={errors.bankCode}>
        <Select
          value={value.bankCode}
          onChange={(e) => set({ bankCode: e.target.value })}
          aria-label="ธนาคาร"
        >
          <option value="">— เลือกธนาคาร —</option>
          {THAI_BANKS.map((b) => (
            <option key={b.code} value={b.code}>
              {b.name}
            </option>
          ))}
        </Select>
      </Field>
      <Field label="เลขบัญชี *" error={errors.accountNumber}>
        <Input
          value={value.accountNumber}
          onChange={(e) => set({ accountNumber: e.target.value })}
          placeholder="เช่น 123-4-56789-0"
          inputMode="numeric"
          aria-label="เลขบัญชี"
          className="font-mono"
        />
      </Field>
      <div className="sm:col-span-2">
        <Field label="ชื่อบัญชี (ตามหน้าสมุดบัญชี) *" error={errors.accountName}>
          <Input
            value={value.accountName}
            onChange={(e) => set({ accountName: e.target.value })}
            placeholder="ชื่อ-นามสกุล เจ้าของบัญชี"
            aria-label="ชื่อบัญชี"
          />
        </Field>
        {digits.length > 0 && !errors.accountNumber && (
          <p className="mt-1 text-xs text-stone-500">เลขบัญชีที่จะบันทึก: {digits}</p>
        )}
      </div>
      <div className="sm:col-span-2 flex flex-col gap-2">
        {existingImage && !value.bankBookImage && (
          <div className="flex items-center gap-3 text-sm text-stone-600">
            <EvidenceThumb src={existingImage} alt="รูปหน้าสมุดบัญชีที่บันทึกไว้" />
            <span>รูปหน้าสมุดบัญชีที่บันทึกไว้ — เลือกรูปใหม่ด้านล่างถ้าต้องการเปลี่ยน</span>
          </div>
        )}
        <ImageUploadField
          label={existingImage ? "รูปหน้าสมุดบัญชีใหม่ (ไม่บังคับ)" : "รูปหน้าสมุดบัญชี *"}
          value={value.bankBookImage}
          onChange={(v) => set({ bankBookImage: v })}
          onError={onImageError}
          hint="ถ่ายให้เห็นชื่อบัญชีและเลขบัญชีชัดเจน · png หรือ jpg"
        />
        {errors.bankBookImage && <p className="text-xs text-rose-600">{errors.bankBookImage}</p>}
      </div>
    </div>
  );
}
