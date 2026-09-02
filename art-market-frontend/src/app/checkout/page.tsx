"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { RequireUser } from "@/components/RoleGuard";
import { useAuth } from "@/context/AuthContext";
import { useCart } from "@/context/CartContext";
import { useToast } from "@/context/ToastContext";
import { Button, Card, Container, EmptyState, Spinner } from "@/components/ui";
import { AddressForm, AddressDraft, formatAddress } from "@/components/AddressBook";
import { addAddress, confirmOrder, getMe, ApiError } from "@/lib/api";
import { Address } from "@/types";

const EMPTY_ADDRESS: AddressDraft = {
  houseNo: "",
  villageNo: "",
  thoroughfare: "",
  subDistrict: "",
  district: "",
  province: "",
  postalCode: "",
};

function CheckoutContent() {
  const { user, setUser } = useAuth();
  const { items, total, refresh } = useCart();
  const { notify } = useToast();
  const router = useRouter();

  /*
   * รายการที่เลือกจะสั่งซื้อรอบนี้ — ค่าเริ่มต้นคือเลือกทั้งหมด
   * null = ยังไม่เคยแตะ ให้ถือว่าเลือกครบ (ผู้ซื้อส่วนใหญ่สั่งทั้งตะกร้า)
   */
  const [selectedItemIds, setSelectedItemIds] = useState<Set<string> | null>(null);
  const [addresses, setAddresses] = useState<Address[] | undefined>(undefined);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [addingAddress, setAddingAddress] = useState(false);
  const [savingAddress, setSavingAddress] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    getMe().then((p) => {
      const list = p?.addresses ?? [];
      setAddresses(list);
      // เลือกที่อยู่แรกให้อัตโนมัติ ผู้ซื้อส่วนใหญ่มีที่อยู่เดียว จะได้ไม่ต้องกดเลือกเอง
      setSelectedId(list.length ? list[0].id : null);
    });
  }, []);

  async function handleAddAddress(draft: AddressDraft) {
    setSavingAddress(true);
    try {
      const updated = await addAddress(draft);
      setUser(updated);
      const list = updated.addresses ?? [];
      setAddresses(list);
      // เลือกที่อยู่ที่เพิ่งเพิ่มให้เลย เพราะผู้ซื้อกรอกมันเพื่อจะใช้ส่งของรอบนี้
      setSelectedId(list.length ? list[list.length - 1].id : null);
      setAddingAddress(false);
      notify("บันทึกที่อยู่เรียบร้อยแล้ว", "success");
    } catch (err) {
      notify(err instanceof ApiError ? err.message : "ไม่สามารถบันทึกที่อยู่ได้", "error");
    } finally {
      setSavingAddress(false);
    }
  }

  function toggleItem(id: string) {
    setSelectedItemIds((prev) => {
      const next = new Set(prev ?? items.map((i) => i.id));
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function handleConfirm() {
    if (!user || !selectedId || chosenItems.length === 0) return;
    setSubmitting(true);
    try {
      const orders = await confirmOrder(
        user,
        selectedId,
        chosenItems.map((i) => i.id)
      );
      await refresh();

      /*
       * ตรวจว่า backend สั่งซื้อตามที่เลือกจริงไหม
       *
       * backend ตีความ "ไม่ได้ส่ง cartItemIds มา" ว่าสั่งทั้งตะกร้า ถ้าเซิร์ฟเวอร์
       * ยังรันโค้ดเวอร์ชันเก่าที่ยังไม่รู้จัก field นี้ มันจะสั่งซื้อทุกชิ้นเงียบๆ
       * ผู้ซื้อจะเพิ่งมารู้ตอนเห็นบิล — ต้องฟ้องทันทีตรงนี้ ไม่ใช่ปล่อยผ่าน
       */
      const ordered = orders[0]?.items.length ?? 0;
      if (ordered > chosenItems.length) {
        notify(
          `ระบบสร้างคำสั่งซื้อ ${ordered} ชิ้น ทั้งที่เลือกไว้ ${chosenItems.length} ชิ้น ` +
            "เซิร์ฟเวอร์อาจยังไม่ได้อัปเดต กรุณาตรวจสอบคำสั่งซื้อนี้",
          "error"
        );
      } else {
        notify("ยืนยันคำสั่งซื้อสำเร็จ ระบบได้ส่งคำขอไปยังผู้ขายเพื่อยืนยันความพร้อม", "success");
      }

      router.push(orders.length === 1 ? `/orders/${orders[0].id}` : "/orders");
    } catch (err) {
      notify(err instanceof ApiError ? err.message : "คำสั่งซื้อไม่ถูกต้อง กรุณาลองใหม่อีกครั้ง", "error");
    } finally {
      setSubmitting(false);
    }
  }

  if (items.length === 0) {
    return (
      <Container className="py-10">
        <EmptyState
          title="ไม่มีรายการสั่งซื้อ"
          description="กรุณาเลือกสินค้าลงตะกร้าก่อนทำการยืนยันคำสั่งซื้อ"
        />
      </Container>
    );
  }

  if (addresses === undefined) return <Spinner />;

  const chosenItems = items.filter((i) => selectedItemIds === null || selectedItemIds.has(i.id));
  const chosenTotal = chosenItems.reduce((sum, i) => sum + i.priceAtAdd, 0);
  const sellers = Array.from(new Set(chosenItems.map((i) => i.artwork?.sellerName)));
  const hasAddress = addresses.length > 0;

  return (
    <Container className="flex justify-center py-10">
      <Card className="w-full max-w-xl p-8">
        <h1 className="font-serif text-2xl font-bold text-stone-900">ยืนยันคำสั่งซื้อ</h1>
        <p className="mt-1 text-sm text-stone-500">
          ตรวจสอบรายการก่อนยืนยัน ระบบจะแยกคำสั่งซื้อตามผู้ขายโดยอัตโนมัติ ({sellers.join(", ")})
        </p>

        {/*
          เลือกได้ว่ารอบนี้จะสั่งชิ้นไหนบ้าง ที่ไม่ได้เลือกยังอยู่ในตะกร้าให้สั่งทีหลัง
          ค่าเริ่มต้นติ๊กครบทุกชิ้น เพราะกรณีปกติคือสั่งทั้งตะกร้า
        */}
        <div className="mt-6">
          <div className="mb-2 flex items-center justify-between">
            <p className="text-sm font-medium text-stone-700">
              เลือกผลงานที่ต้องการสั่งซื้อ ({chosenItems.length}/{items.length})
            </p>
            <button
              type="button"
              className="text-sm text-amber-700 underline"
              onClick={() =>
                setSelectedItemIds(
                  chosenItems.length === items.length ? new Set() : new Set(items.map((i) => i.id))
                )
              }
            >
              {chosenItems.length === items.length ? "ล้างการเลือก" : "เลือกทั้งหมด"}
            </button>
          </div>

          <div className="flex flex-col gap-2">
            {items.map((item) => {
              const checked = selectedItemIds === null || selectedItemIds.has(item.id);
              return (
                <label
                  key={item.id}
                  className={`flex cursor-pointer items-center gap-3 rounded-lg border p-3 text-sm ${
                    checked ? "border-amber-500 bg-amber-50" : "border-stone-200 hover:bg-stone-50"
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => toggleItem(item.id)}
                  />
                  <span className="flex-1 text-stone-700">
                    {item.artwork?.artworkName}{" "}
                    <span className="text-stone-400">({item.artwork?.sellerName})</span>
                  </span>
                  <span className="font-medium text-stone-900">
                    ฿{item.priceAtAdd.toLocaleString()}
                  </span>
                </label>
              );
            })}
          </div>
        </div>

        <div className="mt-6 flex items-center justify-between border-t border-stone-200 pt-4 text-base font-semibold text-stone-900">
          <span>ยอดรวมที่เลือก</span>
          <span>฿{chosenTotal.toLocaleString()}</span>
        </div>
        {chosenItems.length < items.length && (
          <p className="mt-1 text-xs text-stone-500">
            อีก {items.length - chosenItems.length} ชิ้นที่ไม่ได้เลือกจะยังอยู่ในตะกร้า
            (ยอดรวมทั้งตะกร้า ฿{total.toLocaleString()})
          </p>
        )}

        {/*
          ที่อยู่จัดส่งต้องเลือกก่อนยืนยันเสมอ
          ค่าจัดส่งคิดจากจังหวัดปลายทาง (ในจังหวัดเดียวกันถูกกว่าข้ามจังหวัด
          ส่วนเกาะ/พื้นที่ห่างไกลมีค่าธรรมเนียมเพิ่ม) ถ้ายังไม่รู้ปลายทางก็คิดค่าส่งไม่ได้
          จึงบังคับให้เพิ่มที่อยู่ก่อนถ้าผู้ซื้อยังไม่มีในระบบ
        */}
        <div className="mt-8 border-t border-stone-200 pt-6">
          <h2 className="font-serif text-lg font-bold text-stone-900">ที่อยู่สำหรับจัดส่ง</h2>

          {!hasAddress && !addingAddress && (
            <div className="mt-3 rounded-lg bg-amber-50 px-4 py-3 text-sm text-amber-900">
              <p className="font-medium">คุณยังไม่มีที่อยู่ในระบบ</p>
              <p className="mt-1 text-xs text-amber-800">
                ต้องเพิ่มที่อยู่ก่อน ระบบจึงจะคำนวณค่าจัดส่งจากจังหวัดปลายทางได้
              </p>
              <Button type="button" className="mt-3" onClick={() => setAddingAddress(true)}>
                เพิ่มที่อยู่จัดส่ง
              </Button>
            </div>
          )}

          {hasAddress && (
            <div className="mt-3 flex flex-col gap-2">
              {addresses.map((a) => (
                <label
                  key={a.id}
                  className={`flex cursor-pointer items-start gap-3 rounded-lg border p-3 text-sm ${
                    selectedId === a.id
                      ? "border-amber-500 bg-amber-50"
                      : "border-stone-200 hover:bg-stone-50"
                  }`}
                >
                  <input
                    type="radio"
                    name="shippingAddress"
                    className="mt-1"
                    checked={selectedId === a.id}
                    onChange={() => setSelectedId(a.id)}
                  />
                  <span className="text-stone-700">{formatAddress(a)}</span>
                </label>
              ))}

              {!addingAddress && (
                <button
                  type="button"
                  className="self-start text-sm text-amber-700 underline"
                  onClick={() => setAddingAddress(true)}
                >
                  + เพิ่มที่อยู่ใหม่
                </button>
              )}
            </div>
          )}

          {addingAddress && (
            <div className="mt-4 rounded-lg border border-stone-200 p-4">
              <AddressForm
                initial={EMPTY_ADDRESS}
                submitLabel="บันทึกที่อยู่"
                busy={savingAddress}
                onSubmit={handleAddAddress}
                onCancel={hasAddress ? () => setAddingAddress(false) : undefined}
              />
            </div>
          )}
        </div>

        <p className="mt-6 text-xs text-stone-400">
          * ค่าจัดส่งคำนวณจากน้ำหนักและขนาดของแต่ละชิ้นงาน ตามขนส่งที่ผู้ขายเลือกไว้
          และจังหวัดปลายทางที่คุณเลือก — ดูยอดสุทธิได้ในหน้าคำสั่งซื้อ
        </p>

        <Button
          onClick={handleConfirm}
          disabled={submitting || !selectedId || chosenItems.length === 0}
          className="mt-4 w-full"
        >
          {submitting ? "กำลังยืนยันคำสั่งซื้อ..." : "ยืนยันคำสั่งซื้อ"}
        </Button>

        {chosenItems.length === 0 && (
          <p className="mt-2 text-center text-xs text-stone-500">
            กรุณาเลือกผลงานที่ต้องการสั่งซื้ออย่างน้อย 1 ชิ้น
          </p>
        )}
        {chosenItems.length > 0 && !selectedId && (
          <p className="mt-2 text-center text-xs text-stone-500">
            กรุณาเลือกที่อยู่สำหรับจัดส่งก่อนยืนยันคำสั่งซื้อ
          </p>
        )}
      </Card>
    </Container>
  );
}

export default function CheckoutPage() {
  return (
    <RequireUser>
      <CheckoutContent />
    </RequireUser>
  );
}
