"use client";

import { useEffect, useState } from "react";
import { RequireAdmin } from "@/components/RoleGuard";
import { useToast } from "@/context/ToastContext";
import { listPayments, confirmPayment, ApiError } from "@/lib/api";
import { Payment } from "@/types";
import { Button, Card, Container, EmptyState, Spinner } from "@/components/ui";
import { StatusBadge } from "@/components/StatusBadge";

function AdminPaymentsContent() {
  const { notify } = useToast();
  const [payments, setPayments] = useState<Payment[] | null>(null);
  const [selected, setSelected] = useState<Payment | null>(null);
  const [busy, setBusy] = useState(false);

  async function load() {
    const list = await listPayments();
    setPayments(list);
    if (selected) {
      setSelected(list.find((p) => p.id === selected.id) ?? null);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleConfirm(approve: boolean) {
    if (!selected) return;
    setBusy(true);
    try {
      await confirmPayment(selected.id, approve);
      await load();
      notify(approve ? "ยืนยันการโอนเงินให้ผู้ขายสำเร็จ" : "ปฏิเสธการโอนเงินแล้ว", "success");
    } catch (err) {
      notify(err instanceof ApiError ? err.message : "ไม่สามารถแก้ไขข้อมูลได้ กรุณาลองใหม่อีกครั้ง", "error");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Container className="py-10">
      <h1 className="mb-6 font-serif text-2xl font-bold text-stone-900">รายการโอนเงินให้ผู้ขาย</h1>

      {payments === null ? (
        <Spinner />
      ) : payments.length === 0 ? (
        <EmptyState title="ยังไม่มีรายการการโอนเงิน" description="รายการจะปรากฏเมื่อผู้ซื้อชำระเงินและแนบหลักฐาน" />
      ) : (
        <div className="grid gap-6 lg:grid-cols-3">
          <div className="flex flex-col gap-3 lg:col-span-2">
            {[...payments].reverse().map((p) => (
              <Card
                key={p.id}
                onClick={() => setSelected(p)}
                className={`flex cursor-pointer items-center justify-between p-4 transition hover:shadow-md ${
                  selected?.id === p.id ? "ring-2 ring-stone-900" : ""
                }`}
              >
                <div>
                  <p className="text-sm font-semibold text-stone-900">คำสั่งซื้อ #{p.orderId.slice(-8)}</p>
                  <p className="text-xs text-stone-500">
                    ผู้ซื้อ {p.buyerName} → ผู้ขาย {p.sellerName}
                  </p>
                </div>
                <div className="text-right">
                  <p className="mb-1 text-sm font-semibold text-stone-900">฿{p.grandTotal.toLocaleString()}</p>
                  <StatusBadge status={p.status} domain="payment" />
                </div>
              </Card>
            ))}
          </div>

          <Card className="h-fit p-5">
            {!selected ? (
              <p className="text-sm text-stone-500">เลือกรายการเพื่อตรวจสอบรายละเอียด</p>
            ) : (
              <div>
                <h2 className="font-serif text-base font-bold text-stone-900">
                  คำสั่งซื้อ #{selected.orderId.slice(-8)}
                </h2>
                <div className="mt-3 flex flex-col gap-2 text-sm text-stone-600">
                  <div className="flex justify-between">
                    <span>ราคารวมชิ้นงาน</span>
                    <span>฿{selected.totalPrice.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>ค่าจัดส่ง</span>
                    <span>฿{selected.shippingCost.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between border-t border-stone-200 pt-2 font-semibold text-stone-900">
                    <span>ยอดสุทธิ</span>
                    <span>฿{selected.grandTotal.toLocaleString()}</span>
                  </div>
                </div>

                {selected.slipTransfer && (
                  <div className="mt-4">
                    <p className="mb-1 text-xs text-stone-500">หลักฐานการโอนเงิน</p>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={selected.slipTransfer}
                      alt="slip"
                      className="max-h-64 w-full rounded-lg border border-stone-200 object-contain"
                    />
                  </div>
                )}

                {selected.status === "submitted" && (
                  <div className="mt-4 flex gap-2">
                    <Button disabled={busy} onClick={() => handleConfirm(true)} className="flex-1">
                      ยืนยันการโอนเงิน
                    </Button>
                    <Button variant="danger" disabled={busy} onClick={() => handleConfirm(false)} className="flex-1">
                      ปฏิเสธ
                    </Button>
                  </div>
                )}
              </div>
            )}
          </Card>
        </div>
      )}
    </Container>
  );
}

export default function AdminPaymentsPage() {
  return (
    <RequireAdmin>
      <AdminPaymentsContent />
    </RequireAdmin>
  );
}
