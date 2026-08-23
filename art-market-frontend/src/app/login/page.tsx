"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/context/ToastContext";
import { Button, Card, Container, Field, Input } from "@/components/ui";
import { ApiError } from "@/lib/api";

export default function LoginPage() {
  const { login } = useAuth();
  const { notify } = useToast();
  const router = useRouter();

  const [usernameOrEmail, setUsernameOrEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!usernameOrEmail || !password) {
      setError("กรุณากรอกข้อมูลให้ถูกต้อง");
      return;
    }
    setError(null);
    setSubmitting(true);
    try {
      await login(usernameOrEmail, password);
      notify("เข้าสู่ระบบสำเร็จ", "success");
      router.push("/");
    } catch (err) {
      const message = err instanceof ApiError ? err.message : "ไม่พบข้อมูลผู้ใช้";
      setError(message);
      notify(message, "error");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Container className="flex justify-center py-14">
      <Card className="w-full max-w-md p-8">
        <h1 className="font-serif text-2xl font-bold text-stone-900">เข้าสู่ระบบ</h1>
        <p className="mt-1 text-sm text-stone-500">เข้าสู่ระบบด้วยชื่อผู้ใช้หรืออีเมลของคุณ</p>

        <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-4">
          <Field label="ชื่อผู้ใช้ หรือ อีเมล" error={error}>
            <Input
              value={usernameOrEmail}
              onChange={(e) => setUsernameOrEmail(e.target.value)}
              placeholder="username หรือ email"
            />
          </Field>
          <Field label="รหัสผ่าน">
            <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
          </Field>

          <Button type="submit" disabled={submitting} className="mt-2 w-full">
            {submitting ? "กำลังเข้าสู่ระบบ..." : "เข้าสู่ระบบ"}
          </Button>
        </form>

        <p className="mt-6 text-center text-sm text-stone-500">
          ยังไม่มีบัญชี?{" "}
          <Link href="/register" className="font-medium text-amber-700 underline">
            สมัครสมาชิก
          </Link>
        </p>
        <p className="mt-2 text-center text-xs text-stone-400">
          ผู้ดูแลระบบ?{" "}
          <Link href="/admin/login" className="underline">
            เข้าสู่ระบบผู้ดูแลระบบ
          </Link>
        </p>

        <div className="mt-6 rounded-lg bg-stone-50 p-3 text-xs text-stone-500">
          <p className="font-medium text-stone-600">บัญชีทดสอบ</p>
          <p>ผู้ซื้อ: punchapong / password1</p>
          <p>ผู้ขาย (อนุมัติแล้ว): nichaart / password1</p>
          <p>ผู้ขาย (รออนุมัติ): pendingartist / password1</p>
        </div>
      </Card>
    </Container>
  );
}
