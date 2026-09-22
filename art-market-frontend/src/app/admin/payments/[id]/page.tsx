"use client";

import Link from "next/link";
import { use, useCallback, useEffect, useState } from "react";
import { RequireAdmin } from "@/components/RoleGuard";
import { useToast } from "@/context/ToastContext";
import {
  getPayment,
  confirmPayment,
  createSellerPayout,
  AdminPaymentDetail,
  ApiError,
} from "@/lib/api";
import { SellerPayout } from "@/types";
import { ImageUploadField } from "@/components/ImageUploadField";
import { EvidenceThumb, ShippingEvidence } from "@/components/ShippingEvidence";
import { formatThaiDate, formatThaiDateTime } from "@/lib/format";
import { formatBankAccountNumber } from "@/lib/banks";
import { Button, Card, Container, EmptyState, Spinner } from "@/components/ui";
import { StatusBadge } from "@/components/StatusBadge";
import { ConfirmDialog } from "@/components/ConfirmDialog";

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
  /*
   * null = ยังไม่ได้กดอะไร / true = กำลังจะยืนยันการโอน / false = กำลังจะปฏิเสธ
   * เก็บแยกจาก busy เพราะกล่องยืนยันต้องรู้ว่ากำลังถามเรื่องอะไรอยู่
   */
  const [pendingAction, setPendingAction] = useState<boolean | null>(null);
  /** สลิปโอนเงินให้ผู้ขายที่เลือกไว้ แยกรายผู้ขาย: sellerId -> data URL */
  const [payoutSlips, setPayoutSlips] = useState<Record<string, string>>({});
  /** ผู้ขายที่กำลังจะบันทึกการโอน — รอยืนยันในกล่องถามย้ำ */
  const [payingSeller, setPayingSeller] = useState<SellerPayout | null>(null);

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
      notify(approve ? "ยืนยันการชำระเงินของผู้ซื้อสำเร็จ" : "ปฏิเสธการโอนเงินแล้ว", "success");
    } catch (err) {
      notify(
        err instanceof ApiError ? err.message : "ไม่สามารถแก้ไขข้อมูลได้ กรุณาลองใหม่อีกครั้ง",
        "error"
      );
    } finally {
      setBusy(false);
      setPendingAction(null);
    }
  }

  async function handlePayout(p: SellerPayout) {
    setBusy(true);
    try {
      await createSellerPayout(payment!.orderId, p.sellerId, payoutSlips[p.sellerId]);
      setPayoutSlips((s) => {
        const next = { ...s };
        delete next[p.sellerId];
        return next;
      });
      await load();
      notify(`บันทึกการโอนเงินให้ ${p.sellerName || "ผู้ขาย"} แล้ว`, "success");
    } catch (err) {
      notify(
        err instanceof ApiError ? err.message : "ไม่สามารถบันทึกการโอนเงินได้ กรุณาลองใหม่อีกครั้ง",
        "error"
      );
    } finally {
      setBusy(false);
      setPayingSeller(null);
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

          {/* หลักฐานการจัดส่งรายชิ้น — ตรวจก่อนโอนเงินต่อให้ผู้ขาย */}
          {payment.status === "confirmed" && (
            <Card className="p-5">
              <h2 className="mb-1 font-serif text-base font-bold text-stone-900">หลักฐานการจัดส่ง</h2>
              <p className="mb-4 text-sm text-stone-500">
                ยืนยันการชำระเงินเมื่อ {formatThaiDateTime(payment.paymentConfirmedAt)}
                {payment.autoDeliveryConfirmAt &&
                  ` · ชิ้นที่จัดส่งแล้วจะถูกยืนยันอัตโนมัติวันที่ ${formatThaiDate(payment.autoDeliveryConfirmAt)}`}
              </p>
              <div className="flex flex-col gap-4">
                {payment.items
                  .filter((i) => i.availabilityStatus === "confirmed")
                  .map((i) => (
                    <div key={i.id} className="rounded-lg border border-stone-200 p-4">
                      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                        <div>
                          <p className="text-sm font-medium text-stone-900">{i.artworkName}</p>
                          <p className="text-xs text-stone-500">ผู้ขาย {i.sellerName || "—"}</p>
                        </div>
                        <StatusBadge status={i.shippingStatus} domain="shipping" />
                      </div>
                      <ShippingEvidence item={i} />
                    </div>
                  ))}
              </div>
            </Card>
          )}

          {/*
            โอนเงินต่อให้ผู้ขาย — แยกรายผู้ขาย เพราะแต่ละร้านส่งของเสร็จไม่พร้อมกัน
            ยอดมาจาก backend (ราคาผลงาน + ค่าจัดส่ง) หน้าเว็บไม่ได้คำนวณเอง
          */}
          {payment.status === "confirmed" && payment.payouts.length > 0 && (
            <Card className="p-5">
              <h2 className="mb-1 font-serif text-base font-bold text-stone-900">
                โอนเงินให้ผู้ขาย
              </h2>
              <p className="mb-4 text-sm text-stone-500">
                โอนได้เมื่อผลงานของผู้ขายรายนั้นจัดส่งสำเร็จครบทุกชิ้น แล้วแนบสลิปเป็นหลักฐาน
                ผู้ขายจะเห็นสลิปนี้ในหน้าคำสั่งซื้อของตัวเอง
              </p>
              <div className="flex flex-col gap-4">
                {payment.payouts.map((p) => (
                  <div
                    key={p.sellerId}
                    className="rounded-lg border border-stone-200 p-4"
                    data-testid={`payout-${p.sellerId}`}
                  >
                    <div className="mb-3 flex flex-wrap items-start justify-between gap-2">
                      <div>
                        <p className="text-sm font-semibold text-stone-900">{p.sellerName || "—"}</p>
                        <p className="text-xs text-stone-500">
                          {[p.sellerEmail, p.sellerPhone].filter(Boolean).join(" · ") || "—"}
                        </p>
                        <p className="mt-1 text-xs text-stone-500">
                          จัดส่งสำเร็จ {p.deliveredCount}/{p.itemCount} ชิ้น
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-xs text-stone-500">ยอดที่ต้องโอน</p>
                        <p className="text-lg font-semibold text-stone-900">
                          ฿{p.amount.toLocaleString()}
                        </p>
                      </div>
                    </div>

                    {/* บัญชีปลายทาง — โอนแล้วจะเป็นสำเนาบัญชี ณ ตอนโอน */}
                    {p.hasBankAccount ? (
                      <div className="mb-3 flex flex-wrap items-center gap-3 rounded-lg bg-stone-50 p-3">
                        {p.bankBookImage && (
                          <EvidenceThumb src={p.bankBookImage} alt="รูปหน้าสมุดบัญชีผู้ขาย" />
                        )}
                        <div className="text-sm">
                          <p className="text-xs text-stone-500">
                            {p.paid ? "โอนเข้าบัญชี" : "บัญชีรับเงินของผู้ขาย"}
                          </p>
                          <p className="font-medium text-stone-900">{p.bankName}</p>
                          <p className="font-mono text-base tracking-wide text-stone-900">
                            {formatBankAccountNumber(p.bankAccountNumber)}
                          </p>
                          <p className="text-stone-700">ชื่อบัญชี {p.bankAccountName}</p>
                        </div>
                      </div>
                    ) : (
                      <p className="mb-3 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800">
                        ผู้ขายยังไม่ได้ตั้งบัญชีธนาคารสำหรับรับเงิน — ต้องให้ผู้ขายตั้งบัญชีก่อนจึงจะโอนได้
                        {p.sellerPhone && ` (ติดต่อ ${p.sellerPhone})`}
                      </p>
                    )}

                    {p.paid ? (
                      <div className="flex flex-wrap items-center gap-3">
                        {p.slipTransfer && (
                          <EvidenceThumb src={p.slipTransfer} alt="หลักฐานการโอนเงินให้ผู้ขาย" />
                        )}
                        <p className="rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
                          โอนเงินแล้ว · {formatThaiDateTime(p.paidAt)}
                        </p>
                      </div>
                    ) : p.readyForPayout && p.hasBankAccount ? (
                      <div className="flex flex-col gap-3">
                        <ImageUploadField
                          label="หลักฐานการโอนเงินให้ผู้ขาย *"
                          value={payoutSlips[p.sellerId] ?? ""}
                          onChange={(v) => setPayoutSlips((s) => ({ ...s, [p.sellerId]: v }))}
                          onError={(m) => notify(m, "error")}
                        />
                        <div>
                          <Button
                            disabled={busy || !payoutSlips[p.sellerId]}
                            onClick={() => setPayingSeller(p)}
                          >
                            ยืนยันการโอนเงินให้ผู้ขาย
                          </Button>
                        </div>
                      </div>
                    ) : p.readyForPayout ? null : (
                      <p className="rounded-lg bg-stone-100 px-3 py-2 text-sm text-stone-600">
                        รอจัดส่งสำเร็จครบทุกชิ้นก่อนจึงจะโอนเงินได้
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </Card>
          )}
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
                <Button disabled={busy} onClick={() => setPendingAction(true)} className="flex-1">
                  ยืนยันการโอนเงิน
                </Button>
                <Button
                  variant="danger"
                  disabled={busy}
                  onClick={() => setPendingAction(false)}
                  className="flex-1"
                >
                  ปฏิเสธ
                </Button>
              </div>
            </Card>
          )}
        </div>
      </div>

      {/*
        ยืนยันสองขั้นก่อนตัดสินการโอนเงิน
        กดพลาดครั้งเดียว = เงินถูกปล่อยให้ผู้ขายไปแล้ว หรือผู้ซื้อถูกปฏิเสธทั้งที่โอนจริง
        backend ไม่ให้แก้ซ้ำ จึงย้อนไม่ได้เลย

        ขั้นที่สองไม่ได้ถามซ้ำด้วยคำเดิม แต่สรุป "ผลที่จะเกิดขึ้น" พร้อมยอดเงินและคู่กรณี
        ถ้าถามซ้ำคำเดิมคนจะกดผ่านโดยไม่อ่าน ซึ่งไม่ได้กันอะไรเลย
      */}
      <ConfirmDialog
        open={pendingAction !== null}
        busy={busy}
        destructive={pendingAction === false}
        onCancel={() => setPendingAction(null)}
        onConfirm={() => handleConfirm(pendingAction === true)}
        steps={
          pendingAction
            ? [
                {
                  title: "ยืนยันการโอนเงินนี้?",
                  description:
                    `ตรวจสลิปตรงกับยอดสุทธิ ฿${payment.grandTotal.toLocaleString()} แล้วใช่ไหม ` +
                    "เมื่อยืนยันแล้วจะแก้ไขไม่ได้อีก",
                  confirmLabel: "ตรวจแล้ว ไปขั้นถัดไป",
                },
                {
                  title: "ยืนยันครั้งสุดท้าย",
                  description:
                    `ระบบจะบันทึกว่าได้รับเงิน ฿${payment.grandTotal.toLocaleString()} ` +
                    `จาก ${payment.buyerName || "ผู้ซื้อ"} ` +
                    `และปล่อยให้ ${payment.sellerName || "ผู้ขาย"} จัดส่งสินค้าได้ทันที`,
                  confirmLabel: "ยืนยันการโอนเงิน",
                },
              ]
            : [
                {
                  title: "ปฏิเสธการโอนเงินนี้?",
                  description:
                    "ใช้เมื่อสลิปไม่ถูกต้อง ยอดไม่ตรง หรือตรวจไม่พบเงินเข้าจริง " +
                    "เมื่อปฏิเสธแล้วจะแก้ไขไม่ได้อีก",
                  confirmLabel: "ใช่ ไปขั้นถัดไป",
                },
                {
                  title: "ยืนยันครั้งสุดท้าย",
                  description:
                    `คำสั่งซื้อ #${payment.orderId} จะขึ้นสถานะ "ถูกปฏิเสธการโอนเงิน" ` +
                    `และ ${payment.buyerName || "ผู้ซื้อ"} ต้องอัปโหลดสลิปใหม่อีกครั้ง`,
                  confirmLabel: "ปฏิเสธการโอนเงิน",
                },
              ]
        }
      />

      {/* โอนเงินออกจากแพลตฟอร์ม — ย้อนไม่ได้ จึงยืนยันสองขั้นเหมือนการยืนยันการชำระเงิน */}
      <ConfirmDialog
        open={payingSeller !== null}
        busy={busy}
        onCancel={() => setPayingSeller(null)}
        onConfirm={() => payingSeller && handlePayout(payingSeller)}
        steps={[
          {
            title: "ยืนยันการโอนเงินให้ผู้ขาย?",
            description:
              `ตรวจสลิปว่าโอนยอด ฿${payingSeller?.amount.toLocaleString() ?? ""} ` +
              `เข้าบัญชี ${payingSeller?.bankName ?? ""} ${formatBankAccountNumber(payingSeller?.bankAccountNumber)} ` +
              `(${payingSeller?.bankAccountName ?? ""}) ถูกต้องแล้วใช่ไหม`,
            confirmLabel: "ตรวจแล้ว ไปขั้นถัดไป",
          },
          {
            title: "ยืนยันครั้งสุดท้าย",
            description:
              `ระบบจะบันทึกว่าโอนเงิน ฿${payingSeller?.amount.toLocaleString() ?? ""} ` +
              `ให้ ${payingSeller?.sellerName || "ผู้ขาย"} แล้ว และส่งสลิปให้ผู้ขายดู — แก้ไขไม่ได้อีก`,
            confirmLabel: "บันทึกการโอนเงิน",
          },
        ]}
      />
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
