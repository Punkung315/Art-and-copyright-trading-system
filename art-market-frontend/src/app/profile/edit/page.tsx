"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { RequireUser } from "@/components/RoleGuard";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/context/ToastContext";
import { Button, Card, Container, Field, Input } from "@/components/ui";
import { validateEmail, validatePhone, validateUsername } from "@/lib/validation";
import { updateProfile, ApiError } from "@/lib/api";
import { fileToDataUrl } from "@/lib/storage";

function EditProfileContent() {
  const { user, refresh } = useAuth();
  const { notify } = useToast();
  const router = useRouter();

  const [username, setUsername] = useState(user?.username ?? "");
  const [fullName, setFullName] = useState(user?.fullName ?? "");
  const [email, setEmail] = useState(user?.email ?? "");
  const [phoneNumber, setPhoneNumber] = useState(user?.phoneNumber ?? "");
  const [profileImage, setProfileImage] = useState(user?.profileImage ?? "");
  const [errors, setErrors] = useState<Record<string, string | null>>({});
  const [submitting, setSubmitting] = useState(false);

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

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!user) return;
    const nextErrors = {
      username: validateUsername(username),
      email: validateEmail(email),
      phoneNumber: phoneNumber ? validatePhone(phoneNumber) : null,
    };
    setErrors(nextErrors);
    if (Object.values(nextErrors).some(Boolean)) {
      notify("กรุณากรอกข้อมูลให้ถูกต้อง", "error");
      return;
    }

    setSubmitting(true);
    try {
      await updateProfile(user.id, { username, fullName, email, phoneNumber, profileImage });
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
      <Card className="w-full max-w-lg p-8">
        <h1 className="font-serif text-2xl font-bold text-stone-900">แก้ไขโปรไฟล์</h1>

        <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-4">
          <div className="flex items-center gap-4">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={profileImage} alt="" className="h-16 w-16 rounded-full object-cover" />
            <label className="cursor-pointer text-sm font-medium text-amber-700 underline">
              เปลี่ยนรูปโปรไฟล์
              <input type="file" accept="image/png,image/jpeg" className="hidden" onChange={handleFile} />
            </label>
          </div>

          <Field label="ชื่อผู้ใช้ (username)" error={errors.username}>
            <Input value={username} onChange={(e) => setUsername(e.target.value)} />
          </Field>
          <Field label="ชื่อ-นามสกุล (fullName)">
            <Input value={fullName} onChange={(e) => setFullName(e.target.value)} />
          </Field>
          <Field label="อีเมล (email)" error={errors.email}>
            <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
          </Field>
          <Field label="เบอร์โทรศัพท์ (phoneNumber)" error={errors.phoneNumber}>
            <Input value={phoneNumber} onChange={(e) => setPhoneNumber(e.target.value)} />
          </Field>

          <Button type="submit" disabled={submitting} className="mt-2 w-full">
            {submitting ? "กำลังบันทึก..." : "บันทึกการแก้ไข"}
          </Button>
        </form>
      </Card>
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
