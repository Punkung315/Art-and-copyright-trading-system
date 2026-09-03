"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import { RequireUser } from "@/components/RoleGuard";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/context/ToastContext";
import {
  getCopyrightTransfer,
  respondCopyrightTransfer,
  signCopyrightTransfer,
  ApiError,
} from "@/lib/api";
import { CopyrightTransfer } from "@/types";
import { Button, Card, Container, Field, Spinner, Textarea } from "@/components/ui";
import { StatusBadge } from "@/components/StatusBadge";
import { fileToDataUrl } from "@/lib/storage";
import { SignaturePad } from "@/components/SignaturePad";

function CopyrightDetailContent({ id }: { id: string }) {
  const { user } = useAuth();
  const { notify } = useToast();
  const [transfer, setTransfer] = useState<CopyrightTransfer | null | undefined>(undefined);
  const [responseDetail, setResponseDetail] = useState("");
  const [fileError, setFileError] = useState<string | null>(null);
  /** ลายเซ็นของ "ผู้ที่กำลังดูหน้านี้" — ผู้ขายใช้ตอนตอบรับ ผู้ซื้อใช้ตอนลงนาม */
  const [signature, setSignature] = useState("");
  const [signatureError, setSignatureError] = useState<string | null>(null);
  /** ไฟล์เอกสารที่เซ็นกระดาษแล้วสแกนกลับ — ไม่บังคับ แนบเพิ่มได้ถ้าต้องการ */
  const [signedDocument, setSignedDocument] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function load() {
    const t = await getCopyrightTransfer(id);
    setTransfer(t ?? null);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  if (transfer === undefined) return <Spinner />;
  if (transfer === null) {
    return <Container className="py-16 text-center text-stone-600">ไม่พบข้อมูลสัญญาการโอนลิขสิทธิ์</Container>;
  }

  const isBuyer = user?.id === transfer.buyerId;
  const isSeller = user?.id === transfer.sellerId;

  async function handleRespond(accept: boolean) {
    // ตอบรับ = ลงนามในฐานะผู้โอน จึงต้องมีลายมือชื่อ (พ.ร.บ. ลิขสิทธิ์ ม.17)
    // ปฏิเสธไม่ต้องเซ็น เพราะไม่มีการโอนเกิดขึ้น
    if (accept && !signature) {
      setSignatureError("กรุณาแนบลายมือชื่อเพื่อยืนยันการตอบรับ");
      return;
    }
    setSubmitting(true);
    try {
      await respondCopyrightTransfer(transfer!.id, accept, responseDetail, accept ? signature : undefined);
      await load();
      notify(accept ? "ยอมรับคำขอโอนลิขสิทธิ์แล้ว" : "ปฏิเสธคำขอโอนลิขสิทธิ์แล้ว", "success");
    } catch (err) {
      notify(err instanceof ApiError ? err.message : "ไม่สามารถบันทึกข้อมูลการต่อรองได้ กรุณาลองใหม่อีกครั้ง", "error");
    } finally {
      setSubmitting(false);
    }
  }

  /** แนบไฟล์เอกสารที่เซ็นกระดาษแล้ว — ทางเลือก ไม่ใช่สิ่งที่บังคับให้ลงนามได้ */
  async function handleSignedDocument(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0] ?? null;
    if (!file) return;
    if (!["image/png", "image/jpeg", "application/pdf"].includes(file.type)) {
      setFileError("ประเภทไฟล์ไม่ถูกต้อง");
      return;
    }
    setFileError(null);
    setSignedDocument(await fileToDataUrl(file));
  }

  async function handleSign() {
    if (!signature) {
      setSignatureError("กรุณาลงลายมือชื่อเพื่อยืนยันการรับโอนลิขสิทธิ์");
      return;
    }
    setSignatureError(null);
    setSubmitting(true);
    try {
      await signCopyrightTransfer(transfer!.id, signature, signedDocument || undefined);
      await load();
      notify("ลงนามสัญญาโอนลิขสิทธิ์สำเร็จ", "success");
    } catch (err2) {
      notify(err2 instanceof ApiError ? err2.message : "ระบบขัดข้อง ไม่สามารถบันทึกการลงนามได้", "error");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Container className="flex justify-center py-10">
      <Card className="w-full max-w-2xl p-8">
        <div className="mb-6 flex items-center gap-4">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={transfer.artworkImage} alt={transfer.artworkName} className="h-16 w-16 rounded-lg object-cover" />
          <div className="flex-1">
            <h1 className="font-serif text-xl font-bold text-stone-900">{transfer.artworkName}</h1>
            <p className="text-sm text-stone-500">
              ผู้ซื้อ {transfer.buyerName} · ผู้ขาย {transfer.sellerName}
            </p>
          </div>
          <StatusBadge status={transfer.transferStatus} domain="transfer" />
        </div>

        <div className="grid grid-cols-2 gap-4 rounded-lg bg-stone-50 p-4 text-sm">
          <div>
            <p className="text-stone-500">ราคาลิขสิทธิ์</p>
            <p className="font-medium text-stone-800">฿{transfer.price.toLocaleString()}</p>
          </div>
          <div>
            <p className="text-stone-500">วันที่ยื่นคำขอ</p>
            <p className="font-medium text-stone-800">
              {new Date(transfer.transferDate).toLocaleDateString("th-TH")}
            </p>
          </div>
          <div className="col-span-2">
            <p className="text-stone-500">ชื่อ-นามสกุลผู้ซื้อในสัญญา</p>
            <p className="font-medium text-stone-800">{transfer.fullName}</p>
          </div>
          <div className="col-span-2">
            <p className="text-stone-500">ที่อยู่</p>
            <p className="font-medium text-stone-800">
              {transfer.address.houseNo} หมู่ {transfer.address.villageNo || "-"}{" "}
              {transfer.address.thoroughfare} ต.{transfer.address.subDistrict} อ.
              {transfer.address.district} จ.{transfer.address.province}{" "}
              {transfer.address.postalCode}
            </p>
          </div>
        </div>

        <div className="mt-4">
          <p className="mb-1 text-sm font-medium text-stone-700">รายละเอียดข้อตกลง</p>
          {/* สัญญาเก่าที่บันทึกก่อนมีคอลัมน์ agreement จะไม่มีข้อความ — บอกให้ชัดแทนที่จะปล่อยว่าง */}
          <p className={`text-sm whitespace-pre-line ${transfer.agreement ? "text-stone-600" : "text-stone-400"}`}>
            {transfer.agreement || "ผู้ซื้อไม่ได้ระบุรายละเอียดข้อตกลงเพิ่มเติม"}
          </p>
        </div>

        {transfer.responseDetail && (
          <div className="mt-4 rounded-lg bg-amber-50 p-3">
            <p className="text-xs font-medium text-amber-800">ผู้ขายตอบกลับ</p>
            <p className="text-sm text-amber-700">{transfer.responseDetail}</p>
          </div>
        )}

        {isSeller && transfer.transferStatus === "requested" && (
          <div className="mt-6 flex flex-col gap-3 border-t border-stone-200 pt-5">
            <Field label="เหตุผล / รายละเอียดการตอบกลับ">
              <Textarea
                rows={3}
                value={responseDetail}
                onChange={(e) => setResponseDetail(e.target.value)}
                placeholder="ระบุเหตุผลในการยอมรับหรือปฏิเสธคำขอ"
              />
            </Field>
            {/*
              ลายมือชื่อผู้โอน — จำเป็นเฉพาะตอนตอบรับ
              ตอนปฏิเสธไม่ต้องเซ็นเพราะไม่มีการโอนเกิดขึ้น
            */}
            <SignaturePad
              label="ลายมือชื่อผู้โอน (จำเป็นเมื่อยอมรับคำขอ)"
              hint="สัญญาโอนลิขสิทธิ์ต้องมีลายมือชื่อทั้งผู้โอนและผู้รับโอน"
              value={signature}
              onChange={(v) => {
                setSignature(v);
                if (v) setSignatureError(null);
              }}
              disabled={submitting}
            />
            {signatureError && <p className="text-xs text-rose-600">{signatureError}</p>}

            <div className="flex gap-3">
              <Button onClick={() => handleRespond(true)} disabled={submitting} className="flex-1">
                ยอมรับและลงนาม
              </Button>
              <Button variant="danger" onClick={() => handleRespond(false)} disabled={submitting} className="flex-1">
                ปฏิเสธคำขอ
              </Button>
            </div>
          </div>
        )}

        {/*
          สถานะการชำระค่าลิขสิทธิ์ — แสดงให้ทั้งสองฝ่ายเห็นตั้งแต่ผู้ขายตอบรับ
          ผู้ขายต้องรู้ว่าเงินเข้าหรือยังก่อนที่ผู้ซื้อจะลงนาม
        */}
        {transfer.transferStatus !== "requested" && transfer.transferStatus !== "rejected" && (
          <div className="mt-4 flex items-center justify-between rounded-lg bg-stone-50 px-4 py-3 text-sm">
            <span className="text-stone-500">การชำระค่าลิขสิทธิ์</span>
            <span className="font-medium">
              {transfer.paymentStatus === "confirmed" && (
                <span className="text-emerald-700">
                  ชำระแล้ว ฿{(transfer.paidAmount ?? transfer.price).toLocaleString()}
                </span>
              )}
              {transfer.paymentStatus === "submitted" && (
                <span className="text-amber-700">รอผู้ดูแลระบบตรวจสอบสลิป</span>
              )}
              {transfer.paymentStatus === "rejected" && (
                <span className="text-rose-700">สลิปถูกปฏิเสธ ต้องอัปโหลดใหม่</span>
              )}
              {transfer.paymentStatus === "unpaid" && (
                <span className="text-stone-500">ยังไม่ได้ชำระเงิน</span>
              )}
            </span>
          </div>
        )}

        {/*
          ผู้ซื้อต้องจ่ายเงินก่อนถึงจะลงนามได้ (backend บังคับกฎเดียวกันใน signAgreement)
          จึงแยกเป็นสองขั้นชัดเจน แทนที่จะโชว์ปุ่มอัปโหลดสัญญาแล้วให้กดไปเจอ error
        */}
        {isBuyer && transfer.transferStatus === "accepted" && transfer.paymentStatus !== "confirmed" && (
          <div className="mt-6 flex flex-col items-start gap-2 border-t border-stone-200 pt-5">
            <p className="text-sm text-stone-600">
              {transfer.paymentStatus === "submitted"
                ? "อัปโหลดสลิปแล้ว รอผู้ดูแลระบบตรวจสอบก่อนจึงจะลงนามสัญญาได้"
                : "ผู้ขายยอมรับคำขอแล้ว ขั้นต่อไปคือชำระค่าลิขสิทธิ์ แล้วจึงลงนามสัญญา"}
            </p>
            {transfer.paymentStatus !== "submitted" && (
              <Link href={`/copyright/${transfer.id}/payment`}>
                <Button>
                  {transfer.paymentStatus === "rejected"
                    ? "อัปโหลดสลิปใหม่อีกครั้ง"
                    : `ชำระค่าลิขสิทธิ์ ฿${transfer.price.toLocaleString()}`}
                </Button>
              </Link>
            )}
          </div>
        )}

        {isBuyer && transfer.transferStatus === "accepted" && transfer.paymentStatus === "confirmed" && (
          <div className="mt-6 flex flex-col gap-2 border-t border-stone-200 pt-5">
            <p className="text-sm text-stone-600">
              ชำระค่าลิขสิทธิ์เรียบร้อยแล้ว กรุณาอ่านสัญญาแล้วลงลายมือชื่อเพื่อรับโอนลิขสิทธิ์
            </p>
            <Link href={`/copyright/${transfer.id}/print`} className="w-fit">
              <Button variant="secondary" type="button">
                อ่านสัญญาฉบับเต็มก่อนลงนาม
              </Button>
            </Link>

            <SignaturePad
              label="ลายมือชื่อผู้รับโอน"
              hint="ลงนามแล้วถือว่ายอมรับเงื่อนไขในสัญญาทั้งหมด"
              value={signature}
              onChange={(v) => {
                setSignature(v);
                if (v) setSignatureError(null);
              }}
              disabled={submitting}
            />
            {signatureError && <p className="text-xs text-rose-600">{signatureError}</p>}

            {/*
              ไฟล์เอกสารที่เซ็นกระดาษแล้ว — ทางเลือก ไม่ใช่เงื่อนไขในการลงนาม
              เดิมนี่คือสิ่งที่บังคับ ทำให้ต้องมีเครื่องพิมพ์กับสแกนเนอร์ถึงจะจบสัญญาได้
            */}
            <div>
              <p className="mb-1 text-sm font-medium text-stone-700">
                แนบเอกสารที่เซ็นกระดาษแล้ว <span className="text-stone-400">(ไม่บังคับ)</span>
              </p>
              <input
                type="file"
                accept="image/png,image/jpeg,application/pdf"
                onChange={handleSignedDocument}
                className="block w-full text-sm text-stone-600 file:mr-3 file:rounded-lg file:border-0 file:bg-stone-200 file:px-3 file:py-2 file:text-stone-700"
              />
              {fileError && <p className="mt-1 text-xs text-rose-600">{fileError}</p>}
              {signedDocument && <p className="mt-1 text-xs text-emerald-700">แนบไฟล์แล้ว</p>}
            </div>

            <Button onClick={handleSign} disabled={submitting} className="w-fit">
              {submitting ? "กำลังลงนาม..." : "ลงนามสัญญา"}
            </Button>
          </div>
        )}

        {(transfer.transferStatus === "signed" || transfer.transferStatus === "completed") && (
          <div className="mt-6 border-t border-stone-200 pt-5">
            <Link href={`/copyright/${transfer.id}/print`}>
              <Button variant="secondary">พิมพ์เอกสารการโอนลิขสิทธิ์</Button>
            </Link>
          </div>
        )}
      </Card>
    </Container>
  );
}

export default function CopyrightDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  return (
    <RequireUser>
      <CopyrightDetailContent id={id} />
    </RequireUser>
  );
}
