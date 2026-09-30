"use client";

import Link from "next/link";
import { use, useCallback, useEffect, useState } from "react";
import { RequireAdmin } from "@/components/RoleGuard";
import { useToast } from "@/context/ToastContext";
import { getCopyrightPayment, confirmCopyrightPayment, ApiError } from "@/lib/api";
import { CopyrightPayment } from "@/types";
import { Button, Card, Container, EmptyState, Spinner } from "@/components/ui";
import { StatusBadge } from "@/components/StatusBadge";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { ZoomableImage } from "@/components/ZoomableImage";

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

/** เหมือนหน้าโอนค่าชิ้นงาน — ข้อมูลตัวอย่างเก็บสลิปเป็นชื่อไฟล์ ไม่ใช่ data URL */
function isDisplayableImage(src?: string): src is string {
  return !!src && (src.startsWith("data:") || src.startsWith("http"));
}

function AdminCopyrightPaymentContent({ paymentId }: { paymentId: string }) {
  const { notify } = useToast();
  const [payment, setPayment] = useState<CopyrightPayment | null | undefined>(undefined);
  const [busy, setBusy] = useState(false);
  const [pendingAction, setPendingAction] = useState<boolean | null>(null);

  const load = useCallback(async () => {
    setPayment((await getCopyrightPayment(paymentId)) ?? null);
  }, [paymentId]);

  useEffect(() => {
    load();
  }, [load]);

  async function handleConfirm(approve: boolean) {
    setBusy(true);
    try {
      await confirmCopyrightPayment(paymentId, approve);
      await load();
      notify(approve ? "ยืนยันการชำระค่าลิขสิทธิ์สำเร็จ" : "ปฏิเสธการชำระค่าลิขสิทธิ์แล้ว", "success");
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

  if (payment === undefined) return <Spinner />;
  if (payment === null) {
    return (
      <Container className="py-16">
        <EmptyState title="ไม่พบรายการชำระค่าลิขสิทธิ์" />
        <div className="mt-6 text-center">
          <Link href="/admin/payments" className="text-sm text-stone-600 underline">
            กลับไปรายการการโอนเงิน
          </Link>
        </div>
      </Container>
    );
  }

  return (
    <Container className="py-10">
      <Link href="/admin/payments" className="text-sm text-stone-500 hover:text-stone-900">
        ← กลับไปรายการการโอนเงิน
      </Link>

      <div className="mt-4 mb-6 flex flex-wrap items-center gap-3">
        <h1 className="font-serif text-2xl font-bold text-stone-900">
          ค่าลิขสิทธิ์ #{payment.id}
        </h1>
        <StatusBadge status={payment.status} domain="payment" />
        <span className="text-sm text-stone-500">สัญญา #{payment.copyrightId}</span>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="flex flex-col gap-6 lg:col-span-2">
          <Card className="p-5">
            <h2 className="mb-3 font-serif text-base font-bold text-stone-900">
              ข้อมูลการชำระค่าลิขสิทธิ์
            </h2>
            <Row label="รหัสการชำระเงิน" value={payment.id} />
            <Row label="รหัสสัญญาโอนลิขสิทธิ์" value={payment.copyrightId} />
            <Row label="ผลงาน" value={payment.artworkName} />
            <Row label="วันที่แจ้งโอน" value={formatDate(payment.paymentDate)} />
            <Row label="ยอดที่ต้องโอน" value={`฿${payment.amount.toLocaleString()}`} />
          </Card>

          <Card className="p-5">
            <h2 className="mb-3 font-serif text-base font-bold text-stone-900">
              หลักฐานการโอนเงิน
            </h2>
            {isDisplayableImage(payment.slipTransfer) ? (
              /*
                ใช้ ZoomableImage ไม่ใช่ <img> เฉย ๆ — สลิปธนาคารมีตัวเลขเล็กมาก
                (ยอดเงิน เวลา เลขอ้างอิง) ที่ผู้ดูแลระบบต้องอ่านให้ออกก่อนกดยืนยัน
                ย่อลงมาในกรอบแล้วอ่านไม่ออก ต้องกดขยายเต็มจอได้
              */
              <ZoomableImage src={payment.slipTransfer} alt="หลักฐานการโอนเงิน" />
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
            <h2 className="mb-3 font-serif text-base font-bold text-stone-900">ผู้ซื้อลิขสิทธิ์</h2>
            <Row label="ชื่อ-นามสกุล" value={payment.buyerName} />
            <Row label="อีเมล" value={payment.buyerEmail} />
            <Row label="เบอร์โทรศัพท์" value={payment.buyerPhone} />
          </Card>

          <Card className="p-5">
            <h2 className="mb-3 font-serif text-base font-bold text-stone-900">เจ้าของลิขสิทธิ์</h2>
            <Row label="ชื่อ-นามสกุล" value={payment.sellerName} />
            <Link
              href={`/copyright/${payment.copyrightId}`}
              className="mt-3 inline-block text-sm text-stone-600 underline"
            >
              ดูสัญญาโอนลิขสิทธิ์
            </Link>
          </Card>

          {payment.status === "submitted" && (
            <Card className="p-5">
              <h2 className="mb-1 font-serif text-base font-bold text-stone-900">
                ตรวจสอบการโอนเงิน
              </h2>
              <p className="mb-4 text-sm text-stone-500">
                เทียบสลิปกับยอด ฿{payment.amount.toLocaleString()} ก่อนตัดสินใจ
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
        ยืนยันสองขั้นเหมือนหน้าโอนค่าชิ้นงาน — ที่นี่ผลของการกดหนักกว่าอีก
        เพราะการยืนยันคือการปลดล็อกให้ผู้ซื้อลงนามรับโอนลิขสิทธิ์ได้ทันที
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
                  title: "ยืนยันการชำระค่าลิขสิทธิ์นี้?",
                  description:
                    `ตรวจสลิปตรงกับยอด ฿${payment.amount.toLocaleString()} แล้วใช่ไหม ` +
                    "เมื่อยืนยันแล้วจะแก้ไขไม่ได้อีก",
                  confirmLabel: "ตรวจแล้ว ไปขั้นถัดไป",
                },
                {
                  title: "ยืนยันครั้งสุดท้าย",
                  description:
                    `ระบบจะบันทึกว่าได้รับเงิน ฿${payment.amount.toLocaleString()} ` +
                    `จาก ${payment.buyerName || "ผู้ซื้อ"} ` +
                    `และเปิดให้ลงนามรับโอนลิขสิทธิ์ผลงาน "${payment.artworkName}" ได้ทันที`,
                  confirmLabel: "ยืนยันการโอนเงิน",
                },
              ]
            : [
                {
                  title: "ปฏิเสธการชำระเงินนี้?",
                  description:
                    "ใช้เมื่อสลิปไม่ถูกต้อง ยอดไม่ตรง หรือตรวจไม่พบเงินเข้าจริง " +
                    "เมื่อปฏิเสธแล้วจะแก้ไขไม่ได้อีก",
                  confirmLabel: "ใช่ ไปขั้นถัดไป",
                },
                {
                  title: "ยืนยันครั้งสุดท้าย",
                  description:
                    `สัญญา #${payment.copyrightId} จะยังลงนามไม่ได้ ` +
                    `และ ${payment.buyerName || "ผู้ซื้อ"} ต้องอัปโหลดสลิปใหม่อีกครั้ง`,
                  confirmLabel: "ปฏิเสธการโอนเงิน",
                },
              ]
        }
      />
    </Container>
  );
}

export default function AdminCopyrightPaymentDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  return (
    <RequireAdmin>
      <AdminCopyrightPaymentContent paymentId={id} />
    </RequireAdmin>
  );
}
