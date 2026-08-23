"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/context/ToastContext";
import { Button, Card, Container, Field, Input } from "@/components/ui";
import { validateEmail, validatePassword, validateUsername } from "@/lib/validation";
import { ApiError } from "@/lib/api";

export default function RegisterBuyerPage() {
  const { register } = useAuth();
  const { notify } = useToast();
  const router = useRouter();

  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState<Record<string, string | null>>({});
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const nextErrors = {
      username: validateUsername(username),
      email: validateEmail(email),
      password: validatePassword(password),
    };
    setErrors(nextErrors);
    if (Object.values(nextErrors).some(Boolean)) {
      notify("กรุณากรอกข้อมูลให้ถูกต้อง", "error");
      return;
    }

    setSubmitting(true);
    try {
      await register({ username, password, email });
      notify("สมัครสมาชิกสำเร็จ ยินดีต้อนรับ!", "success");
      router.push("/");
    } catch (err) {
      notify(err instanceof ApiError ? err.message : "ไม่สามารถสมัครสมาชิกได้", "error");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Container className="flex justify-center py-14">
      <Card className="w-full max-w-md p-8">
        <h1 className="font-serif text-2xl font-bold text-stone-900">สมัครสมาชิก</h1>
        <p className="mt-1 text-sm text-stone-500">
          สมัครสมาชิกเพื่อเริ่มเลือกซื้อผลงานศิลปะและลิขสิทธิ์ผลงาน
        </p>

        <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-4">
          <Field label="ชื่อผู้ใช้ (username)" error={errors.username}>
            <Input value={username} onChange={(e) => setUsername(e.target.value)} placeholder="8-20 ตัวอักษร ภาษาอังกฤษ/ตัวเลข" />
          </Field>
          <Field label="อีเมล (email)" error={errors.email}>
            <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" />
          </Field>
          <Field label="รหัสผ่าน (password)" error={errors.password}>
            <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="8-16 ตัวอักษร" />
          </Field>

          <Button type="submit" disabled={submitting} className="mt-2 w-full">
            {submitting ? "กำลังสมัครสมาชิก..." : "สมัครสมาชิก"}
          </Button>
        </form>

        <p className="mt-6 text-center text-sm text-stone-500">
          มีบัญชีอยู่แล้ว?{" "}
          <Link href="/login" className="font-medium text-amber-700 underline">
            เข้าสู่ระบบ
          </Link>
        </p>
      </Card>
    </Container>
  );
}
