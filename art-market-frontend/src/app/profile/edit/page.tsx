"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { RequireUser } from "@/components/RoleGuard";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/context/ToastContext";
import { Button, Card, Container, Field, Input } from "@/components/ui";
import { AddressBook, AddressDraft } from "@/components/AddressBook";
import {
  validateEmail,
  validateFullName,
  validateNationalNo,
  validatePhone,
  validateUsername,
} from "@/lib/validation";
import {
  updateProfile,
  addAddress,
  setPickupAddress,
  updateAddress,
  deleteAddress,
  ApiError,
} from "@/lib/api";
import { fileToDataUrl } from "@/lib/storage";

function EditProfileContent() {
  const { user, refresh } = useAuth();
  const { notify } = useToast();
  const router = useRouter();

  const [username, setUsername] = useState(user?.username ?? "");
  const [fullName, setFullName] = useState(user?.fullName ?? "");
  const [email, setEmail] = useState(user?.email ?? "");
  const [phoneNumber, setPhoneNumber] = useState(user?.phoneNumber ?? "");
  const [nationalNo, setNationalNo] = useState(user?.nationalNo ?? "");
  const [profileImage, setProfileImage] = useState(user?.profileImage ?? "");

  const [errors, setErrors] = useState<Record<string, string | null>>({});
  const [submitting, setSubmitting] = useState(false);
  const [addressBusy, setAddressBusy] = useState(false);

  // เฉพาะผู้ขายที่ต้องระบุที่อยู่ต้นทาง ผู้ซื้อไม่ได้เป็นคนส่งของ
  const isSeller = user?.roles.includes("seller") ?? false;
  const hasPickupAddress = (user?.addresses ?? []).some((a) => a.pickupAddress);

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!["image/png", "image/jpeg"].includes(file.type)) {
      notify("ประเภทไฟล์ไม่ถูกต้อง ต้องเป็นไฟล์ png หรือ jpg เท่านั้น", "error");
      return;
    }
    const dataUrl = await fileToDataUrl(file);
    setProfileImage(dataUrl);
  }

  /**
   * ที่อยู่บันทึกทันทีทีละรายการ แยกจากปุ่ม "บันทึกการแก้ไข" ของโปรไฟล์
   * แล้ว refresh() เพื่อดึงรายการล่าสุดมาแสดง
   */
  async function runAddressAction(action: () => Promise<unknown>, successMessage: string) {
    setAddressBusy(true);
    try {
      await action();
      await refresh();
      notify(successMessage, "success");
    } catch (err) {
      notify(
        err instanceof ApiError ? err.message : "ไม่สามารถบันทึกที่อยู่ได้ กรุณาลองอีกครั้ง",
        "error"
      );
    } finally {
      setAddressBusy(false);
    }
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!user) return;

    const nextErrors: Record<string, string | null> = {
      username: validateUsername(username),
      email: validateEmail(email),
      // ช่องที่ไม่บังคับ ตรวจเฉพาะเมื่อผู้ใช้กรอกมาจริง
      fullName: fullName.trim() ? validateFullName(fullName) : null,
      phoneNumber: phoneNumber.trim() ? validatePhone(phoneNumber) : null,
      nationalNo: nationalNo.trim() ? validateNationalNo(nationalNo) : null,
    };
    setErrors(nextErrors);
    if (Object.values(nextErrors).some(Boolean)) {
      notify("กรุณากรอกข้อมูลให้ถูกต้อง", "error");
      return;
    }

    setSubmitting(true);
    try {
      await updateProfile(user.id, {
        username,
        fullName,
        email,
        phoneNumber,
        nationalNo,
        profileImage,
      });
      await refresh();
      notify("แก้ไขข้อมูลส่วนตัวสำเร็จ", "success");
      router.push("/profile");
    } catch (err) {
      notify(err instanceof ApiError ? err.message : "ไม่สามารถแก้ไขได้ กรุณาลองอีกครั้ง", "error");
    } finally {
      setSubmitting(false);
    }
  }

  if (!user) return null;

  return (
    <Container className="flex justify-center py-10">
      <div className="w-full max-w-2xl">
        <Card className="p-8">
          <h1 className="font-serif text-2xl font-bold text-stone-900">แก้ไขโปรไฟล์</h1>

          <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-4">
            <div className="flex items-center gap-4">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={profileImage} alt="" className="h-16 w-16 rounded-full object-cover" />
              <label className="cursor-pointer text-sm font-medium text-amber-700 underline">
                เปลี่ยนรูปโปรไฟล์
                <input
                  type="file"
                  accept="image/png,image/jpeg"
                  className="hidden"
                  onChange={handleFile}
                />
              </label>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="ชื่อผู้ใช้" error={errors.username}>
                <Input value={username} onChange={(e) => setUsername(e.target.value)} />
              </Field>
              <Field label="ชื่อ-นามสกุล" error={errors.fullName}>
                <Input value={fullName} onChange={(e) => setFullName(e.target.value)} />
              </Field>
              <Field label="อีเมล" error={errors.email}>
                <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
              </Field>
              <Field label="เบอร์โทรศัพท์ (ไม่บังคับ)" error={errors.phoneNumber}>
                <Input
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  placeholder="ตัวเลข 10 หลัก"
                />
              </Field>
              <Field label="เลขบัตรประชาชน (ไม่บังคับ)" error={errors.nationalNo}>
                <Input
                  value={nationalNo}
                  onChange={(e) => setNationalNo(e.target.value)}
                  placeholder="ตัวเลข 13 หลัก"
                />
              </Field>
            </div>

            <Button type="submit" disabled={submitting} className="mt-2 w-full">
              {submitting ? "กำลังบันทึก..." : "บันทึกการแก้ไข"}
            </Button>
          </form>
        </Card>

        {/*
          สมุดที่อยู่อยู่นอก <form> ของโปรไฟล์โดยตั้งใจ
          เพราะมันบันทึกเองทีละรายการ ถ้าซ้อนอยู่ในฟอร์มเดียวกันการกดปุ่มในนี้
          จะไปกระตุ้น submit ของฟอร์มโปรไฟล์แทน (ฟอร์มซ้อนฟอร์มไม่ได้ใน HTML)
        */}
        <Card className="mt-6 p-8">
          <h2 className="font-serif text-lg font-bold text-stone-900">ที่อยู่ของฉัน</h2>
          <p className="mb-4 text-sm text-stone-500">
            เพิ่มได้หลายที่อยู่ ระบบจะใช้รายการแรกเติมฟอร์มสัญญาโอนลิขสิทธิ์ให้อัตโนมัติ ·
            ที่อยู่บันทึกทันทีเมื่อกดปุ่มในส่วนนี้
          </p>

          {/*
            ผู้ขายต้องระบุว่าจะส่งของจากที่อยู่ไหน เพราะค่าจัดส่งคิดจากจังหวัดต้นทาง
            เตือนให้ชัดถ้ายังไม่ได้ตั้ง ไม่งั้นจะไปเจอตอนกดเผยแพร่ผลงานแล้วงง
          */}
          {isSeller && !hasPickupAddress && (
            <p className="mb-4 rounded-lg bg-amber-50 px-4 py-3 text-sm text-amber-900">
              คุณยังไม่ได้ตั้ง <span className="font-medium">ที่อยู่ต้นทางส่งของ</span> —
              ระบบใช้จังหวัดของที่อยู่นี้คำนวณค่าจัดส่ง และต้องตั้งก่อนถึงจะเผยแพร่ผลงานได้
            </p>
          )}

          <AddressBook
            showPickup={isSeller}
            onSetPickup={(id) =>
              runAddressAction(() => setPickupAddress(id), "ตั้งที่อยู่ต้นทางสำเร็จ")
            }
            addresses={user.addresses ?? []}
            busy={addressBusy}
            onAdd={(value: AddressDraft) =>
              runAddressAction(() => addAddress(value), "เพิ่มที่อยู่สำเร็จ")
            }
            onUpdate={(id, value) =>
              runAddressAction(() => updateAddress(id, value), "แก้ไขที่อยู่สำเร็จ")
            }
            onDelete={(id) => runAddressAction(() => deleteAddress(id), "ลบที่อยู่สำเร็จ")}
          />
        </Card>
      </div>
    </Container>
  );
}

export default function EditProfilePage() {
  return (
    <RequireUser>
      <EditProfileContent />
    </RequireUser>
  );
}
