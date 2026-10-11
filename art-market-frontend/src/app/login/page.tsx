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
      const loggedIn = await login(usernameOrEmail, password);
      notify("เข้าสู่ระบบสำเร็จ", "success");
      /*
       * ผู้ขายที่อนุมัติแล้วเข้ามาเพื่อจัดการร้านของตัวเอง (ตอบความพร้อมขาย อัปเดต
       * สถานะจัดส่ง ตอบคำขอลิขสิทธิ์) ไม่ใช่เพื่อเดินดูงานในหน้าแรก จึงพาไปแดชบอร์ดเลย
       *
       * คนที่ยังรออนุมัติหรือถูกปฏิเสธไปหน้าแรกตามเดิม เพราะแดชบอร์ดยังใช้ไม่ได้
       * (RequireSeller จะขึ้นเป็นกล่องบอกสถานะแทนทั้งหน้า) — เจอหน้าตันตั้งแต่เข้าระบบ
       */
      const toDashboard =
        loggedIn?.roles.includes("seller") && loggedIn.sellerStatus === "approved";
      router.push(toDashboard ? "/seller" : "/");
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
              placeholder="ชื่อผู้ใช้ หรือ อีเมล"
            />
          </Field>
          <Field label="รหัสผ่าน">
            <Input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="รหัสผ่าน"/>
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
      </Card>
    </Container>
  );
}
