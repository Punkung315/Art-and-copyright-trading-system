"use client";

import { use, useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { RequireUser } from "@/components/RoleGuard";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/context/ToastContext";
import { getOrder, confirmAvailability, confirmItemDelivered, ApiError } from "@/lib/api";
import { Order, OrderItem } from "@/types";
import { Button, Card, Container, Spinner } from "@/components/ui";
import { StatusBadge } from "@/components/StatusBadge";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { EvidenceThumb, ShippingEvidence } from "@/components/ShippingEvidence";
import { SellerShippingControl } from "@/components/SellerShippingControl";
import { formatThaiDate, formatThaiDateTime } from "@/lib/format";
import { formatBankAccountNumber } from "@/lib/banks";
import { PROTECTED_IMAGE_CLASS, protectedImageProps } from "@/lib/protectImage";

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
  /*
   * คำตอบความพร้อมรายชิ้น: orderItemId -> พร้อมขายไหม
   * ผู้ขายที่มีงานหลายชิ้นในคำสั่งซื้อเดียวต้องตอบแยกกันได้
   * ชิ้นที่ยังไม่ได้เลือกจะไม่ถูกส่งไป backend และยังรอตอบต่อไป
   */
  const [answers, setAnswers] = useState<Record<string, boolean>>({});
  const [confirming, setConfirming] = useState(false);
  /** ชิ้นที่ผู้ซื้อกำลังจะกด "ได้รับสินค้าแล้ว" — รอยืนยันในกล่องถามย้ำ */
  const [receiving, setReceiving] = useState<OrderItem | null>(null);

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
      setConfirming(false);
      setAnswers({});
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

  // ชิ้นของเราที่ยังไม่ได้ตอบ — เป็นตัวตัดสินว่าจะโชว์แผงเลือกความพร้อมไหม
  const pendingMyItems = myItems.filter((i) => i.availabilityStatus === "waiting");
  const answeredCount = pendingMyItems.filter((i) => answers[i.id] !== undefined).length;

  /*
   * สรุปสถานะของผู้ขายคนนี้
   * ต้องมี "mixed" ด้วย เพราะตอบแยกรายชิ้นได้แล้ว การสรุปว่า "ยืนยันแล้ว" หรือ
   * "ไม่พร้อมจำหน่ายแล้ว" อย่างใดอย่างหนึ่งจะบิดความจริงเมื่อมีทั้งสองแบบปนกัน
   */
  const myAvailability = pendingMyItems.length > 0
    ? "waiting"
    : myItems.every((i) => i.availabilityStatus === "confirmed")
      ? "confirmed"
      : myItems.every((i) => i.availabilityStatus === "rejected")
        ? "rejected"
        : "mixed";

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

  // หลักฐานการจัดส่งมีความหมายเฉพาะหลังยืนยันการชำระเงินแล้ว และเฉพาะชิ้นที่พร้อมขาย
  const paid = order.paymentStatus === "confirmed";
  const shipsItem = (i: OrderItem) => paid && i.availabilityStatus === "confirmed";
  const myShippableItems = myItems.filter(shipsItem);
  const awaitingReceipt = isBuyer ? order.items.filter((i) => shipsItem(i) && i.shippingStatus === "shipped") : [];

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
                <div key={item.id} className="flex flex-col gap-3 border-b border-stone-100 pb-3 last:border-0 last:pb-0">
                <div className="flex items-center gap-3">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={item.artworkImage}
                    alt={item.artworkName}
                    {...protectedImageProps}
                    className={`h-14 w-14 rounded-lg object-cover ${PROTECTED_IMAGE_CLASS}`}
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
                    {/* ค่าจัดส่งรายชิ้น — คนละเจ้าคนละราคา ผู้ซื้อควรเห็นว่ายอดมาจากไหน */}
                    {item.shippingCompanyName && (
                      <p className="mt-0.5 text-xs text-stone-500">
                        จัดส่งโดย {item.shippingCompanyName}
                        {item.shippingCost != null &&
                          ` · ค่าส่ง ${item.shippingCost.toLocaleString()} บาท`}
                      </p>
                    )}
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <p className="text-sm font-medium text-stone-900">
                      {item.price.toLocaleString()} บาท
                    </p>
                    {shipsItem(item) && (
                      <StatusBadge status={item.shippingStatus ?? "not_shipped"} domain="shipping" />
                    )}
                  </div>
                </div>

                {/*
                  ผู้ซื้อเห็นหลักฐานการจัดส่งรายชิ้น (รูปแพ็ค + รหัสพัสดุ) เพื่อตรวจสอบและติดตามพัสดุ
                  ส่วนผู้ขายจัดการในแผงด้านล่าง จึงไม่แสดงซ้ำตรงนี้
                */}
                {isBuyer && shipsItem(item) && (
                  <div className="ml-[68px] flex flex-col gap-3 rounded-lg bg-stone-50 p-3">
                    <ShippingEvidence item={item} />
                    {item.shippingStatus === "shipped" && (
                      <div className="flex flex-wrap items-center gap-3">
                        <Button onClick={() => setReceiving(item)} disabled={busy}>
                          ได้รับสินค้าแล้ว
                        </Button>
                        {order.autoDeliveryConfirmAt && (
                          <span className="text-xs text-stone-500">
                            หากไม่กดยืนยัน ระบบจะยืนยันให้อัตโนมัติวันที่{" "}
                            {formatThaiDate(order.autoDeliveryConfirmAt)}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                )}
                </div>
              ))}
            </div>
          </Card>

          {/* ผู้ขายต้องเห็นที่อยู่เพื่อจัดส่ง ผู้ซื้อต้องเห็นเพื่อตรวจว่าส่งถูกที่ */}
          {order.shippingAddress && (
            <Card className="p-5 text-sm">
              <p className="text-stone-500">ที่อยู่จัดส่ง</p>
              <p className="mt-1 font-medium text-stone-800">{order.shippingAddress}</p>
            </Card>
          )}

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

              {pendingMyItems.length > 0 ? (
                !confirming ? (
                  /*
                    เลือกความพร้อมแยกทีละชิ้น
                    ผู้ขายรายเดียวอาจมีงานหลายชิ้นในคำสั่งซื้อเดียว บางชิ้นพร้อมส่ง
                    บางชิ้นอาจเสียหาย/ขายไปแล้ว การบังคับตอบเหมือนกันทุกชิ้น
                    ทำให้ต้องปฏิเสธทั้งใบทั้งที่มีของพร้อมส่งอยู่
                  */
                  <div className="flex flex-col gap-2">
                    {pendingMyItems.map((item) => (
                      <div
                        key={item.id}
                        className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-stone-200 p-3"
                      >
                        <span className="text-sm text-stone-800">{item.artworkName}</span>
                        <div className="flex gap-2">
                          <Button
                            variant={answers[item.id] === true ? "primary" : "secondary"}
                            disabled={busy}
                            onClick={() => setAnswers((a) => ({ ...a, [item.id]: true }))}
                          >
                            พร้อมขาย
                          </Button>
                          <Button
                            variant={answers[item.id] === false ? "danger" : "secondary"}
                            disabled={busy}
                            onClick={() => setAnswers((a) => ({ ...a, [item.id]: false }))}
                          >
                            ไม่พร้อมขาย
                          </Button>
                        </div>
                      </div>
                    ))}

                    <div className="mt-2 flex flex-wrap items-center gap-3">
                      <Button
                        disabled={busy || answeredCount === 0}
                        onClick={() => setConfirming(true)}
                      >
                        บันทึกความพร้อม ({answeredCount}/{pendingMyItems.length})
                      </Button>
                      {answeredCount === 0 && (
                        <span className="text-sm text-stone-500">
                          เลือกความพร้อมของผลงานอย่างน้อย 1 ชิ้นก่อน
                        </span>
                      )}
                    </div>
                  </div>
                ) : (
                  /*
                    ถามย้ำก่อนบันทึก เพราะ backend ไม่ให้แก้ซ้ำ
                    (confirmAvailability ตอบ "รายการนี้ถูกยืนยันไปแล้ว" ถ้ากดอีกรอบ)
                    การกดพลาดจึงย้อนไม่ได้เลย ต้องเตือนให้ชัดก่อน
                  */
                  <div className="rounded-lg border border-amber-300 bg-amber-50 p-4">
                    <p className="font-medium text-amber-900">ยืนยันการตอบความพร้อม?</p>
                    <ul className="mt-2 flex flex-col gap-1 text-sm text-amber-900">
                      {pendingMyItems
                        .filter((i) => answers[i.id] !== undefined)
                        .map((i) => (
                          <li key={i.id}>
                            {i.artworkName} —{" "}
                            <span className="font-medium">
                              {answers[i.id] ? "พร้อมขาย" : "ไม่พร้อมขาย"}
                            </span>
                          </li>
                        ))}
                    </ul>
                    <p className="mt-2 text-sm text-amber-800">
                      เมื่อบันทึกแล้วจะแก้ไขไม่ได้อีก ผลงานที่แจ้งไม่พร้อมจะกลับไปเปิดขายให้คนอื่น
                      ส่วนผู้ซื้อจะชำระเงินได้เมื่อผู้ขายทุกคนตอบครบ
                    </p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <Button
                        disabled={busy}
                        onClick={() =>
                          run(
                            () => confirmAvailability(order.id, answers),
                            "บันทึกความพร้อมในการขายแล้ว"
                          )
                        }
                      >
                        {busy ? "กำลังบันทึก..." : "ยืนยัน"}
                      </Button>
                      <Button variant="ghost" disabled={busy} onClick={() => setConfirming(false)}>
                        ยกเลิก
                      </Button>
                    </div>
                  </div>
                )
              ) : (
                /* ตอบครบแล้วแทนที่ปุ่มด้วยสรุป ไม่เหลือปุ่มให้กดซ้ำแล้วเจอ error */
                <div className="flex flex-col gap-2">
                  <p
                    className={`rounded-lg px-3 py-2 text-sm font-medium ${
                      myAvailability === "confirmed"
                        ? "bg-emerald-50 text-emerald-800"
                        : myAvailability === "rejected"
                          ? "bg-rose-50 text-rose-700"
                          : "bg-amber-50 text-amber-800"
                    }`}
                  >
                    {/* ใส่ "คุณ" นำหน้าให้ต่างจากป้ายสถานะรวมของคำสั่งซื้อที่อยู่ด้านบน */}
                    {myAvailability === "confirmed"
                      ? "คุณยืนยันความพร้อมแล้ว"
                      : myAvailability === "rejected"
                        ? "คุณแจ้งไม่พร้อมจำหน่ายแล้ว"
                        : "คุณตอบความพร้อมครบทุกชิ้นแล้ว"}
                  </p>
                  {/* มีทั้งพร้อมและไม่พร้อมปนกัน ต้องบอกรายชิ้นไม่งั้นสรุปรวมกำกวม */}
                  {myAvailability === "mixed" && (
                    <ul className="flex flex-col gap-1 text-sm text-stone-600">
                      {myItems.map((i) => (
                        <li key={i.id}>
                          {i.artworkName} —{" "}
                          <span className="font-medium">
                            {i.availabilityStatus === "confirmed" ? "พร้อมขาย" : "ไม่พร้อมขาย"}
                          </span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )}

              <div className="mt-5 border-t border-stone-100 pt-4">
                <p className="mb-1 text-sm font-medium text-stone-700">การจัดส่ง</p>
                {paid ? (
                  myShippableItems.length > 0 ? (
                    <>
                      <p className="mb-3 text-xs text-stone-500">
                        อัปเดตทีละชิ้น: แนบรูปตอนแพ็คสินค้าและกรอกรหัสพัสดุให้ครบ แล้วกดบันทึกครั้งเดียว
                        — ผู้ซื้อและผู้ดูแลระบบจะเห็นหลักฐานนี้
                      </p>
                      <div className="flex flex-col gap-3">
                        {myShippableItems.map((item) => (
                          <SellerShippingControl
                            key={item.id}
                            item={item}
                            autoDeliveryConfirmAt={order.autoDeliveryConfirmAt}
                            onChanged={load}
                          />
                        ))}
                      </div>
                    </>
                  ) : (
                    <p className="rounded-lg bg-stone-100 px-3 py-2 text-sm text-stone-600">
                      ไม่มีผลงานที่ต้องจัดส่งในคำสั่งซื้อนี้
                    </p>
                  )
                ) : (
                  // อธิบายว่าทำไมยังแก้ไม่ได้ ดีกว่าซ่อนช่องไปเฉยๆ แล้วผู้ขายหาไม่เจอ
                  <p className="rounded-lg bg-stone-100 px-3 py-2 text-sm text-stone-600">
                    อัปเดตได้หลังผู้ดูแลระบบยืนยันการโอนเงินของผู้ซื้อแล้ว
                  </p>
                )}
              </div>

              {/* เงินที่ผู้ขายจะได้รับ — ผู้ดูแลระบบโอนให้หลังจัดส่งสำเร็จครบทุกชิ้นของร้านนี้ */}
              {paid && order.sellerPayout && (
                <div className="mt-5 border-t border-stone-100 pt-4">
                  <p className="mb-2 text-sm font-medium text-stone-700">การรับเงินจากระบบ</p>
                  <div className="flex flex-col gap-2 rounded-lg border border-stone-200 p-3 text-sm">
                    <div className="flex justify-between">
                      <span className="text-stone-500">ยอดที่จะได้รับ (ราคาผลงาน + ค่าจัดส่ง)</span>
                      <span className="font-semibold text-stone-900">
                        {order.sellerPayout.amount.toLocaleString()} บาท
                      </span>
                    </div>
                    {order.sellerPayout.hasBankAccount ? (
                      <p className="text-xs text-stone-500">
                        {order.sellerPayout.paid ? "โอนเข้าบัญชี" : "จะโอนเข้าบัญชี"}{" "}
                        {order.sellerPayout.bankName}{" "}
                        {formatBankAccountNumber(order.sellerPayout.bankAccountNumber)} (
                        {order.sellerPayout.bankAccountName})
                      </p>
                    ) : (
                      <p className="rounded-lg bg-amber-50 px-3 py-2 text-amber-800">
                        คุณยังไม่ได้ตั้งบัญชีรับเงิน —{" "}
                        <Link href="/profile/bank-account" className="font-medium underline">
                          ตั้งบัญชีรับเงิน
                        </Link>{" "}
                        เพื่อให้ผู้ดูแลระบบโอนเงินให้ได้
                      </p>
                    )}
                    {order.sellerPayout.paid ? (
                      <>
                        <p className="rounded-lg bg-emerald-50 px-3 py-2 text-emerald-800">
                          ผู้ดูแลระบบโอนเงินให้แล้ว · {formatThaiDateTime(order.sellerPayout.paidAt)}
                        </p>
                        {order.sellerPayout.slipTransfer && (
                          <div className="flex items-center gap-3">
                            <EvidenceThumb
                              src={order.sellerPayout.slipTransfer}
                              alt="หลักฐานการโอนเงินให้ผู้ขาย"
                            />
                            <span className="text-xs text-stone-500">หลักฐานการโอนเงิน (กดเพื่อขยาย)</span>
                          </div>
                        )}
                      </>
                    ) : order.sellerPayout.readyForPayout ? (
                      <p className="rounded-lg bg-indigo-50 px-3 py-2 text-indigo-800">
                        จัดส่งสำเร็จครบแล้ว — รอผู้ดูแลระบบโอนเงินให้
                      </p>
                    ) : (
                      <p className="rounded-lg bg-stone-100 px-3 py-2 text-stone-600">
                        จะได้รับเงินเมื่อผลงานของร้านคุณจัดส่งสำเร็จครบทุกชิ้น (
                        {order.sellerPayout.deliveredCount}/{order.sellerPayout.itemCount} ชิ้น)
                      </p>
                    )}
                  </div>
                </div>
              )}
            </Card>
          )}
        </div>

        <Card className="h-fit p-5">
          <h2 className="mb-3 font-serif text-base font-bold text-stone-900">สรุปยอด</h2>
          <div className="flex flex-col gap-2 text-sm text-stone-600">
            {isSeller ? (
              <div className="flex justify-between">
                <span>ยอดเฉพาะผลงานของร้านคุณ</span>
                <span>{visibleTotal.toLocaleString()} บาท</span>
              </div>
            ) : (
              <>
                <div className="flex justify-between">
                  <span>ราคารวมชิ้นงาน{partialOrder && " (เฉพาะที่พร้อมขาย)"}</span>
                  <span>
                    {(partialOrder ? order.payableTotalAmount : order.totalAmount).toLocaleString()} บาท
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>ค่าจัดส่ง</span>
                  <span>
                    {(partialOrder
                      ? order.payableShippingCost
                      : order.shippingCost
                    ).toLocaleString()}{" "}
                    บาท
                  </span>
                </div>
                {/* บอกให้ชัดว่าตัดชิ้นที่ไม่พร้อมขายออกจากยอดแล้ว ไม่ใช่คิดเงินขาด */}
                {partialOrder && (
                  <p className="rounded-lg bg-stone-100 px-3 py-2 text-xs text-stone-600">
                    ไม่รวมผลงาน {progress.rejected} ชิ้นที่ผู้ขายแจ้งว่าไม่พร้อมจำหน่าย
                    (ยอดเต็มของคำสั่งซื้อคือ {order.grandTotal.toLocaleString()} บาท)
                  </p>
                )}
                <div className="flex justify-between border-t border-stone-200 pt-2 text-base font-semibold text-stone-900">
                  <span>ยอดสุทธิ</span>
                  <span>
                    {(partialOrder ? order.payableGrandTotal : order.grandTotal).toLocaleString()} บาท
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

                {awaitingReceipt.length > 0 && (
                  <p className="rounded-lg bg-sky-50 px-3 py-2 text-xs text-sky-800">
                    มีสินค้า {awaitingReceipt.length} ชิ้นที่ผู้ขายจัดส่งแล้ว — เมื่อได้รับของ
                    กรุณากด &quot;ได้รับสินค้าแล้ว&quot; ที่รายการสินค้า
                  </p>
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

      {/*
        ถามย้ำก่อนยืนยันรับของ เพราะย้อนไม่ได้ และเป็นเงื่อนไขที่ทำให้ระบบโอนเงินให้ผู้ขาย
        ผู้ซื้อควรเปิดตรวจสินค้าก่อนกด
      */}
      <ConfirmDialog
        open={receiving !== null}
        busy={busy}
        onCancel={() => setReceiving(null)}
        onConfirm={() => {
          const item = receiving;
          if (!item) return;
          run(
            () => confirmItemDelivered(order.id, item.id),
            "ยืนยันการได้รับสินค้าแล้ว"
          ).finally(() => setReceiving(null));
        }}
        steps={[
          {
            title: "ยืนยันว่าได้รับสินค้าแล้ว?",
            description:
              `"${receiving?.artworkName ?? ""}" จะเปลี่ยนเป็นจัดส่งสำเร็จ และแก้ไขกลับไม่ได้ ` +
              "กรุณาตรวจสอบสภาพสินค้าก่อนยืนยัน",
            confirmLabel: "ได้รับสินค้าแล้ว",
          },
        ]}
      />
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
