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
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { AgreementReadGate } from "@/components/CopyrightAgreementTerms";

function CopyrightDetailContent({ id }: { id: string }) {
  const { user } = useAuth();
  const { notify } = useToast();
  const [transfer, setTransfer] = useState<CopyrightTransfer | null | undefined>(undefined);
  /** เหตุผล — ใช้เฉพาะตอนปฏิเสธ (ตอบรับไม่ต้องมี) */
  const [rejectReason, setRejectReason] = useState("");
  const [rejectReasonError, setRejectReasonError] = useState<string | null>(null);
  /** true = ผู้ขายกดปฏิเสธแล้ว กำลังอยู่ในขั้นกรอกเหตุผลก่อนยืนยัน */
  const [rejecting, setRejecting] = useState(false);
  /**
   * การตัดสินใจที่รอยืนยันในกล่องยืนยัน — null = ยังไม่ได้กดอะไร
   * true = กำลังจะตอบรับ / false = กำลังจะปฏิเสธ
   *
   * ทั้งสองทางย้อนกลับไม่ได้: ตอบรับ = ลงนามในสัญญาโอนลิขสิทธิ์แต่เพียงผู้เดียว
   * ปฏิเสธ = ปิดคำขอฉบับนั้นถาวร จึงถามซ้ำอีกครั้งก่อนบันทึกทั้งคู่
   */
  const [pendingAction, setPendingAction] = useState<boolean | null>(null);
  /**
   * ติ๊กยอมรับสัญญาแล้วหรือยัง — ปลดล็อกได้ต่อเมื่อเลื่อนอ่านจนจบ (ดู AgreementReadGate)
   * แยกตัวแปรของผู้ขาย (ตอนตอบรับ) กับของผู้ซื้อ (ตอนลงนาม) เพราะเป็นคนละคนคนละจังหวะ
   */
  const [sellerAgreed, setSellerAgreed] = useState(false);
  const [buyerAgreed, setBuyerAgreed] = useState(false);
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

  /**
   * ตรวจข้อมูลให้ครบก่อน แล้วค่อยเปิดกล่องยืนยัน
   * ไม่เอาการตรวจไปไว้ในกล่องยืนยัน เพราะคนจะเจอ error หลังกดยืนยันไปแล้ว
   * ซึ่งอ่านเหมือนว่า "กดยืนยันแล้วแต่ระบบไม่ทำให้"
   */
  function askRespond(accept: boolean) {
    // ตอบรับ = ลงนามในฐานะผู้โอน จึงต้องมีลายมือชื่อ (พ.ร.บ. ลิขสิทธิ์ ม.17)
    // ปฏิเสธไม่ต้องเซ็น เพราะไม่มีการโอนเกิดขึ้น
    // ตอบรับ = ลงนามจริง จึงต้องอ่านสัญญาครบและติ๊กยอมรับก่อน
    // ปฏิเสธไม่ต้องอ่าน เพราะไม่ได้ตกลงอะไรเลย
    if (accept && !sellerAgreed) {
      notify("กรุณาอ่านสัญญาให้ครบและติ๊กยอมรับก่อนลงนาม", "error");
      return;
    }
    if (accept && !signature) {
      setSignatureError("กรุณาแนบลายมือชื่อเพื่อยืนยันการตอบรับ");
      return;
    }
    /*
     * ปฏิเสธต้องบอกเหตุผล ตอบรับไม่ต้อง — ผู้ซื้อที่ถูกปฏิเสธต้องรู้ว่าเพราะอะไร
     * จะได้แก้แล้วยื่นใหม่ได้ ส่วนการตอบรับนั้นลายมือชื่อคือคำตอบอยู่แล้ว
     * (backend บังคับกฎเดียวกัน ไม่ได้เชื่อหน้าเว็บอย่างเดียว)
     */
    if (!accept && !rejectReason.trim()) {
      setRejectReasonError("กรุณาระบุเหตุผลที่ปฏิเสธคำขอ");
      return;
    }
    setPendingAction(accept);
  }

  async function handleRespond(accept: boolean) {
    setSubmitting(true);
    try {
      await respondCopyrightTransfer(
        transfer!.id,
        accept,
        accept ? undefined : rejectReason.trim(),
        accept ? signature : undefined
      );
      await load();
      setPendingAction(null);
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
    if (!buyerAgreed) {
      notify("กรุณาอ่านสัญญาให้ครบและติ๊กยอมรับก่อนลงนาม", "error");
      return;
    }
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
            <p className="font-medium text-stone-800">{transfer.price.toLocaleString()} บาท</p>
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
            <p className="text-xs font-medium text-amber-800">
              {transfer.transferStatus === "rejected" ? "เหตุผลที่ผู้ขายปฏิเสธ" : "ผู้ขายตอบกลับ"}
            </p>
            <p className="text-sm text-amber-700">{transfer.responseDetail}</p>
          </div>
        )}

        {isSeller && transfer.transferStatus === "requested" && (
          <div className="mt-6 flex flex-col gap-3 border-t border-stone-200 pt-5">
            {rejecting ? (
              /*
                ขั้นกรอกเหตุผลก่อนยืนยันการปฏิเสธ — แยกเป็นคนละขั้นกับการตอบรับ
                ไม่ใช่ช่องเดียวที่โผล่ค้างไว้ให้ทั้งสองปุ่มใช้ร่วมกันเหมือนเดิม
                เพราะช่องร่วมทำให้ไม่รู้ว่าตกลงต้องกรอกหรือไม่ต้องกรอกกันแน่
              */
              <>
                <Field label="เหตุผลที่ปฏิเสธคำขอ" error={rejectReasonError}>
                  <Textarea
                    rows={3}
                    value={rejectReason}
                    onChange={(e) => {
                      setRejectReason(e.target.value);
                      if (e.target.value.trim()) setRejectReasonError(null);
                    }}
                    placeholder="เช่น ยังไม่ต้องการขายลิขสิทธิ์ของผลงานชิ้นนี้ / ราคาที่เสนอมายังไม่ตรงกับที่ตั้งใจไว้"
                  />
                </Field>
                <p className="text-xs text-stone-500">
                  ผู้ซื้อจะเห็นเหตุผลนี้ และนำไปใช้ตัดสินใจว่าจะยื่นคำขอใหม่หรือไม่
                </p>
                <div className="flex gap-3">
                  <Button
                    variant="danger"
                    onClick={() => askRespond(false)}
                    disabled={submitting}
                    className="flex-1"
                  >
                    {submitting ? "กำลังบันทึก..." : "ยืนยันการปฏิเสธ"}
                  </Button>
                  <Button
                    variant="ghost"
                    onClick={() => {
                      setRejecting(false);
                      setRejectReasonError(null);
                    }}
                    disabled={submitting}
                  >
                    ย้อนกลับ
                  </Button>
                </div>
              </>
            ) : (
              <>
                {/*
                  บังคับอ่านสัญญาก่อน แล้วค่อยเปิดช่องเซ็น
                  วางไว้เหนือช่องลายมือชื่อโดยตั้งใจ — ลำดับบนหน้าจอคือลำดับที่ควรทำ
                */}
                <AgreementReadGate
                  transfer={transfer}
                  accepted={sellerAgreed}
                  onAcceptedChange={setSellerAgreed}
                  disabled={submitting}
                  acceptLabel="ข้าพเจ้าได้อ่านสัญญาฉบับนี้โดยตลอดแล้ว และตกลงโอนลิขสิทธิ์ตามเงื่อนไขทั้งหมด"
                />

                {/*
                  ลายมือชื่อผู้โอน — จำเป็นเฉพาะตอนตอบรับ
                  ตอนปฏิเสธไม่ต้องเซ็นเพราะไม่มีการโอนเกิดขึ้น
                  ปิดไว้จนกว่าจะติ๊กยอมรับ จะได้ไม่เซ็นก่อนแล้วค่อยไปอ่านทีหลัง
                */}
                <SignaturePad
                  label="ลายมือชื่อผู้โอน"
                  hint="สัญญาโอนลิขสิทธิ์ต้องมีลายมือชื่อทั้งผู้โอนและผู้รับโอน — ตอบรับได้เมื่อลงลายมือชื่อแล้ว"
                  value={signature}
                  onChange={(v) => {
                    setSignature(v);
                    if (v) setSignatureError(null);
                  }}
                  disabled={submitting || !sellerAgreed}
                />
                {signatureError && <p className="text-xs text-rose-600">{signatureError}</p>}

                <div className="flex gap-3">
                  <Button
                    onClick={() => askRespond(true)}
                    disabled={submitting || !sellerAgreed}
                    className="flex-1"
                  >
                    ยอมรับและลงนาม
                  </Button>
                  <Button
                    variant="danger"
                    onClick={() => setRejecting(true)}
                    disabled={submitting}
                    className="flex-1"
                  >
                    ปฏิเสธคำขอ
                  </Button>
                </div>
              </>
            )}
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
                  ชำระแล้ว {(transfer.paidAmount ?? transfer.price).toLocaleString()} บาท
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
                    : `ชำระค่าลิขสิทธิ์ ${transfer.price.toLocaleString()} บาท`}
                </Button>
              </Link>
            )}
          </div>
        )}

        {isBuyer && transfer.transferStatus === "accepted" && transfer.paymentStatus === "confirmed" && (
          <div className="mt-6 flex flex-col gap-2 border-t border-stone-200 pt-5">
            <p className="text-sm text-stone-600">
              ชำระค่าลิขสิทธิ์เรียบร้อยแล้ว กรุณาอ่านสัญญาให้ครบแล้วลงลายมือชื่อเพื่อรับโอนลิขสิทธิ์
            </p>

            {/* อ่านในหน้านี้ได้เลย ไม่ต้องเปิดหน้าใหม่แล้วกลับมา (ของเดิมเป็นแค่ปุ่มลิงก์ที่ข้ามได้) */}
            <AgreementReadGate
              transfer={transfer}
              accepted={buyerAgreed}
              onAcceptedChange={setBuyerAgreed}
              disabled={submitting}
              acceptLabel="ข้าพเจ้าได้อ่านสัญญาฉบับนี้โดยตลอดแล้ว และตกลงรับโอนลิขสิทธิ์ตามเงื่อนไขทั้งหมด"
            />

            <SignaturePad
              label="ลายมือชื่อผู้รับโอน"
              hint="ลงนามแล้วถือว่ายอมรับเงื่อนไขในสัญญาทั้งหมด"
              value={signature}
              onChange={(v) => {
                setSignature(v);
                if (v) setSignatureError(null);
              }}
              disabled={submitting || !buyerAgreed}
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

            <Button
              onClick={handleSign}
              disabled={submitting || !buyerAgreed}
              className="w-fit"
            >
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

      {/*
        ถามซ้ำก่อนบันทึกทั้งสองทาง — ทั้งคู่ย้อนกลับไม่ได้
        ข้อความสรุป "ผลที่จะเกิดขึ้น" ไม่ใช่ถามซ้ำด้วยคำเดิม ไม่งั้นคนจะกดผ่านโดยไม่อ่าน
      */}
      <ConfirmDialog
        open={pendingAction !== null}
        destructive={pendingAction === false}
        busy={submitting}
        onCancel={() => setPendingAction(null)}
        onConfirm={() => handleRespond(pendingAction === true)}
        steps={
          pendingAction
            ? [
                {
                  title: "ยืนยันการตอบรับคำขอโอนลิขสิทธิ์?",
                  description:
                    `คุณกำลังลงนามโอนลิขสิทธิ์ของ "${transfer.artworkName}" ให้ ${transfer.buyerName} ` +
                    `ในราคา ${transfer.price.toLocaleString()} บาท — เป็นการโอนแต่เพียงผู้เดียวตลอดอายุการคุ้มครอง ` +
                    "งานชิ้นนี้จะขายลิขสิทธิ์ให้ผู้อื่นอีกไม่ได้ และยกเลิกการตอบรับภายหลังไม่ได้",
                  confirmLabel: "ยืนยันการตอบรับ",
                },
              ]
            : [
                {
                  title: "ยืนยันการปฏิเสธคำขอ?",
                  description:
                    `คำขอของ ${transfer.buyerName} จะถูกปิดและเปลี่ยนเป็นสถานะปฏิเสธ ` +
                    "ผู้ซื้อจะเห็นเหตุผลที่คุณระบุไว้ และต้องยื่นคำขอใหม่ถ้ายังต้องการซื้อลิขสิทธิ์ชิ้นนี้",
                  confirmLabel: "ยืนยันการปฏิเสธ",
                },
              ]
        }
      />
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
