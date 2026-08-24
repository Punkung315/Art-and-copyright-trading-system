"use client";

import { use, useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { RequireUser } from "@/components/RoleGuard";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/context/ToastContext";
import { getOrder, confirmAvailability, updateShippingStatus, ApiError } from "@/lib/api";
import { Order, OrderItem, ShippingStatus } from "@/types";
import { Button, Card, Container, Select, Spinner } from "@/components/ui";
import { StatusBadge } from "@/components/StatusBadge";

const SHIPPING_OPTIONS: { value: ShippingStatus; label: string }[] = [
  { value: "not_shipped", label: "ยังไม่จัดส่ง" },
  { value: "packed", label: "แพ็คสินค้าแล้ว" },
  { value: "shipped", label: "จัดส่งแล้ว" },
  { value: "delivered", label: "จัดส่งสำเร็จ" },
];

/** นับความคืบหน้าการยืนยันของผู้ขายทุกคนในคำสั่งซื้อ */
function availabilityProgress(items: OrderItem[]) {
  const confirmed = items.filter((i) => i.availabilityStatus === "confirmed").length;
  const rejected = items.filter((i) => i.availabilityStatus === "rejected").length;
  return { confirmed, rejected, total: items.length };
}

function OrderDetailContent({ id }: { id: string }) {
  const { user } = useAuth();
  const { notify } = useToast();
  const [order, setOrder] = useState<Order | null | undefined>(undefined);
  const [busy, setBusy] = useState(false);
  const [confirmingAvailability, setConfirmingAvailability] = useState<null | boolean>(null);

  const load = useCallback(async () => {
    setOrder((await getOrder(id)) ?? null);
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  async function run(action: () => Promise<unknown>, successMessage: string) {
    setBusy(true);
    try {
      await action();
      await load();
      notify(successMessage, "success");
    } catch (err) {
      notify(
        err instanceof ApiError ? err.message : "ไม่สามารถแก้ไขสถานะได้ กรุณาลองใหม่อีกครั้ง",
        "error"
      );
    } finally {
      setBusy(false);
      setConfirmingAvailability(null);
    }
  }

  if (order === undefined) return <Spinner />;
  if (order === null) {
    return (
      <Container className="py-16 text-center text-stone-600">ไม่พบรายการคำสั่งซื้อ</Container>
    );
  }

  /*
   * คำสั่งซื้อหนึ่งใบเปิดดูได้ทั้งผู้ซื้อและผู้ขาย จึงต้องแยกว่าใครกำลังดูอยู่
   * order.sellerId/buyerId เป็น "userId" ไม่ใช่ id ในตาราง seller/buyer
   * (จุดนี้เคยพลาดมาแล้วในหน้าสัญญาลิขสิทธิ์ เทียบผิด id space แล้วปุ่มไม่ขึ้นเลย)
   */
  const isBuyer = !!user && order.buyerId === user.id;
  const myItems = user ? order.items.filter((i) => i.sellerId === user.id) : [];
  // เป็นผู้ขายของคำสั่งซื้อนี้ก็ต่อเมื่อมีงานของตัวเองอยู่ในนั้นจริงๆ
  const isSeller = !isBuyer && myItems.length > 0;

  // ผู้ขายเห็นเฉพาะงานของตัวเอง ส่วนผู้ซื้อเห็นทุกชิ้นที่สั่ง
  const visibleItems = isSeller ? myItems : order.items;
  const visibleTotal = visibleItems.reduce((s, i) => s + i.price, 0);

  const myAvailability = myItems.every((i) => i.availabilityStatus === "confirmed")
    ? "confirmed"
    : myItems.some((i) => i.availabilityStatus === "rejected")
      ? "rejected"
      : "waiting";

  const progress = availabilityProgress(order.items);
  const pending = progress.total - progress.confirmed - progress.rejected;
  /*
   * จ่ายได้เมื่อผู้ขายตอบครบทุกชิ้นแล้ว และเหลืออย่างน้อยหนึ่งชิ้นที่พร้อมขาย
   * ไม่ต้องรอให้พร้อมขายครบทุกชิ้น — ถ้าผู้ขายรายหนึ่งไม่พร้อม ก็ซื้อเฉพาะชิ้นที่เหลือได้
   * (backend คิดเงินเฉพาะชิ้นที่พร้อมขายให้อยู่แล้ว ดู payableGrandTotal)
   */
  const canPay = pending === 0 && progress.confirmed > 0;
  const partialOrder = progress.rejected > 0 && progress.confirmed > 0;
  // ปฏิเสธสลิปแล้วต้องอัปโหลดใหม่ได้ ไม่ใช่ค้างตายอยู่แบบนั้น
  const canUploadSlip =
    canPay && (order.paymentStatus === "unpaid" || order.paymentStatus === "rejected");

  return (
    <Container className="py-10">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-serif text-2xl font-bold text-stone-900">
            คำสั่งซื้อ #{order.id.slice(-8)}
          </h1>
          <p className="text-sm text-stone-500">
            {isSeller ? `ผู้ซื้อ: ${order.buyerName || "—"}` : `ผู้ขาย: ${order.sellerName || "—"}`}
            {" · "}
            {new Date(order.orderDate).toLocaleDateString("th-TH")}
          </p>
        </div>
        <StatusBadge status={order.orderStatus} domain="order" />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="flex flex-col gap-4 lg:col-span-2">
          <Card className="p-5">
            <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
              <h2 className="font-serif text-base font-bold text-stone-900">รายการสินค้า</h2>
              {/* ผู้ขายเห็นเฉพาะงานของตัวเอง บอกให้ชัดว่าไม่ได้แสดงครบทั้งใบ */}
              {isSeller && order.items.length > myItems.length && (
                <span className="text-xs text-stone-500">
                  แสดงเฉพาะผลงานของร้านคุณ ({myItems.length} จาก {order.items.length} ชิ้นในคำสั่งซื้อ)
                </span>
              )}
            </div>
            <div className="flex flex-col gap-3">
              {visibleItems.map((item) => (
                <div key={item.id} className="flex items-center gap-3">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={item.artworkImage}
                    alt={item.artworkName}
                    className="h-14 w-14 rounded-lg object-cover"
                  />
                  <div className="flex-1">
                    <Link
                      href={`/art/${item.artworkId}`}
                      className="text-sm text-stone-800 hover:underline"
                    >
                      {item.artworkName}
                    </Link>
                    {/* ผู้ซื้อควรรู้ว่าแต่ละชิ้นมาจากผู้ขายคนไหน และชิ้นไหนยังรอยืนยัน */}
                    {isBuyer && (
                      <p className="mt-0.5 flex flex-wrap items-center gap-2 text-xs text-stone-500">
                        <span>ผู้ขาย {item.sellerName || "—"}</span>
                        {item.availabilityStatus && (
                          <StatusBadge status={item.availabilityStatus} domain="availability" />
                        )}
                      </p>
                    )}
                  </div>
                  <p className="text-sm font-medium text-stone-900">
                    ฿{item.price.toLocaleString()}
                  </p>
                </div>
              ))}
            </div>
          </Card>

          <Card className="grid grid-cols-2 gap-4 p-5 text-sm sm:grid-cols-3">
            <div>
              <p className="text-stone-500">ความพร้อมของผู้ขาย</p>
              <StatusBadge
                status={isSeller ? myAvailability : order.availabilityStatus}
                domain="availability"
              />
            </div>
            <div>
              <p className="text-stone-500">การชำระเงิน</p>
              <StatusBadge status={order.paymentStatus} domain="payment" />
            </div>
            <div>
              <p className="text-stone-500">สถานะการจัดส่ง</p>
              <StatusBadge status={order.shippingStatus} domain="shipping" />
            </div>
          </Card>

          {/*
            แผงจัดการของผู้ขาย — ย้ายมาจากหน้ารายการ "คำสั่งซื้อของร้านฉัน"
            เพราะการยืนยันความพร้อมและอัปเดตการจัดส่งควรตัดสินใจหลังเห็นรายการสินค้าครบ
            ไม่ใช่กดจากแถวในรายการที่เห็นแค่ยอดรวม
          */}
          {isSeller && (
            <Card className="p-5">
              <h2 className="mb-1 font-serif text-base font-bold text-stone-900">
                จัดการคำสั่งซื้อ (ผู้ขาย)
              </h2>
              <p className="mb-4 text-sm text-stone-500">
                ตรวจรายการสินค้าด้านบนให้ครบก่อนยืนยันความพร้อมในการขาย
              </p>

              {myAvailability === "waiting" ? (
                confirmingAvailability === null ? (
                  <div className="flex flex-wrap gap-2">
                    <Button disabled={busy} onClick={() => setConfirmingAvailability(true)}>
                      ยืนยันความพร้อมในการขาย
                    </Button>
                    <Button
                      variant="danger"
                      disabled={busy}
                      onClick={() => setConfirmingAvailability(false)}
                    >
                      ไม่พร้อมจำหน่าย
                    </Button>
                  </div>
                ) : (
                  /*
                    ถามย้ำก่อนบันทึก เพราะ backend ไม่ให้แก้ซ้ำ
                    (confirmAvailability ตอบ "รายการนี้ถูกยืนยันไปแล้ว" ถ้ากดอีกรอบ)
                    การกดพลาดจึงย้อนไม่ได้เลย ต้องเตือนให้ชัดก่อน
                  */
                  <div className="rounded-lg border border-amber-300 bg-amber-50 p-4">
                    <p className="font-medium text-amber-900">
                      {confirmingAvailability
                        ? "ยืนยันความพร้อมในการขายผลงานนี้?"
                        : "แจ้งว่าไม่พร้อมจำหน่ายผลงานนี้?"}
                    </p>
                    <p className="mt-1 text-sm text-amber-800">
                      {confirmingAvailability
                        ? "เมื่อยืนยันแล้วจะแก้ไขไม่ได้อีก และผู้ซื้อจะชำระเงินได้ทันทีเมื่อผู้ขายทุกคนยืนยันครบ"
                        : "เมื่อแจ้งไม่พร้อมจำหน่ายแล้วจะแก้ไขไม่ได้อีก ผลงานจะกลับไปเปิดขายให้คนอื่น และผู้ซื้อจะชำระเงินคำสั่งซื้อนี้ไม่ได้"}
                    </p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <Button
                        variant={confirmingAvailability ? "primary" : "danger"}
                        disabled={busy}
                        onClick={() =>
                          run(
                            () => confirmAvailability(order.id, confirmingAvailability),
                            confirmingAvailability
                              ? "ยืนยันความพร้อมในการขายผลงานแล้ว"
                              : "แจ้งไม่พร้อมจำหน่ายแล้ว"
                          )
                        }
                      >
                        {busy ? "กำลังบันทึก..." : "ยืนยัน"}
                      </Button>
                      <Button
                        variant="ghost"
                        disabled={busy}
                        onClick={() => setConfirmingAvailability(null)}
                      >
                        ยกเลิก
                      </Button>
                    </div>
                  </div>
                )
              ) : (
                /* ยืนยันแล้วแทนที่ปุ่มด้วยข้อความ ไม่เหลือปุ่มให้กดซ้ำแล้วเจอ error */
                <p
                  className={`rounded-lg px-3 py-2 text-sm font-medium ${
                    myAvailability === "confirmed"
                      ? "bg-emerald-50 text-emerald-800"
                      : "bg-rose-50 text-rose-700"
                  }`}
                >
                  {/* ใส่ "คุณ" นำหน้าให้ต่างจากป้ายสถานะรวมของคำสั่งซื้อที่อยู่ด้านบน */}
                  {myAvailability === "confirmed"
                    ? "คุณยืนยันความพร้อมแล้ว"
                    : "คุณแจ้งไม่พร้อมจำหน่ายแล้ว"}
                </p>
              )}

              <div className="mt-5 border-t border-stone-100 pt-4">
                <p className="mb-2 text-sm font-medium text-stone-700">สถานะการจัดส่ง</p>
                {order.paymentStatus === "confirmed" ? (
                  <Select
                    value={order.shippingStatus}
                    disabled={busy}
                    aria-label="สถานะการจัดส่ง"
                    onChange={(e) =>
                      run(
                        () => updateShippingStatus(order.id, e.target.value as ShippingStatus),
                        "อัปเดตสถานะการจัดส่งสำเร็จ"
                      )
                    }
                    className="w-full sm:w-56"
                  >
                    {SHIPPING_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </Select>
                ) : (
                  // อธิบายว่าทำไมยังแก้ไม่ได้ ดีกว่าซ่อนช่องไปเฉยๆ แล้วผู้ขายหาไม่เจอ
                  <p className="rounded-lg bg-stone-100 px-3 py-2 text-sm text-stone-600">
                    อัปเดตได้หลังผู้ดูแลระบบยืนยันการโอนเงินของผู้ซื้อแล้ว
                  </p>
                )}
              </div>
            </Card>
          )}
        </div>

        <Card className="h-fit p-5">
          <h2 className="mb-3 font-serif text-base font-bold text-stone-900">สรุปยอด</h2>
          <div className="flex flex-col gap-2 text-sm text-stone-600">
            {isSeller ? (
              <div className="flex justify-between">
                <span>ยอดเฉพาะผลงานของร้านคุณ</span>
                <span>฿{visibleTotal.toLocaleString()}</span>
              </div>
            ) : (
              <>
                <div className="flex justify-between">
                  <span>ราคารวมชิ้นงาน{partialOrder && " (เฉพาะที่พร้อมขาย)"}</span>
                  <span>
                    ฿{(partialOrder ? order.payableTotalAmount : order.totalAmount).toLocaleString()}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>ค่าจัดส่ง</span>
                  <span>
                    ฿
                    {(partialOrder
                      ? order.payableShippingCost
                      : order.shippingCost
                    ).toLocaleString()}
                  </span>
                </div>
                {/* บอกให้ชัดว่าตัดชิ้นที่ไม่พร้อมขายออกจากยอดแล้ว ไม่ใช่คิดเงินขาด */}
                {partialOrder && (
                  <p className="rounded-lg bg-stone-100 px-3 py-2 text-xs text-stone-600">
                    ไม่รวมผลงาน {progress.rejected} ชิ้นที่ผู้ขายแจ้งว่าไม่พร้อมจำหน่าย
                    (ยอดเต็มของคำสั่งซื้อคือ ฿{order.grandTotal.toLocaleString()})
                  </p>
                )}
                <div className="flex justify-between border-t border-stone-200 pt-2 text-base font-semibold text-stone-900">
                  <span>ยอดสุทธิ</span>
                  <span>
                    ฿{(partialOrder ? order.payableGrandTotal : order.grandTotal).toLocaleString()}
                  </span>
                </div>
              </>
            )}
          </div>

          <div className="mt-5 flex flex-col gap-2">
            {/* ใบเสนอราคาและการชำระเงินเป็นของผู้ซื้อ — backend ก็ปฏิเสธถ้าผู้ขายกดเข้าไป */}
            {isBuyer && (
              <>
                <Link href={`/orders/${order.id}/quotation`}>
                  <Button variant="secondary" className="w-full">
                    ดูใบเสนอราคา
                  </Button>
                </Link>

                {/* backend กันซ้ำอีกชั้นใน makePayment — ปุ่มนี้เป็นแค่ทางลัด ไม่ใช่ตัวบังคับกฎ */}
                {canUploadSlip && (
                  <Link href={`/orders/${order.id}/payment`}>
                    <Button className="w-full">
                      {order.paymentStatus === "rejected" ? "อัปโหลดสลิปใหม่" : "ชำระเงิน"}
                    </Button>
                  </Link>
                )}

                {order.paymentStatus === "rejected" && (
                  <p className="rounded-lg bg-rose-50 px-3 py-2 text-xs text-rose-700">
                    ผู้ดูแลระบบปฏิเสธหลักฐานการโอนเงิน กรุณาตรวจสอบแล้วอัปโหลดสลิปใหม่อีกครั้ง
                  </p>
                )}

                {pending > 0 && (
                  <p className="rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-700">
                    รอผู้ขายยืนยันความพร้อม {progress.confirmed} จาก {progress.total} ชิ้น —
                    ต้องตอบครบทุกชิ้นก่อนจึงจะชำระเงินได้
                  </p>
                )}

                {pending === 0 && progress.confirmed === 0 && (
                  <p className="rounded-lg bg-rose-50 px-3 py-2 text-xs text-rose-700">
                    ผู้ขายแจ้งไม่พร้อมจำหน่ายทุกชิ้นในคำสั่งซื้อนี้ จึงชำระเงินไม่ได้
                  </p>
                )}
              </>
            )}
            {isSeller && (
              <Link href="/seller/orders">
                <Button variant="secondary" className="w-full">
                  กลับไปคำสั่งซื้อของร้าน
                </Button>
              </Link>
            )}
          </div>
        </Card>
      </div>
    </Container>
  );
}

export default function OrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  return (
    <RequireUser>
      <OrderDetailContent id={id} />
    </RequireUser>
  );
}
