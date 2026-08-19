"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { RequireUser } from "@/components/RoleGuard";
import { useAuth } from "@/context/AuthContext";
import { useCart } from "@/context/CartContext";
import { useToast } from "@/context/ToastContext";
import { Button, Card, Container, EmptyState } from "@/components/ui";
import { confirmOrder, ApiError } from "@/lib/api";

function CheckoutContent() {
  const { user } = useAuth();
  const { items, total, refresh } = useCart();
  const { notify } = useToast();
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);

  if (items.length === 0) {
    return (
      <Container className="py-10">
        <EmptyState title="ไม่มีรายการสั่งซื้อ" description="กรุณาเลือกสินค้าลงตะกร้าก่อนทำการยืนยันคำสั่งซื้อ" />
      </Container>
    );
  }

  const sellers = Array.from(new Set(items.map((i) => i.artwork?.sellerName)));

  async function handleConfirm() {
    if (!user) return;
    setSubmitting(true);
    try {
      const orders = await confirmOrder(user);
      await refresh();
      notify("ยืนยันคำสั่งซื้อสำเร็จ ระบบได้ส่งคำขอไปยังผู้ขายเพื่อยืนยันความพร้อม", "success");
      router.push(orders.length === 1 ? `/orders/${orders[0].id}` : "/orders");
    } catch (err) {
      notify(err instanceof ApiError ? err.message : "คำสั่งซื้อไม่ถูกต้อง กรุณาลองใหม่อีกครั้ง", "error");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Container className="flex justify-center py-10">
      <Card className="w-full max-w-xl p-8">
        <h1 className="font-serif text-2xl font-bold text-stone-900">ยืนยันคำสั่งซื้อ</h1>
        <p className="mt-1 text-sm text-stone-500">
          ตรวจสอบรายการก่อนยืนยัน ระบบจะแยกคำสั่งซื้อตามผู้ขายโดยอัตโนมัติ
          ({sellers.join(", ")})
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
        <p className="mt-1 text-xs text-stone-400">* ยังไม่รวมค่าจัดส่ง จะแสดงในใบเสนอราคา</p>

        <Button onClick={handleConfirm} disabled={submitting} className="mt-6 w-full">
          {submitting ? "กำลังยืนยันคำสั่งซื้อ..." : "ยืนยันคำสั่งซื้อ"}
        </Button>
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
