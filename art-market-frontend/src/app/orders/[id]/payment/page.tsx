"use client";

import { use, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { RequireUser } from "@/components/RoleGuard";
import { useToast } from "@/context/ToastContext";
import { getOrder, makePayment, ApiError } from "@/lib/api";
import { Order } from "@/types";
import { Button, Card, Container, Spinner } from "@/components/ui";
import { fileToDataUrl } from "@/lib/storage";
import { validateImageFile } from "@/lib/validation";

function PaymentContent({ id }: { id: string }) {
  const [order, setOrder] = useState<Order | null | undefined>(undefined);
  const [slip, setSlip] = useState<string>("");
  const [fileError, setFileError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const { notify } = useToast();
  const router = useRouter();

  useEffect(() => {
    getOrder(id).then((o) => setOrder(o ?? null));
  }, [id]);

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0] ?? null;
    const err = validateImageFile(file);
    setFileError(err);
    if (err || !file) return;
    setSlip(await fileToDataUrl(file));
  }

  async function handleSubmit() {
    if (!order) return;
    if (!slip) {
      setFileError("กรุณาแนบสลิปการโอนเงินเพื่อยืนยัน");
      return;
    }
    setSubmitting(true);
    try {
      await makePayment(order.id, slip);
      notify("อัปโหลดหลักฐานการชำระเงินสำเร็จ รอผู้ดูแลระบบตรวจสอบ", "success");
      router.push(`/orders/${order.id}`);
    } catch (err) {
      notify(err instanceof ApiError ? err.message : "ระบบขัดข้อง ไม่สามารถบันทึกหลักฐานได้ กรุณาลองใหม่อีกครั้ง", "error");
    } finally {
      setSubmitting(false);
    }
  }

  if (order === undefined) return <Spinner />;
  if (order === null) {
    return <Container className="py-16 text-center text-stone-600">ไม่พบคำสั่งซื้อ</Container>;
  }

  return (
    <Container className="flex justify-center py-10">
      <Card className="w-full max-w-lg p-8">
        <h1 className="font-serif text-2xl font-bold text-stone-900">ชำระเงิน</h1>
        <p className="mt-1 text-sm text-stone-500">
          โอนเงินให้กับผู้ดูแลระบบตามยอดด้านล่าง แล้วแนบหลักฐานการโอนเงิน
        </p>

        {/*
          ต้องใช้ยอด payable ไม่ใช่ยอดเต็มของคำสั่งซื้อ
          ถ้าผู้ขายบางรายแจ้งไม่พร้อมจำหน่าย ชิ้นนั้นถูกตัดออกจากยอดแล้ว
          ถ้าโชว์ยอดเต็ม ผู้ซื้อจะโอนเกินและไม่ตรงกับยอดที่ backend บันทึกไว้
        */}
        <div className="mt-6 flex flex-col gap-2 rounded-lg bg-stone-50 p-4 text-sm">
          <div className="flex justify-between">
            <span className="text-stone-500">ราคารวมชิ้นงาน</span>
            <span>฿{order.payableTotalAmount.toLocaleString()}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-stone-500">ค่าจัดส่ง</span>
            <span>฿{order.payableShippingCost.toLocaleString()}</span>
          </div>
          <div className="flex justify-between border-t border-stone-200 pt-2 text-base font-semibold">
            <span>ยอดที่ต้องชำระ</span>
            <span>฿{order.payableGrandTotal.toLocaleString()}</span>
          </div>
          {order.payableGrandTotal !== order.grandTotal && (
            <p className="text-xs text-stone-500">
              ไม่รวมผลงานที่ผู้ขายแจ้งว่าไม่พร้อมจำหน่าย (ยอดเต็มของคำสั่งซื้อคือ ฿
              {order.grandTotal.toLocaleString()})
            </p>
          )}
        </div>

        {order.paymentStatus === "rejected" && (
          <p className="mt-4 rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">
            สลิปที่ส่งมาก่อนหน้านี้ถูกผู้ดูแลระบบปฏิเสธ กรุณาตรวจสอบยอดแล้วอัปโหลดใหม่
          </p>
        )}

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
            <img src={slip} alt="slip" className="mt-3 h-40 w-full rounded-lg border border-stone-200 object-contain" />
          )}
        </div>

        <Button onClick={handleSubmit} disabled={submitting} className="mt-6 w-full">
          {submitting ? "กำลังส่งหลักฐานการชำระเงิน..." : "ยืนยันการชำระเงิน"}
        </Button>
      </Card>
    </Container>
  );
}

export default function PaymentPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  return (
    <RequireUser>
      <PaymentContent id={id} />
    </RequireUser>
  );
}
