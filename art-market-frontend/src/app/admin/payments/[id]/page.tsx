"use client";

import Link from "next/link";
import { use, useCallback, useEffect, useState } from "react";
import { RequireAdmin } from "@/components/RoleGuard";
import { useToast } from "@/context/ToastContext";
import { getPayment, confirmPayment, AdminPaymentDetail, ApiError } from "@/lib/api";
import { Button, Card, Container, EmptyState, Spinner } from "@/components/ui";
import { StatusBadge } from "@/components/StatusBadge";

function Row({ label, value }: { label: string; value?: string | number | null }) {
  const empty = value === null || value === undefined || value === "";
  return (
    <div className="flex justify-between gap-4 border-b border-stone-100 py-2 last:border-0">
      <span className="text-sm text-stone-500">{label}</span>
      <span className={`text-sm ${empty ? "text-stone-400" : "font-medium text-stone-900"}`}>
        {empty ? "—" : value}
      </span>
    </div>
  );
}

function formatDate(iso?: string) {
  if (!iso) return undefined;
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? undefined : d.toLocaleString("th-TH");
}

/** สถานะคำสั่งซื้อฝั่ง backend เป็นอังกฤษล้วน แปลก่อนแสดงให้ผู้ดูแลระบบอ่าน */
const ORDER_STATUS_LABEL: Record<string, string> = {
  PENDING: "รอดำเนินการ",
  CONFIRMED: "ยืนยันแล้ว",
  COMPLETED: "เสร็จสิ้น",
  CANCELLED: "ยกเลิก",
};

/**
 * สลิปที่ผู้ซื้ออัปโหลดจริงจะเป็น data URL ส่วนข้อมูล seed เก็บเป็นแค่ชื่อไฟล์
 * ถ้ายัดชื่อไฟล์ลง src ของ <img> จะขึ้นไอคอนรูปเสีย ดูเหมือนระบบพัง
 * ทั้งที่จริงแค่ไม่มีไฟล์รูป จึงแยกเคสแล้วแสดงเป็นชื่อไฟล์แทน
 */
function isDisplayableImage(src?: string) {
  return !!src && (src.startsWith("data:") || src.startsWith("http"));
}

function AdminPaymentDetailContent({ paymentId }: { paymentId: string }) {
  const { notify } = useToast();
  const [payment, setPayment] = useState<AdminPaymentDetail | null | undefined>(undefined);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setPayment((await getPayment(paymentId)) ?? null);
  }, [paymentId]);

  useEffect(() => {
    load();
  }, [load]);

  async function handleConfirm(approve: boolean) {
    setBusy(true);
    try {
      await confirmPayment(paymentId, approve);
      await load();
      notify(approve ? "ยืนยันการโอนเงินให้ผู้ขายสำเร็จ" : "ปฏิเสธการโอนเงินแล้ว", "success");
    } catch (err) {
      notify(
        err instanceof ApiError ? err.message : "ไม่สามารถแก้ไขข้อมูลได้ กรุณาลองใหม่อีกครั้ง",
        "error"
      );
    } finally {
      setBusy(false);
    }
  }

  if (payment === undefined) return <Spinner />;
  if (payment === null) {
    return (
      <Container className="py-16">
        <EmptyState title="ไม่พบรายการการโอนเงิน" />
        <div className="mt-6 text-center">
          <Link href="/admin/payments" className="text-sm text-stone-600 underline">
            กลับไปรายการการโอนเงิน
          </Link>
        </div>
      </Container>
    );
  }

  // ยอดในตาราง order_item ต้องเท่ากับยอดที่เก็บใน payment
  // ถ้าไม่ตรงแปลว่าราคาถูกแก้หลังสั่งซื้อ หรือสูตรคิดเงินเพี้ยน — ต้องเตือน Admin ก่อนกดยืนยัน
  const itemSum = payment.items.reduce((s, i) => s + i.price, 0);
  const expected = itemSum + payment.shippingCost;
  const mismatch = payment.items.length > 0 && Math.abs(expected - payment.grandTotal) > 0.5;

  return (
    <Container className="py-10">
      <Link href="/admin/payments" className="text-sm text-stone-500 hover:text-stone-900">
        ← กลับไปรายการการโอนเงิน
      </Link>

      <div className="mt-4 mb-6 flex flex-wrap items-center gap-3">
        <h1 className="font-serif text-2xl font-bold text-stone-900">
          การโอนเงิน #{payment.id}
        </h1>
        <StatusBadge status={payment.status} domain="payment" />
        <span className="text-sm text-stone-500">คำสั่งซื้อ #{payment.orderId}</span>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="flex flex-col gap-6 lg:col-span-2">
          <Card className="p-5">
            <h2 className="mb-3 font-serif text-base font-bold text-stone-900">ข้อมูลการโอนเงิน</h2>
            <Row label="รหัสการโอนเงิน" value={payment.id} />
            <Row label="รหัสคำสั่งซื้อ" value={payment.orderId} />
            <Row label="วันที่สั่งซื้อ" value={formatDate(payment.orderDate)} />
            <Row label="วันที่ผู้ขายยืนยันความพร้อม" value={formatDate(payment.confirmDateTime)} />
            <Row
              label="สถานะคำสั่งซื้อ"
              value={
                payment.orderStatusRaw
                  ? ORDER_STATUS_LABEL[payment.orderStatusRaw] ?? payment.orderStatusRaw
                  : undefined
              }
            />
            <Row label="ค่าชิ้นงานรวม" value={`฿${payment.totalPrice.toLocaleString()}`} />
            <Row label="ค่าจัดส่ง" value={`฿${payment.shippingCost.toLocaleString()}`} />
            <Row label="ยอดสุทธิที่ต้องโอน" value={`฿${payment.grandTotal.toLocaleString()}`} />
          </Card>

          <Card className="p-5">
            <h2 className="mb-3 font-serif text-base font-bold text-stone-900">
              รายการในคำสั่งซื้อ ({payment.items.length})
            </h2>
            {payment.items.length === 0 ? (
              <p className="text-sm text-stone-400">ไม่พบรายการสินค้าในคำสั่งซื้อนี้</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="text-stone-500">
                    <tr>
                      <th className="py-2">ผลงาน</th>
                      <th className="py-2">ความพร้อมขาย</th>
                      <th className="py-2">การจัดส่ง</th>
                      <th className="py-2 text-right">ราคา ณ วันสั่งซื้อ</th>
                    </tr>
                  </thead>
                  <tbody>
                    {payment.items.map((i) => (
                      <tr key={i.id} className="border-t border-stone-100">
                        <td className="py-2">
                          <Link
                            href={`/art/${i.artworkId}`}
                            className="font-medium text-stone-900 hover:underline"
                          >
                            {i.artworkName}
                          </Link>
                        </td>
                        <td className="py-2">
                          <StatusBadge status={i.availabilityStatus} domain="availability" />
                        </td>
                        <td className="py-2">
                          <StatusBadge status={i.shippingStatus} domain="shipping" />
                        </td>
                        <td className="py-2 text-right font-medium text-stone-900">
                          ฿{i.price.toLocaleString()}
                        </td>
                      </tr>
                    ))}
                    <tr className="border-t border-stone-200 font-semibold text-stone-900">
                      <td className="py-2" colSpan={3}>
                        รวมค่าชิ้นงาน
                      </td>
                      <td className="py-2 text-right">฿{itemSum.toLocaleString()}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            )}

            {mismatch && (
              <p className="mt-3 rounded-lg bg-amber-50 p-3 text-sm text-amber-800">
                ยอดรวมรายการ + ค่าจัดส่ง = ฿{expected.toLocaleString()} ซึ่งไม่ตรงกับยอดสุทธิ ฿
                {payment.grandTotal.toLocaleString()} — ตรวจสอบก่อนยืนยัน
              </p>
            )}
          </Card>

          <Card className="p-5">
            <h2 className="mb-3 font-serif text-base font-bold text-stone-900">
              หลักฐานการโอนเงิน
            </h2>
            {isDisplayableImage(payment.slipTransfer) ? (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img
                src={payment.slipTransfer}
                alt="หลักฐานการโอนเงิน"
                className="max-h-96 w-full rounded-lg border border-stone-200 object-contain"
              />
            ) : payment.slipTransfer ? (
              <p className="rounded-lg bg-stone-50 p-3 text-sm text-stone-600">
                มีหลักฐานแนบไว้ในชื่อ{" "}
                <span className="font-medium text-stone-900">{payment.slipTransfer}</span>{" "}
                แต่ไม่ใช่ไฟล์รูปที่แสดงได้ (ข้อมูลตัวอย่างเก็บเป็นชื่อไฟล์)
              </p>
            ) : (
              <p className="text-sm text-stone-400">ผู้ซื้อยังไม่ได้แนบหลักฐานการโอนเงิน</p>
            )}
          </Card>
        </div>

        <div className="flex flex-col gap-6">
          <Card className="p-5">
            <h2 className="mb-3 font-serif text-base font-bold text-stone-900">ผู้ซื้อ</h2>
            <Row label="ชื่อ-นามสกุล" value={payment.buyerName} />
            <Row label="อีเมล" value={payment.buyerEmail} />
            <Row label="เบอร์โทรศัพท์" value={payment.buyerPhone} />
            <Link
              href={`/admin/users/${payment.buyerId}`}
              className="mt-3 inline-block text-sm text-stone-600 underline"
            >
              ดูข้อมูลผู้ซื้อ
            </Link>
          </Card>

          <Card className="p-5">
            <h2 className="mb-3 font-serif text-base font-bold text-stone-900">ผู้ขายปลายทาง</h2>
            <Row label="ชื่อ-นามสกุล" value={payment.sellerName} />
            {payment.sellerId && (
              <Link
                href={`/admin/users/${payment.sellerId}`}
                className="mt-3 inline-block text-sm text-stone-600 underline"
              >
                ดูข้อมูลผู้ขาย
              </Link>
            )}
          </Card>

          {payment.status === "submitted" && (
            <Card className="p-5">
              <h2 className="mb-1 font-serif text-base font-bold text-stone-900">
                ตรวจสอบการโอนเงิน
              </h2>
              <p className="mb-4 text-sm text-stone-500">
                เทียบสลิปกับยอดสุทธิ ฿{payment.grandTotal.toLocaleString()} ก่อนตัดสินใจ
              </p>
              <div className="flex gap-2">
                <Button disabled={busy} onClick={() => handleConfirm(true)} className="flex-1">
                  ยืนยันการโอนเงิน
                </Button>
                <Button
                  variant="danger"
                  disabled={busy}
                  onClick={() => handleConfirm(false)}
                  className="flex-1"
                >
                  ปฏิเสธ
                </Button>
              </div>
            </Card>
          )}
        </div>
      </div>
    </Container>
  );
}

export default function AdminPaymentDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  return (
    <RequireAdmin>
      <AdminPaymentDetailContent paymentId={id} />
    </RequireAdmin>
  );
}
