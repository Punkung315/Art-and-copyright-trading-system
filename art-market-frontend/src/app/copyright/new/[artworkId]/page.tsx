"use client";

import { FormEvent, use, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { RequireUser } from "@/components/RoleGuard";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/context/ToastContext";
import { getArtwork, getMe, sendCopyrightTransfer, ApiError } from "@/lib/api";
import { Address, Artwork } from "@/types";
import { formatAddress } from "@/components/AddressBook";
import { Button, Card, Container, Field, Input, Spinner, Textarea } from "@/components/ui";
import {
  validateFullName,
  validateNationalNo,
  validateNotEmpty,
  validatePostalCode,
} from "@/lib/validation";

function SendCopyrightContent({ artworkId }: { artworkId: string }) {
  const { user } = useAuth();
  const { notify } = useToast();
  const router = useRouter();
  const [artwork, setArtwork] = useState<Artwork | null | undefined>(undefined);

  const [fullName, setFullName] = useState("");
  const [nationalNo, setNationalNo] = useState("");
  const [houseNo, setHouseNo] = useState("");
  const [villageNo, setVillageNo] = useState("");
  const [thoroughfare, setThoroughfare] = useState("");
  const [subDistrict, setSubDistrict] = useState("");
  const [district, setDistrict] = useState("");
  const [province, setProvince] = useState("");
  const [postalCode, setPostalCode] = useState("");
  const [agreement, setAgreement] = useState(
    "ข้าพเจ้าตกลงซื้อสิทธิ์ในลิขสิทธิ์ของผลงานชิ้นนี้ตามราคาที่กำหนด และยินยอมปฏิบัติตามข้อตกลงการโอนลิขสิทธิ์ทุกประการ"
  );
  const [errors, setErrors] = useState<Record<string, string | null>>({});
  const [submitting, setSubmitting] = useState(false);

  /** ที่อยู่ในสมุดของผู้ซื้อ ไว้ให้เลือกเติมฟอร์มแทนการพิมพ์เองทุกช่อง */
  const [savedAddresses, setSavedAddresses] = useState<Address[]>([]);
  const [prefilled, setPrefilled] = useState(false);

  useEffect(() => {
    getArtwork(artworkId).then((a) => setArtwork(a ?? null));
  }, [artworkId]);

  /*
   * เติมข้อมูลที่ระบบมีอยู่แล้วให้อัตโนมัติ — ชื่อจริง เลขบัตรประชาชน และที่อยู่แรก
   *
   * ผู้ซื้อกรอกข้อมูลชุดนี้ไปแล้วตอนสมัคร/แก้โปรไฟล์ การให้พิมพ์ใหม่ทุกครั้งที่ขอลิขสิทธิ์
   * นอกจากเสียเวลาแล้วยังเสี่ยงพิมพ์เลขบัตรผิดจนสัญญาใช้ไม่ได้
   *
   * เติมครั้งเดียวตอนโหลด (prefilled) ไม่เขียนทับสิ่งที่ผู้ใช้แก้เองทีหลัง
   * เพราะข้อมูลในสัญญาอาจตั้งใจให้ต่างจากโปรไฟล์ เช่นใช้ที่อยู่บริษัท
   */
  useEffect(() => {
    if (prefilled) return;
    getMe().then((me) => {
      if (!me) return;
      setPrefilled(true);
      if (me.fullName) setFullName(me.fullName);
      if (me.nationalNo) setNationalNo(me.nationalNo);

      const list = me.addresses ?? [];
      setSavedAddresses(list);
      if (list.length > 0) applyAddress(list[0]);
    });
  }, [prefilled]);

  function applyAddress(a: Address) {
    setHouseNo(a.houseNo ?? "");
    setVillageNo(a.villageNo ?? "");
    setThoroughfare(a.thoroughfare ?? "");
    setSubDistrict(a.subDistrict ?? "");
    setDistrict(a.district ?? "");
    setProvince(a.province ?? "");
    setPostalCode(a.postalCode ?? "");
  }

  if (artwork === undefined) return <Spinner />;
  if (artwork === null) {
    return <Container className="py-16 text-center text-stone-600">ไม่พบข้อมูลงานศิลปะ</Container>;
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!user || !artwork) return;
    const nextErrors = {
      fullName: validateFullName(fullName),
      nationalNo: validateNationalNo(nationalNo),
      houseNo: validateNotEmpty(houseNo, "บ้านเลขที่"),
      subDistrict: validateNotEmpty(subDistrict, "ตำบล"),
      district: validateNotEmpty(district, "อำเภอ"),
      province: validateNotEmpty(province, "จังหวัด"),
      postalCode: validatePostalCode(postalCode),
      agreement: validateNotEmpty(agreement, "รายละเอียดข้อตกลง"),
    };
    setErrors(nextErrors);
    if (Object.values(nextErrors).some(Boolean)) {
      notify("กรุณากรอกข้อมูลให้ถูกต้อง", "error");
      return;
    }

    setSubmitting(true);
    try {
      const transfer = await sendCopyrightTransfer({
        artwork,
        buyer: user,
        fullName,
        nationalNo,
        address: {
          id: "addr_tmp",
          houseNo,
          villageNo,
          thoroughfare,
          subDistrict,
          district,
          province,
          postalCode,
        },
        agreement,
      });
      notify("ส่งคำขอโอนลิขสิทธิ์สำเร็จ รอผู้ขายตรวจสอบ", "success");
      router.push(`/copyright/${transfer.id}`);
    } catch (err) {
      notify(err instanceof ApiError ? err.message : "ไม่สามารถบันทึกรายละเอียดสัญญาได้ กรุณาลองใหม่อีกครั้ง", "error");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Container className="flex justify-center py-10">
      <Card className="w-full max-w-2xl p-8">
        <div className="mb-6 flex items-center gap-4">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={artwork.artworkImage} alt={artwork.artworkName} className="h-16 w-16 rounded-lg object-cover" />
          <div>
            <h1 className="font-serif text-xl font-bold text-stone-900">ส่งคำขอโอนลิขสิทธิ์</h1>
            <p className="text-sm text-stone-500">
              {artwork.artworkName} · ราคาลิขสิทธิ์ ฿{(artwork.copyrightPrice ?? 0).toLocaleString()}
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="grid gap-4 sm:grid-cols-2">
          <Field label="ชื่อ-นามสกุล (fullName)" error={errors.fullName}>
            <Input value={fullName} onChange={(e) => setFullName(e.target.value)} />
          </Field>
          <Field label="เลขบัตรประชาชน (nationalNo)" error={errors.nationalNo}>
            <Input value={nationalNo} onChange={(e) => setNationalNo(e.target.value)} />
          </Field>
          {/*
            มีที่อยู่ในสมุดมากกว่าหนึ่งรายการ ให้เลือกเติมได้ ไม่ต้องพิมพ์ใหม่ทั้งชุด
            ระบบเติมรายการแรกให้ตั้งแต่โหลดหน้าแล้ว ปุ่มนี้ไว้สลับไปใช้ที่อยู่อื่น
          */}
          {savedAddresses.length > 1 && (
            <div className="sm:col-span-2">
              <p className="mb-2 text-sm font-medium text-stone-700">เติมจากที่อยู่ที่บันทึกไว้</p>
              <div className="flex flex-wrap gap-2">
                {savedAddresses.map((a) => (
                  <Button
                    key={a.id}
                    type="button"
                    variant="secondary"
                    onClick={() => applyAddress(a)}
                  >
                    {formatAddress(a).slice(0, 40)}
                  </Button>
                ))}
              </div>
            </div>
          )}

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
            <Input value={postalCode} onChange={(e) => setPostalCode(e.target.value)} />
          </Field>
          <div className="sm:col-span-2">
            <Field label="รายละเอียดข้อตกลง (agreement)" error={errors.agreement}>
              <Textarea rows={4} value={agreement} onChange={(e) => setAgreement(e.target.value)} />
            </Field>
          </div>

          <Button type="submit" disabled={submitting} className="mt-2 sm:col-span-2">
            {submitting ? "กำลังส่งคำขอ..." : "ส่งคำขอโอนลิขสิทธิ์ให้ผู้ขาย"}
          </Button>
        </form>
      </Card>
    </Container>
  );
}

export default function SendCopyrightPage({
  params,
}: {
  params: Promise<{ artworkId: string }>;
}) {
  const { artworkId } = use(params);
  return (
    <RequireUser>
      <SendCopyrightContent artworkId={artworkId} />
    </RequireUser>
  );
}
