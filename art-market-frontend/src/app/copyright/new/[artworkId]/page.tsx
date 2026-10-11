"use client";

import { FormEvent, use, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { RequireUser } from "@/components/RoleGuard";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/context/ToastContext";
import { addAddress, getArtwork, getMe, sendCopyrightTransfer, ApiError } from "@/lib/api";
import { Address, Artwork } from "@/types";
import { AddressDraft, AddressPicker } from "@/components/AddressBook";
import { Button, Card, Container, Field, Input, Spinner, Textarea } from "@/components/ui";
import { validateFullName, validateNationalNo, validateNotEmpty } from "@/lib/validation";

function SendCopyrightContent({ artworkId }: { artworkId: string }) {
  const { user } = useAuth();
  const { notify } = useToast();
  const router = useRouter();
  const [artwork, setArtwork] = useState<Artwork | null | undefined>(undefined);

  const [fullName, setFullName] = useState("");
  const [nationalNo, setNationalNo] = useState("");
  const [agreement, setAgreement] = useState(
    "ข้าพเจ้าตกลงซื้อสิทธิ์ในลิขสิทธิ์ของผลงานชิ้นนี้ตามราคาที่กำหนด และยินยอมปฏิบัติตามข้อตกลงการโอนลิขสิทธิ์ทุกประการ"
  );
  const [errors, setErrors] = useState<Record<string, string | null>>({});
  const [submitting, setSubmitting] = useState(false);

  /**
   * ที่อยู่ในสมุดของผู้ซื้อ — เลือกเอา ไม่ต้องพิมพ์ใหม่ทั้ง 7 ช่องทุกครั้งที่ขอลิขสิทธิ์
   * เพิ่มรายการใหม่ตรงนี้ได้ และที่เพิ่มจะเข้าสมุดที่อยู่ด้วย
   */
  const [savedAddresses, setSavedAddresses] = useState<Address[]>([]);
  const [selectedAddressId, setSelectedAddressId] = useState<string | null>(null);
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
      // เลือกรายการแรกให้ก่อน ผู้ซื้อส่วนใหญ่มีที่อยู่เดียว จะได้ไม่ต้องกดเลือกเอง
      if (list.length > 0) setSelectedAddressId(list[0].id);
    });
  }, [prefilled]);

  /** บันทึกที่อยู่ใหม่เข้าสมุดที่อยู่ แล้วคืนรายการล่าสุดให้ตัวเลือก */
  async function handleAddAddress(draft: AddressDraft): Promise<Address[]> {
    try {
      const updated = await addAddress(draft);
      const list = updated.addresses ?? [];
      setSavedAddresses(list);
      notify("บันทึกที่อยู่เรียบร้อยแล้ว", "success");
      return list;
    } catch (err) {
      notify(err instanceof ApiError ? err.message : "ไม่สามารถบันทึกที่อยู่ได้", "error");
      return savedAddresses;
    }
  }

  if (artwork === undefined) return <Spinner />;
  if (artwork === null) {
    return <Container className="py-16 text-center text-stone-600">ไม่พบข้อมูลงานศิลปะ</Container>;
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!user || !artwork) return;
    const selected = savedAddresses.find((a) => a.id === selectedAddressId) ?? null;
    const nextErrors = {
      fullName: validateFullName(fullName),
      nationalNo: validateNationalNo(nationalNo),
      // ที่อยู่ถูกตรวจตั้งแต่ตอนบันทึกเข้าสมุดแล้ว ตรงนี้เหลือแค่ "เลือกมาหรือยัง"
      address: selected ? null : "กรุณาเลือกที่อยู่สำหรับสัญญา",
      agreement: validateNotEmpty(agreement, "รายละเอียดข้อตกลง"),
    };
    setErrors(nextErrors);
    if (Object.values(nextErrors).some(Boolean) || !selected) {
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
        address: selected,
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
              {artwork.artworkName} · ราคาลิขสิทธิ์ {(artwork.copyrightPrice ?? 0).toLocaleString()} บาท
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="grid gap-4 sm:grid-cols-2">
          <Field label="ชื่อ-นามสกุล" error={errors.fullName}>
            <Input value={fullName} onChange={(e) => setFullName(e.target.value)} />
          </Field>
          <Field label="เลขบัตรประชาชน" error={errors.nationalNo}>
            <Input value={nationalNo} onChange={(e) => setNationalNo(e.target.value)} />
          </Field>
          <div className="sm:col-span-2">
            <Field label="ที่อยู่ในสัญญา" error={errors.address}>
              {/*
                เลือกจากสมุดที่อยู่แทนการพิมพ์ใหม่ทั้งชุด — ข้อมูลชุดนี้ผู้ซื้อกรอกไว้แล้ว
                ตั้งแต่สมัคร การพิมพ์ใหม่ทุกครั้งเสี่ยงให้ที่อยู่ในสัญญาไม่ตรงกับที่เคยให้ไว้
              */}
              <AddressPicker
                addresses={savedAddresses}
                selectedId={selectedAddressId}
                onSelect={(a) => setSelectedAddressId(a.id)}
                onAdd={handleAddAddress}
                emptyHint="ยังไม่มีที่อยู่ในระบบ กรุณาเพิ่มที่อยู่เพื่อใช้ในสัญญา"
              />
            </Field>
          </div>
          <div className="sm:col-span-2">
            <Field label="รายละเอียดข้อตกลง" error={errors.agreement}>
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
