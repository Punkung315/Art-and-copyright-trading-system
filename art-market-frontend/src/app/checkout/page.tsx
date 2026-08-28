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

  async function handleConfirm() {
    if (!user || !selectedId) return;
    setSubmitting(true);
    try {
      const orders = await confirmOrder(user, selectedId);
      await refresh();
      notify("ยืนยันคำสั่งซื้อสำเร็จ ระบบได้ส่งคำขอไปยังผู้ขายเพื่อยืนยันความพร้อม", "success");
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

  const sellers = Array.from(new Set(items.map((i) => i.artwork?.sellerName)));
  const hasAddress = addresses.length > 0;

  return (
    <Container className="flex justify-center py-10">
      <Card className="w-full max-w-xl p-8">
        <h1 className="font-serif text-2xl font-bold text-stone-900">ยืนยันคำสั่งซื้อ</h1>
        <p className="mt-1 text-sm text-stone-500">
          ตรวจสอบรายการก่อนยืนยัน ระบบจะแยกคำสั่งซื้อตามผู้ขายโดยอัตโนมัติ ({sellers.join(", ")})
        </p>

        <div className="mt-6 flex flex-col gap-3">
          {items.map((item) => (
            <div key={item.id} className="flex items-center justify-between text-sm">
              <span className="text-stone-700">
                {item.artwork?.artworkName}{" "}
                <span className="text-stone-400">({item.artwork?.sellerName})</span>
              </span>
              <span className="font-medium text-stone-900">฿{item.priceAtAdd.toLocaleString()}</span>
            </div>
          ))}
        </div>

        <div className="mt-6 flex items-center justify-between border-t border-stone-200 pt-4 text-base font-semibold text-stone-900">
          <span>ยอดรวมทั้งหมด</span>
          <span>฿{total.toLocaleString()}</span>
        </div>

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

        <Button onClick={handleConfirm} disabled={submitting || !selectedId} className="mt-4 w-full">
          {submitting ? "กำลังยืนยันคำสั่งซื้อ..." : "ยืนยันคำสั่งซื้อ"}
        </Button>

        {!selectedId && (
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
