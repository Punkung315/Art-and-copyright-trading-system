"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import { RequireUser } from "@/components/RoleGuard";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/context/ToastContext";
import { ApiError, getMyBankAccount, updateMyBankAccount } from "@/lib/api";
import { BankAccount } from "@/types";
import { Button, Card, Container, Spinner } from "@/components/ui";
import {
  BankAccountFields,
  BankAccountDraft,
  EMPTY_BANK_DRAFT,
  validateBankDraft,
} from "@/components/BankAccountFields";
import { formatBankAccountNumber } from "@/lib/banks";
import { formatThaiDateTime } from "@/lib/format";

/**
 * บัญชีรับเงินของผู้ขาย
 *
 * เปิดให้ผู้ขายที่ "รออนุมัติ" เข้าได้ด้วย (ใช้ RequireUser ไม่ใช่ RequireSeller)
 * เพราะอาจต้องแก้บัญชีที่กรอกผิดตอนสมัคร ก่อนแอดมินตรวจ
 */
function BankAccountContent() {
  const { user } = useAuth();
  const { notify } = useToast();
  const [current, setCurrent] = useState<BankAccount | null | undefined>(undefined);
  const [draft, setDraft] = useState<BankAccountDraft>(EMPTY_BANK_DRAFT);
  const [errors, setErrors] = useState<Record<string, string | null>>({});
  const [saving, setSaving] = useState(false);

  const isSeller = !!user?.roles.includes("seller");

  useEffect(() => {
    if (!isSeller) return;
    getMyBankAccount()
      .then((b) => {
        setCurrent(b ?? null);
        if (b) {
          setDraft({
            bankCode: b.bankCode,
            accountNumber: b.accountNumber,
            accountName: b.accountName,
            bankBookImage: "",
          });
        }
      })
      .catch(() => setCurrent(null));
  }, [isSeller]);

  if (!user) return null;
  if (!isSeller) {
    return (
      <Container className="py-14 text-center text-stone-600">
        หน้านี้สำหรับผู้ขายเท่านั้น{" "}
        <Link href="/register-seller" className="underline">
          สมัครเป็นผู้ขาย
        </Link>
      </Container>
    );
  }
  if (current === undefined) return <Spinner />;

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const next = validateBankDraft(draft, !!current?.bankBookImage);
    setErrors(next);
    if (Object.values(next).some(Boolean)) {
      notify("กรุณากรอกข้อมูลบัญชีให้ถูกต้อง", "error");
      return;
    }
    setSaving(true);
    try {
      const saved = await updateMyBankAccount(draft);
      setCurrent(saved);
      setDraft({ ...draft, accountNumber: saved.accountNumber, bankBookImage: "" });
      notify("บันทึกบัญชีรับเงินสำเร็จ", "success");
    } catch (err) {
      notify(err instanceof ApiError ? err.message : "ไม่สามารถบันทึกบัญชีได้", "error");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Container className="flex justify-center py-10">
      <Card className="w-full max-w-2xl p-8">
        <Link href="/profile" className="text-sm text-stone-500 hover:text-stone-900">
          ← กลับไปโปรไฟล์
        </Link>
        <h1 className="mt-3 font-serif text-2xl font-bold text-stone-900">บัญชีธนาคารสำหรับรับเงิน</h1>
        <p className="mt-1 text-sm text-stone-500">
          ผู้ดูแลระบบจะโอนค่าผลงานพร้อมค่าจัดส่งเข้าบัญชีนี้ เมื่อผู้ซื้อได้รับสินค้าแล้ว
        </p>

        {current ? (
          <div className="mt-4 rounded-lg bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
            บัญชีปัจจุบัน: {current.bankName} · {formatBankAccountNumber(current.accountNumber)} ·{" "}
            {current.accountName}
            <span className="block text-xs text-emerald-700">
              แก้ไขล่าสุด {formatThaiDateTime(current.updatedAt)} — การแก้ไขมีผลกับการโอนครั้งถัดไป
              การโอนที่ผ่านมาแล้วยังอ้างอิงบัญชีเดิม
            </span>
          </div>
        ) : (
          <div className="mt-4 rounded-lg bg-amber-50 px-4 py-3 text-sm text-amber-900">
            คุณยังไม่ได้ตั้งบัญชีรับเงิน — ต้องตั้งก่อนจึงจะเผยแพร่ผลงานได้
            และผู้ดูแลระบบจะโอนเงินให้คุณไม่ได้
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-4">
          <BankAccountFields
            value={draft}
            onChange={setDraft}
            errors={errors}
            existingImage={current?.bankBookImage}
            onImageError={(m) => notify(m, "error")}
          />
          <Button type="submit" disabled={saving}>
            {saving ? "กำลังบันทึก..." : "บันทึกบัญชีรับเงิน"}
          </Button>
        </form>
      </Card>
    </Container>
  );
}

export default function BankAccountPage() {
  return (
    <RequireUser>
      <BankAccountContent />
    </RequireUser>
  );
}
