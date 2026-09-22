"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { RequireUser } from "@/components/RoleGuard";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/context/ToastContext";
import { Button, Card, Container, Field, Input } from "@/components/ui";
import {
  validateFullName,
  validateNationalNo,
  validateNotEmpty,
  validatePhone,
  validatePostalCode,
} from "@/lib/validation";
import { registerSeller, ApiError } from "@/lib/api";
import {
  BankAccountFields,
  BankAccountDraft,
  EMPTY_BANK_DRAFT,
  validateBankDraft,
} from "@/components/BankAccountFields";

function RegisterSellerContent() {
  const { user, refresh } = useAuth();
  const { notify } = useToast();
  const router = useRouter();

  const [fullName, setFullName] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [nationalNo, setNationalNo] = useState("");
  const [houseNo, setHouseNo] = useState("");
  const [villageNo, setVillageNo] = useState("");
  const [thoroughfare, setThoroughfare] = useState("");
  const [subDistrict, setSubDistrict] = useState("");
  const [district, setDistrict] = useState("");
  const [province, setProvince] = useState("");
  const [postalCode, setPostalCode] = useState("");
  const [bank, setBank] = useState<BankAccountDraft>(EMPTY_BANK_DRAFT);
  const [bankErrors, setBankErrors] = useState<Record<string, string | null>>({});
  const [errors, setErrors] = useState<Record<string, string | null>>({});
  const [submitting, setSubmitting] = useState(false);

  if (user?.roles.includes("seller")) {
    return (
      <Container className="py-14 text-center">
        <Card className="mx-auto max-w-md p-8">
          <p className="font-medium text-stone-800">คุณได้สมัครเป็นผู้ขายแล้ว</p>
          <p className="mt-2 text-sm text-stone-500">
            สถานะปัจจุบัน:{" "}
            {user.sellerStatus === "approved"
              ? "อนุมัติแล้ว"
              : user.sellerStatus === "pending"
              ? "รอผู้ดูแลระบบตรวจสอบ"
              : "ไม่ได้รับการอนุมัติ"}
          </p>
        </Card>
      </Container>
    );
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!user) return;
    const nextErrors = {
      fullName: validateFullName(fullName),
      phoneNumber: validatePhone(phoneNumber),
      nationalNo: validateNationalNo(nationalNo),
      houseNo: validateNotEmpty(houseNo, "บ้านเลขที่"),
      subDistrict: validateNotEmpty(subDistrict, "ตำบล"),
      district: validateNotEmpty(district, "อำเภอ"),
      province: validateNotEmpty(province, "จังหวัด"),
      postalCode: validatePostalCode(postalCode),
    };
    const nextBankErrors = validateBankDraft(bank, false);
    setErrors(nextErrors);
    setBankErrors(nextBankErrors);
    if (Object.values(nextErrors).some(Boolean) || Object.values(nextBankErrors).some(Boolean)) {
      notify("กรุณากรอกข้อมูลให้ถูกต้อง", "error");
      return;
    }

    setSubmitting(true);
    try {
      await registerSeller(user.id, {
        fullName,
        phoneNumber,
        nationalNo,
        houseNo,
        villageNo,
        thoroughfare,
        subDistrict,
        district,
        province,
        postalCode,
        bankAccount: bank,
      });
      await refresh();
      notify("ส่งคำขอสมัครเป็นผู้ขายสำเร็จ กรุณารอผู้ดูแลระบบตรวจสอบ", "success");
      router.push("/profile");
    } catch (err) {
      notify(err instanceof ApiError ? err.message : "ไม่สามารถสมัครสมาชิกได้", "error");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Container className="flex justify-center py-10">
      <Card className="w-full max-w-2xl p-8">
        <h1 className="font-serif text-2xl font-bold text-stone-900">สมัครสมาชิกเป็นผู้ขาย</h1>
        <p className="mt-1 text-sm text-stone-500">
          กรอกข้อมูลเพื่อสมัครเป็นผู้ขาย/ศิลปิน คำขอจะถูกส่งให้ผู้ดูแลระบบตรวจสอบและอนุมัติ
        </p>

        <form onSubmit={handleSubmit} className="mt-6 grid gap-4 sm:grid-cols-2">
          <Field label="ชื่อ-นามสกุล (fullName)" error={errors.fullName}>
            <Input value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Firstname Lastname" />
          </Field>
          <Field label="เบอร์โทรศัพท์ (phoneNumber)" error={errors.phoneNumber}>
            <Input value={phoneNumber} onChange={(e) => setPhoneNumber(e.target.value)} placeholder="0812345678" />
          </Field>
          <Field label="เลขบัตรประชาชน (nationalNo)" error={errors.nationalNo}>
            <Input value={nationalNo} onChange={(e) => setNationalNo(e.target.value)} placeholder="13 หลัก" />
          </Field>
          <Field label="บ้านเลขที่ (houseNo)" error={errors.houseNo}>
            <Input value={houseNo} onChange={(e) => setHouseNo(e.target.value)} />
          </Field>
          <Field label="หมู่ที่ (villageNo)">
            <Input value={villageNo} onChange={(e) => setVillageNo(e.target.value)} />
          </Field>
          <Field label="ถนน (thoroughfare)">
            <Input value={thoroughfare} onChange={(e) => setThoroughfare(e.target.value)} />
          </Field>
          <Field label="ตำบล (sub-district)" error={errors.subDistrict}>
            <Input value={subDistrict} onChange={(e) => setSubDistrict(e.target.value)} />
          </Field>
          <Field label="อำเภอ (district)" error={errors.district}>
            <Input value={district} onChange={(e) => setDistrict(e.target.value)} />
          </Field>
          <Field label="จังหวัด (province)" error={errors.province}>
            <Input value={province} onChange={(e) => setProvince(e.target.value)} />
          </Field>
          <Field label="รหัสไปรษณีย์ (postalCode)" error={errors.postalCode}>
            <Input value={postalCode} onChange={(e) => setPostalCode(e.target.value)} placeholder="5 หลัก" />
          </Field>

          {/*
            บัญชีรับเงิน — ผู้ดูแลระบบโอนค่าผลงานให้ผ่านบัญชีนี้หลังผู้ซื้อได้รับสินค้า
            บังคับตั้งแต่สมัคร ไม่งั้นมีคนซื้อแล้วแอดมินจะไม่รู้ว่าต้องโอนเงินเข้าบัญชีไหน
          */}
          <div className="mt-2 border-t border-stone-100 pt-5 sm:col-span-2">
            <h2 className="font-serif text-lg font-bold text-stone-900">บัญชีธนาคารสำหรับรับเงิน</h2>
            <p className="mb-4 mt-1 text-sm text-stone-500">
              เมื่อผู้ซื้อได้รับสินค้าแล้ว ผู้ดูแลระบบจะโอนค่าผลงานพร้อมค่าจัดส่งเข้าบัญชีนี้
              แก้ไขภายหลังได้ที่หน้าโปรไฟล์
            </p>
            <BankAccountFields
              value={bank}
              onChange={setBank}
              errors={bankErrors}
              onImageError={(m) => notify(m, "error")}
            />
          </div>

          <Button type="submit" disabled={submitting} className="mt-2 sm:col-span-2">
            {submitting ? "กำลังส่งคำขอ..." : "ส่งคำขอสมัครเป็นผู้ขาย"}
          </Button>
        </form>
      </Card>
    </Container>
  );
}

export default function RegisterSellerPage() {
  return (
    <RequireUser>
      <RegisterSellerContent />
    </RequireUser>
  );
}
