"use client";

import { use, useEffect, useState } from "react";
import { RequireUser } from "@/components/RoleGuard";
import { getCopyrightTransfer } from "@/lib/api";
import { CopyrightTransfer } from "@/types";
import { Button, Card, Container, Spinner } from "@/components/ui";

function PrintContent({ id }: { id: string }) {
  const [transfer, setTransfer] = useState<CopyrightTransfer | null | undefined>(undefined);

  useEffect(() => {
    getCopyrightTransfer(id).then((t) => setTransfer(t ?? null));
  }, [id]);

  if (transfer === undefined) return <Spinner />;
  if (transfer === null) {
    return <Container className="py-16 text-center text-stone-600">ไม่พบข้อมูลงานศิลปะ</Container>;
  }

  return (
    <Container className="py-10">
      <div className="mb-4 flex justify-end print:hidden">
        <Button onClick={() => window.print()}>พิมพ์เอกสาร</Button>
      </div>

      <Card className="mx-auto max-w-2xl p-10 print:border-0 print:shadow-none">
        <h1 className="text-center font-serif text-xl font-bold uppercase tracking-wide text-stone-900">
          Transfer of Copyright Agreement
        </h1>
        <p className="mt-1 text-center text-xs text-stone-500">สัญญาการโอนลิขสิทธิ์ผลงานศิลปะ</p>

        <div className="mt-8 flex flex-col gap-4 text-sm leading-relaxed text-stone-700">
          <p>
            ผลงาน: <span className="font-medium">{transfer.artworkName}</span>
          </p>
          <p>
            ผู้โอนสิทธิ์ (ผู้ขาย): <span className="font-medium">{transfer.sellerName}</span>
          </p>
          <p>
            ผู้รับโอนสิทธิ์ (ผู้ซื้อ): <span className="font-medium">{transfer.fullName}</span> (เลขบัตรประชาชน{" "}
            {transfer.nationalNo})
          </p>
          <p>
            ที่อยู่: {transfer.address.houseNo} หมู่ {transfer.address.villageNo || "-"}{" "}
            {transfer.address.thoroughfare} ต.{transfer.address.subDistrict} อ.{transfer.address.district} จ.
            {transfer.address.province} {transfer.address.postalCode}
          </p>
          <p>
            ราคาลิขสิทธิ์: <span className="font-medium">฿{transfer.price.toLocaleString()}</span>
          </p>
          <p>ข้อตกลง: {transfer.agreement}</p>
          <p>
            วันที่ทำสัญญา: {new Date(transfer.transferDate).toLocaleDateString("th-TH")}
          </p>
        </div>

        <div className="mt-16 grid grid-cols-2 gap-8 text-center text-sm">
          <div>
            <div className="mb-2 h-16 border-b border-stone-400" />
            <p>ลายมือชื่อผู้ขาย</p>
            <p className="text-stone-500">({transfer.sellerName})</p>
          </div>
          <div>
            <div className="mb-2 h-16 border-b border-stone-400" />
            <p>ลายมือชื่อผู้ซื้อ</p>
            <p className="text-stone-500">({transfer.fullName})</p>
          </div>
        </div>

        {transfer.documentFile && (
          <div className="mt-8 print:hidden">
            <p className="mb-2 text-xs font-medium text-stone-500">ไฟล์สัญญาที่ผู้ซื้ออัปโหลด</p>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={transfer.documentFile} alt="signed document" className="max-h-72 rounded-lg border border-stone-200 object-contain" />
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
