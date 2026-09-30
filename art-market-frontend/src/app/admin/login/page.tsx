"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/context/ToastContext";
import { Button, Card, Container, Field, Input } from "@/components/ui";
import { ApiError } from "@/lib/api";

export default function AdminLoginPage() {
  const { login } = useAuth();
  const { notify } = useToast();
  const router = useRouter();

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await login(username, password);
      notify("เข้าสู่ระบบผู้ดูแลระบบสำเร็จ", "success");
      router.push("/admin");
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
        <h1 className="font-serif text-2xl font-bold text-stone-900">เข้าสู่ระบบผู้ดูแลระบบ</h1>
        <p className="mt-1 text-sm text-stone-500">สำหรับผู้ดูแลระบบเท่านั้น</p>

        <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-4">
          <Field label="ชื่อผู้ใช้ผู้ดูแลระบบ" error={error}>
            <Input value={username} onChange={(e) => setUsername(e.target.value)} />
          </Field>
          <Field label="รหัสผ่าน">
            <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
          </Field>

          <Button type="submit" disabled={submitting} className="mt-2 w-full">
            {submitting ? "กำลังเข้าสู่ระบบ..." : "เข้าสู่ระบบ"}
          </Button>
        </form>

      </Card>
    </Container>
  );
}
