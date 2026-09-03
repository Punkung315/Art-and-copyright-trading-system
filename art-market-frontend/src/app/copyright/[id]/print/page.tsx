"use client";

import { use, useEffect, useState } from "react";
import { RequireUser } from "@/components/RoleGuard";
import { getCopyrightTransfer } from "@/lib/api";
import { CopyrightTransfer } from "@/types";
import { Button, Card, Container, Spinner } from "@/components/ui";
import { CopyrightAgreementTerms } from "@/components/CopyrightAgreementTerms";

function thaiDate(iso?: string) {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleDateString("th-TH", { day: "numeric", month: "long", year: "numeric" });
}

/** ช่องลายมือชื่อ — ถ้ามีไฟล์ลายเซ็นแล้วให้แสดง ถ้ายังไม่มีให้เว้นบรรทัดไว้เซ็นด้วยมือ */
function SignatureBlock({
  role,
  name,
  signature,
  signedDate,
}: {
  role: string;
  name: string;
  signature?: string;
  signedDate?: string;
}) {
  const isImage = !!signature && (signature.startsWith("data:") || signature.startsWith("http"));
  const date = thaiDate(signedDate);

  return (
    <div className="break-inside-avoid text-center">
      <div className="mx-auto mb-1 flex h-20 w-full items-end justify-center border-b border-stone-400">
        {isImage && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={signature} alt={`ลายมือชื่อ${role}`} className="max-h-16 object-contain" />
        )}
      </div>
      <p className="text-sm text-stone-700">({name || "—"})</p>
      <p className="text-xs text-stone-500">{role}</p>
      {/*
        วันที่ลงนามของแต่ละฝ่ายแยกกัน ไม่ใช่วันที่ยื่นคำขอ
        หน้าเดิมเอา transferDate มาแปะว่า "วันที่ทำสัญญา" ซึ่งเป็นคนละวันกัน
      */}
      <p className="mt-1 text-xs text-stone-500">
        {date ? `ลงนามวันที่ ${date}` : "ยังไม่ได้ลงนาม"}
      </p>
    </div>
  );
}

function Row({ label, value }: { label: string; value?: string | null }) {
  return (
    <div className="flex gap-2 text-sm leading-relaxed">
      <span className="shrink-0 text-stone-500">{label}</span>
      <span className="font-medium text-stone-900">{value || "—"}</span>
    </div>
  );
}

function PrintContent({ id }: { id: string }) {
  const [transfer, setTransfer] = useState<CopyrightTransfer | null | undefined>(undefined);

  useEffect(() => {
    getCopyrightTransfer(id).then((t) => setTransfer(t ?? null));
  }, [id]);

  if (transfer === undefined) return <Spinner />;
  if (transfer === null) {
    return (
      <Container className="py-16 text-center text-stone-600">
        ไม่พบข้อมูลสัญญาการโอนลิขสิทธิ์
      </Container>
    );
  }

  const address = transfer.address;
  const addressLine =
    `${address.houseNo} หมู่ ${address.villageNo || "-"} ${address.thoroughfare || ""} ` +
    `ต.${address.subDistrict} อ.${address.district} จ.${address.province} ${address.postalCode}`;

  const effectiveDate = thaiDate(transfer.buyerSignedDate) ?? thaiDate(transfer.transferDate);

  return (
    <Container className="py-10">
      <div className="mb-4 flex justify-end print:hidden">
        <Button onClick={() => window.print()}>พิมพ์เอกสาร</Button>
      </div>

      <Card className="mx-auto max-w-3xl p-10 print:border-0 print:shadow-none">
        <header className="text-center">
          <h1 className="font-serif text-xl font-bold text-stone-900">สัญญาโอนลิขสิทธิ์ผลงานศิลปะ</h1>
          <p className="mt-0.5 text-xs uppercase tracking-wide text-stone-500">
            Copyright Assignment Agreement
          </p>
          <p className="mt-3 text-xs text-stone-500">
            เลขที่สัญญา CR-{String(transfer.id).padStart(5, "0")}
            {transfer.termsVersion ? ` · แบบสัญญา ${transfer.termsVersion}` : ""}
          </p>
        </header>

        <p className="mt-6 text-justify indent-8 text-sm leading-relaxed text-stone-700">
          สัญญาฉบับนี้ทำขึ้นระหว่างคู่สัญญาทั้งสองฝ่ายตามรายละเอียดด้านล่าง
          โดยทั้งสองฝ่ายตกลงทำสัญญาโอนลิขสิทธิ์ผลงานศิลปะกันตามข้อความดังต่อไปนี้
        </p>

        <section className="break-inside-avoid">
          <h2 className="mt-5 text-sm font-bold text-stone-900">ข้อ 1. คู่สัญญา</h2>
          <div className="mt-2 grid gap-4 sm:grid-cols-2">
            <div className="rounded-lg bg-stone-50 p-3 print:bg-transparent print:p-0">
              <p className="mb-1 text-xs font-semibold text-stone-500">ผู้โอน (เจ้าของลิขสิทธิ์เดิม)</p>
              <Row label="ชื่อ-นามสกุล" value={transfer.sellerName} />
            </div>
            <div className="rounded-lg bg-stone-50 p-3 print:bg-transparent print:p-0">
              <p className="mb-1 text-xs font-semibold text-stone-500">ผู้รับโอน</p>
              <Row label="ชื่อ-นามสกุล" value={transfer.fullName} />
              <Row label="เลขบัตรประชาชน" value={transfer.nationalNo} />
              <Row label="ที่อยู่" value={addressLine} />
            </div>
          </div>
        </section>

        <section className="break-inside-avoid">
          <h2 className="mt-5 text-sm font-bold text-stone-900">ข้อ 2. ผลงานที่โอนลิขสิทธิ์</h2>
          <div className="mt-2 flex gap-4">
            {transfer.artworkImage && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={transfer.artworkImage}
                alt={transfer.artworkName}
                className="h-28 w-28 shrink-0 rounded-lg border border-stone-200 object-cover"
              />
            )}
            <div className="flex flex-col gap-0.5">
              <Row label="ชื่อผลงาน" value={transfer.artworkName} />
              <Row label="รหัสผลงาน" value={`AW-${String(transfer.artworkId).padStart(5, "0")}`} />
              <Row label="ผู้สร้างสรรค์" value={transfer.sellerName} />
              {/*
                ราคาที่ตกลงกัน อ่านจาก agreedPrice ที่ล็อกไว้ตอนยื่นคำขอ
                ไม่ใช่ราคาลิขสิทธิ์ปัจจุบันของงาน ซึ่งผู้ขายแก้ได้ตลอด
              */}
              <Row
                label="ค่าตอบแทนการโอน"
                value={`${transfer.price.toLocaleString()} บาท`}
              />
            </div>
          </div>
        </section>

        <CopyrightAgreementTerms transfer={transfer} />

        {transfer.agreement && (
          <section className="break-inside-avoid">
            <h2 className="mt-5 text-sm font-bold text-stone-900">ข้อ 9. หมายเหตุเพิ่มเติมของผู้รับโอน</h2>
            <p className="mt-1.5 text-justify indent-8 text-sm leading-relaxed text-stone-700">
              {transfer.agreement}
            </p>
          </section>
        )}

        {transfer.responseDetail && (
          <section className="break-inside-avoid">
            <h2 className="mt-5 text-sm font-bold text-stone-900">ข้อ 10. หมายเหตุเพิ่มเติมของผู้โอน</h2>
            <p className="mt-1.5 text-justify indent-8 text-sm leading-relaxed text-stone-700">
              {transfer.responseDetail}
            </p>
          </section>
        )}

        <p className="mt-6 text-justify indent-8 text-sm leading-relaxed text-stone-700">
          สัญญานี้มีผลบังคับตั้งแต่วันที่ {effectiveDate ?? "—"} เป็นต้นไป
        </p>

        <div className="mt-10 grid grid-cols-2 gap-10">
          <SignatureBlock
            role="ผู้โอน"
            name={transfer.sellerName}
            signature={transfer.sellerSignature}
            signedDate={transfer.sellerSignedDate}
          />
          <SignatureBlock
            role="ผู้รับโอน"
            name={transfer.fullName}
            signedDate={transfer.buyerSignedDate}
          />
        </div>

        {transfer.documentFile && (
          <div className="mt-8 print:hidden">
            <p className="mb-2 text-xs font-medium text-stone-500">ไฟล์สัญญาที่ผู้รับโอนลงนามและอัปโหลด</p>
            {/*
              ไฟล์อาจเป็น PDF หรือเป็นชื่อไฟล์จากข้อมูลตัวอย่าง ซึ่งยัดลง <img> ไม่ได้
              ถ้าไม่แยกเคสจะขึ้นไอคอนรูปเสีย ดูเหมือนระบบพัง ทั้งที่แค่ไม่ใช่ไฟล์รูป
              (หลักเดียวกับ isDisplayableImage ในหน้าตรวจสลิปของผู้ดูแลระบบ)
            */}
            {transfer.documentFile.startsWith("data:image/") ||
            transfer.documentFile.startsWith("http") ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={transfer.documentFile}
                alt="เอกสารสัญญาที่ลงนามแล้ว"
                className="max-h-72 rounded-lg border border-stone-200 object-contain"
              />
            ) : (
              <p className="rounded-lg bg-stone-50 p-3 text-sm text-stone-600">
                แนบไฟล์ไว้ในชื่อ{" "}
                <span className="font-medium text-stone-900">{transfer.documentFile}</span>
              </p>
            )}
          </div>
        )}
      </Card>
    </Container>
  );
}

export default function PrintCopyrightPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  return (
    <RequireUser>
      <PrintContent id={id} />
    </RequireUser>
  );
}
