"use client";

import { use, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { RequireUser } from "@/components/RoleGuard";
import { useToast } from "@/context/ToastContext";
import { getCopyrightPaymentPreview, payCopyrightTransfer, ApiError } from "@/lib/api";
import { CopyrightPaymentPreview } from "@/types";
import { Button, Card, Container, Spinner } from "@/components/ui";
import { fileToDataUrl } from "@/lib/storage";
import { validateImageFile } from "@/lib/validation";
import { BankTransferInfo } from "@/components/BankTransferInfo";

function CopyrightPaymentContent({ id }: { id: string }) {
  const [preview, setPreview] = useState<CopyrightPaymentPreview | null | undefined>(undefined);
  const [slip, setSlip] = useState<string>("");
  const [fileError, setFileError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const { notify } = useToast();
  const router = useRouter();

  useEffect(() => {
    getCopyrightPaymentPreview(id)
      .then(setPreview)
      .catch(() => setPreview(null));
  }, [id]);

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0] ?? null;
    const err = validateImageFile(file);
    setFileError(err);
    if (err || !file) return;
    setSlip(await fileToDataUrl(file));
  }

  async function handleSubmit() {
    if (!preview) return;
    if (!slip) {
      setFileError("กรุณาแนบสลิปการโอนเงินเพื่อยืนยัน");
      return;
    }
    setSubmitting(true);
    try {
      await payCopyrightTransfer(preview.copyrightId, slip);
      notify("อัปโหลดหลักฐานการชำระค่าลิขสิทธิ์สำเร็จ รอผู้ดูแลระบบตรวจสอบ", "success");
      router.push(`/copyright/${preview.copyrightId}`);
    } catch (err) {
      notify(
        err instanceof ApiError ? err.message : "ระบบขัดข้อง ไม่สามารถบันทึกหลักฐานได้ กรุณาลองใหม่อีกครั้ง",
        "error"
      );
    } finally {
      setSubmitting(false);
    }
  }

  if (preview === undefined) return <Spinner />;
  if (preview === null) {
    return (
      <Container className="py-16 text-center text-stone-600">
        ไม่พบข้อมูลสัญญาการโอนลิขสิทธิ์
      </Container>
    );
  }

  return (
    <Container className="flex justify-center py-10">
      <Card className="w-full max-w-lg p-8">
        <h1 className="font-serif text-2xl font-bold text-stone-900">ชำระค่าลิขสิทธิ์</h1>
        <p className="mt-1 text-sm text-stone-500">
          โอนเงินให้กับผู้ดูแลระบบตามยอดด้านล่าง แล้วแนบหลักฐานการโอนเงิน
        </p>

        <div className="mt-6 flex flex-col gap-2 rounded-lg bg-stone-50 p-4 text-sm">
          <div className="flex justify-between">
            <span className="text-stone-500">ผลงาน</span>
            <span className="font-medium text-stone-800">{preview.artworkName}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-stone-500">ผู้ขาย</span>
            <span>{preview.sellerName}</span>
          </div>
          <div className="flex justify-between border-t border-stone-200 pt-2 text-base font-semibold">
            <span>ยอดที่ต้องชำระ</span>
            <span>฿{preview.amount.toLocaleString()}</span>
          </div>
        </div>

        <BankTransferInfo />

        {preview.paymentStatus === "rejected" && (
          <p className="mt-4 rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">
            สลิปที่ส่งมาก่อนหน้านี้ถูกผู้ดูแลระบบปฏิเสธ กรุณาตรวจสอบยอดแล้วอัปโหลดใหม่
          </p>
        )}

        {/*
          เหตุผลที่จ่ายไม่ได้มาจาก backend ไม่ได้คิดเองที่นี่
          กฎมีหลายข้อ (รอผู้ขายตอบรับ, จ่ายไปแล้ว, สลิปรอตรวจ) ถ้าเขียนซ้ำสองที่
          ฝั่งที่ผิดจะเป็นหน้าเว็บที่ผู้ใช้เห็น
        */}
        {!preview.canPay ? (
          <div className="mt-6 rounded-lg bg-amber-50 px-4 py-3 text-sm text-amber-800">
            {preview.reason ?? "ยังไม่สามารถชำระเงินได้ในขณะนี้"}
          </div>
        ) : (
          <>
            <div className="mt-6">
              <p className="mb-2 text-sm font-medium text-stone-700">แนบหลักฐานการโอนเงิน (slip)</p>
              <input
                type="file"
                accept="image/png,image/jpeg"
                onChange={handleFile}
                className="block w-full text-sm text-stone-600 file:mr-3 file:rounded-lg file:border-0 file:bg-stone-900 file:px-3 file:py-2 file:text-white"
              />
              {fileError && <p className="mt-1 text-xs text-rose-600">{fileError}</p>}
              {slip && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={slip}
                  alt="slip"
                  className="mt-3 h-40 w-full rounded-lg border border-stone-200 object-contain"
                />
              )}
            </div>

            <Button onClick={handleSubmit} disabled={submitting} className="mt-6 w-full">
              {submitting ? "กำลังส่งหลักฐานการชำระเงิน..." : "ยืนยันการชำระค่าลิขสิทธิ์"}
            </Button>
          </>
        )}

        <Button
          variant="ghost"
          className="mt-3 w-full"
          onClick={() => router.push(`/copyright/${preview.copyrightId}`)}
        >
          กลับไปหน้าสัญญา
        </Button>
      </Card>
    </Container>
  );
}

export default function CopyrightPaymentPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  return (
    <RequireUser>
      <CopyrightPaymentContent id={id} />
    </RequireUser>
  );
}
