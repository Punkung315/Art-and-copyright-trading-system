"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { RequireUser } from "@/components/RoleGuard";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/context/ToastContext";
import { Button, Card, Container, Field, Input } from "@/components/ui";
import { validateFullName, validateNationalNo, validatePhone } from "@/lib/validation";
import { addAddress, getMe, registerSeller, ApiError } from "@/lib/api";
import { Address } from "@/types";
import { AddressDraft, AddressPicker } from "@/components/AddressBook";
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

  /*
   * เติมข้อมูลที่ผู้ใช้กรอกไว้ตั้งแต่สมัครเป็นผู้ซื้อให้เลย — ชื่อจริง เบอร์โทร เลขบัตร
   * ทุกคนที่มาถึงหน้านี้เป็นผู้ซื้ออยู่แล้ว จึงมีข้อมูลชุดนี้ครบ
   * ยังแก้ได้ เผื่อชื่อที่จะใช้ในฐานะศิลปินต่างจากที่เคยกรอกไว้
   */
  const [fullName, setFullName] = useState(user?.fullName ?? "");
  const [phoneNumber, setPhoneNumber] = useState(user?.phoneNumber ?? "");
  const [nationalNo, setNationalNo] = useState(user?.nationalNo ?? "");

  /** ที่อยู่ — เลือกจากสมุดที่อยู่ที่มีอยู่แล้ว หรือเพิ่มใหม่ตรงนี้ */
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [selectedAddressId, setSelectedAddressId] = useState<string | null>(null);
  const [bank, setBank] = useState<BankAccountDraft>(EMPTY_BANK_DRAFT);
  const [bankErrors, setBankErrors] = useState<Record<string, string | null>>({});
  const [errors, setErrors] = useState<Record<string, string | null>>({});
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    getMe().then((me) => {
      if (!me) return;
      const list = me.addresses ?? [];
      setAddresses(list);
      if (list.length > 0) setSelectedAddressId(list[0].id);
      // เผื่อ user ใน context ยังไม่มีข้อมูลเหล่านี้ (บัญชีเก่าที่สมัครก่อนบังคับกรอก)
      setFullName((v) => v || me.fullName || "");
      setPhoneNumber((v) => v || me.phoneNumber || "");
      setNationalNo((v) => v || me.nationalNo || "");
    });
  }, []);

  /** บันทึกที่อยู่ใหม่เข้าสมุดที่อยู่ แล้วคืนรายการล่าสุดให้ตัวเลือก */
  async function handleAddAddress(draft: AddressDraft): Promise<Address[]> {
    try {
      const updated = await addAddress(draft);
      const list = updated.addresses ?? [];
      setAddresses(list);
      notify("บันทึกที่อยู่เรียบร้อยแล้ว", "success");
      return list;
    } catch (err) {
      notify(err instanceof ApiError ? err.message : "ไม่สามารถบันทึกที่อยู่ได้", "error");
      return addresses;
    }
  }

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
    const selected = addresses.find((a) => a.id === selectedAddressId) ?? null;
    const nextErrors = {
      fullName: validateFullName(fullName),
      phoneNumber: validatePhone(phoneNumber),
      nationalNo: validateNationalNo(nationalNo),
      // ที่อยู่ผ่านการตรวจตั้งแต่ตอนบันทึกเข้าสมุดแล้ว เหลือแค่ "เลือกมาหรือยัง"
      address: selected ? null : "กรุณาเลือกที่อยู่ของผู้ขาย",
    };
    const nextBankErrors = validateBankDraft(bank, false);
    setErrors(nextErrors);
    setBankErrors(nextBankErrors);
    if (
      Object.values(nextErrors).some(Boolean) ||
      Object.values(nextBankErrors).some(Boolean) ||
      !selected
    ) {
      notify("กรุณากรอกข้อมูลให้ถูกต้อง", "error");
      return;
    }

    setSubmitting(true);
    try {
      await registerSeller(user.id, {
        fullName,
        phoneNumber,
        nationalNo,
        houseNo: selected.houseNo,
        villageNo: selected.villageNo,
        thoroughfare: selected.thoroughfare,
        subDistrict: selected.subDistrict,
        district: selected.district,
        province: selected.province,
        postalCode: selected.postalCode,
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
          <Field label="ชื่อ-นามสกุล" error={errors.fullName}>
            <Input value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Firstname Lastname" />
          </Field>
          <Field label="เบอร์โทรศัพท์" error={errors.phoneNumber}>
            <Input value={phoneNumber} onChange={(e) => setPhoneNumber(e.target.value)} placeholder="0812345678" />
          </Field>
          <Field label="เลขบัตรประชาชน" error={errors.nationalNo}>
            <Input value={nationalNo} onChange={(e) => setNationalNo(e.target.value)} placeholder="13 หลัก" />
          </Field>
          <div className="sm:col-span-2">
            <Field label="ที่อยู่ผู้ขาย" error={errors.address}>
              {/*
                เลือกจากสมุดที่อยู่ที่กรอกไว้ตั้งแต่สมัครเป็นผู้ซื้อ ไม่ต้องพิมพ์ซ้ำ
                ตั้ง "ที่อยู่ต้นทางส่งของ" (ตัวคิดค่าจัดส่ง) ได้ทีหลังในหน้าโปรไฟล์
              */}
              <AddressPicker
                addresses={addresses}
                selectedId={selectedAddressId}
                onSelect={(a) => setSelectedAddressId(a.id)}
                onAdd={handleAddAddress}
                emptyHint="ยังไม่มีที่อยู่ในระบบ กรุณาเพิ่มที่อยู่ของผู้ขาย"
              />
            </Field>
          </div>

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
