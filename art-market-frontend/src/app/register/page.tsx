"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/context/ToastContext";
import { Button, Card, Container, Field, Input } from "@/components/ui";
import {
  validateEmail,
  validateFullName,
  validateNationalNo,
  validateNotEmpty,
  validatePassword,
  validatePhone,
  validatePostalCode,
  validateUsername,
} from "@/lib/validation";
import { ApiError } from "@/lib/api";

/**
 * สมัครสมาชิก (ผู้ซื้อ)
 *
 * เก็บข้อมูลที่ระบบจำเป็นต้องใช้ให้ครบในหน้าเดียว ไม่ใช่ค่อยไปขอทีหลังเป็นจุด ๆ
 * (ที่อยู่ตอนยืนยันคำสั่งซื้อ / ชื่อจริงกับเลขบัตรตอนทำสัญญาลิขสิทธิ์)
 * เพราะการถูกขัดจังหวะกลางทางตอนกำลังจะซื้อของคือจุดที่คนเลิกทำมากที่สุด
 *
 * แบ่งเป็นสองส่วนด้วยหัวข้อ ไม่ใช่สองขั้นตอน — ฟอร์มยาวแต่เห็นจบในหน้าเดียว
 * ยังกรอกเร็วกว่าการกดผ่านหลายหน้าและทำให้คนรู้ตั้งแต่แรกว่าต้องเตรียมอะไรบ้าง
 */
export default function RegisterBuyerPage() {
  const { register } = useAuth();
  const { notify } = useToast();
  const router = useRouter();

  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
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
  const [errors, setErrors] = useState<Record<string, string | null>>({});
  const [submitting, setSubmitting] = useState(false);

  /**
   * ล้าง error ของช่องนั้นทันทีที่ผู้ใช้เริ่มแก้
   *
   * ฟอร์มตรวจตอนกดสมัครเท่านั้น ถ้าไม่ล้างให้ ข้อความแดง "กรุณากรอก..." จะค้างอยู่
   * ใต้ช่องที่ผู้ใช้เพิ่งกรอกเสร็จ จนกว่าจะกดสมัครอีกรอบ — อ่านแล้วเหมือนยังกรอกผิดอยู่
   * ทั้งที่ถูกแล้ว (เห็นชัดมากในฟอร์มยาว ๆ แบบนี้ที่มีหลายช่องขึ้นแดงพร้อมกัน)
   */
  function bind(field: string, set: (v: string) => void) {
    return (e: React.ChangeEvent<HTMLInputElement>) => {
      set(e.target.value);
      setErrors((prev) => (prev[field] ? { ...prev, [field]: null } : prev));
    };
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const nextErrors = {
      username: validateUsername(username),
      email: validateEmail(email),
      password: validatePassword(password),
      fullName: validateFullName(fullName),
      phoneNumber: validatePhone(phoneNumber),
      nationalNo: validateNationalNo(nationalNo),
      subDistrict: validateNotEmpty(subDistrict, "ตำบล/แขวง"),
      district: validateNotEmpty(district, "อำเภอ/เขต"),
      province: validateNotEmpty(province, "จังหวัด"),
      postalCode: validatePostalCode(postalCode),
    };
    setErrors(nextErrors);
    if (Object.values(nextErrors).some(Boolean)) {
      notify("กรุณากรอกข้อมูลให้ถูกต้อง", "error");
      return;
    }

    setSubmitting(true);
    try {
      await register({
        username,
        password,
        email,
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
      });
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
      <Card className="w-full max-w-2xl p-8">
        <h1 className="font-serif text-2xl font-bold text-stone-900">สมัครสมาชิก</h1>
        <p className="mt-1 text-sm text-stone-500">
          สมัครสมาชิกเพื่อเริ่มเลือกซื้อผลงานศิลปะและลิขสิทธิ์ผลงาน
          กรอกครั้งเดียวจบ ไม่ต้องมากรอกเพิ่มตอนสั่งซื้อ
        </p>

        <form onSubmit={handleSubmit} className="mt-6 grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <h2 className="font-serif text-lg font-bold text-stone-900">บัญชีผู้ใช้</h2>
          </div>

          <Field label="ชื่อผู้ใช้" error={errors.username}>
            <Input value={username} onChange={bind("username", setUsername)} placeholder="ชื่อผู้ใช้" />
          </Field>
          <Field label="อีเมล" error={errors.email}>
            <Input
              type="email"
              value={email}
              onChange={bind("email", setEmail)}
              placeholder="you@example.com"
            />
          </Field>
          <Field label="รหัสผ่าน" error={errors.password}>
            <Input
              type="password"
              value={password}
              onChange={bind("password", setPassword)}
              placeholder="รหัสผ่าน"
            />
          </Field>

          <div className="mt-2 border-t border-stone-100 pt-5 sm:col-span-2">
            <h2 className="font-serif text-lg font-bold text-stone-900">ข้อมูลผู้ซื้อ</h2>
            <p className="mt-1 text-sm text-stone-500">
              ใช้เป็นชื่อผู้รับสินค้า และเป็นข้อมูลคู่สัญญาเมื่อขอซื้อลิขสิทธิ์ผลงาน
            </p>
          </div>

          <Field label="ชื่อ-นามสกุล" error={errors.fullName}>
            <Input
              value={fullName}
              onChange={bind("fullName", setFullName)}
              placeholder="ชื่อ นามสกุล"
            />
          </Field>
          <Field label="เบอร์โทรศัพท์" error={errors.phoneNumber}>
            <Input
              value={phoneNumber}
              onChange={bind("phoneNumber", setPhoneNumber)}
              placeholder="0812345678"
            />
          </Field>
          <Field label="เลขบัตรประชาชน" error={errors.nationalNo}>
            <Input
              value={nationalNo}
              onChange={bind("nationalNo", setNationalNo)}
              placeholder="13 หลัก"
            />
          </Field>

          <div className="mt-2 border-t border-stone-100 pt-5 sm:col-span-2">
            <h2 className="font-serif text-lg font-bold text-stone-900">ที่อยู่สำหรับจัดส่ง</h2>
            <p className="mt-1 text-sm text-stone-500">
              เพิ่มที่อยู่อื่นได้ภายหลัง และเลือกได้ว่าจะส่งไปที่ไหนตอนสั่งซื้อ
            </p>
          </div>

          <Field label="บ้านเลขที่">
            <Input value={houseNo} onChange={(e) => setHouseNo(e.target.value)} />
          </Field>
          <Field label="หมู่ที่">
            <Input value={villageNo} onChange={(e) => setVillageNo(e.target.value)} />
          </Field>
          <Field label="ถนน">
            <Input value={thoroughfare} onChange={(e) => setThoroughfare(e.target.value)} />
          </Field>
          <Field label="ตำบล" error={errors.subDistrict}>
            <Input value={subDistrict} onChange={bind("subDistrict", setSubDistrict)} />
          </Field>
          <Field label="อำเภอ" error={errors.district}>
            <Input value={district} onChange={bind("district", setDistrict)} />
          </Field>
          <Field label="จังหวัด" error={errors.province}>
            <Input value={province} onChange={bind("province", setProvince)} />
          </Field>
          <Field label="รหัสไปรษณีย์" error={errors.postalCode}>
            <Input
              value={postalCode}
              onChange={bind("postalCode", setPostalCode)}
              placeholder="5 หลัก"
            />
          </Field>

          <Button type="submit" disabled={submitting} className="mt-2 sm:col-span-2">
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
