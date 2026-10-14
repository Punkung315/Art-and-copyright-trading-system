"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { RequireUser } from "@/components/RoleGuard";
import { useCart } from "@/context/CartContext";
import { useToast } from "@/context/ToastContext";
import { Button, Card, Container, EmptyState } from "@/components/ui";
import { PROTECTED_IMAGE_CLASS, protectedImageProps } from "@/lib/protectImage";

function CartContent() {
  const { items, total, remove } = useCart();
  const { notify } = useToast();
  const router = useRouter();

  async function handleRemove(id: string) {
    try {
      await remove(id);
      notify("ลบรายการสินค้าออกจากตะกร้าแล้ว", "success");
    } catch {
      notify("ลบรายการสินค้าไม่สำเร็จ", "error");
    }
  }

  return (
    <Container className="py-10">
      <h1 className="mb-6 font-serif text-2xl font-bold text-stone-900">ตะกร้าสินค้า</h1>

      {items.length === 0 ? (
        <EmptyState title="ยังไม่มีรายการสินค้าในตะกร้า" description="เลือกซื้อผลงานศิลปะที่คุณสนใจได้เลย" />
      ) : (
        <div className="grid gap-6 lg:grid-cols-3">
          <div className="flex flex-col gap-3 lg:col-span-2">
            {items.map((item) => (
              <Card key={item.id} className="flex items-center gap-4 p-4">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={item.artwork?.artworkImage}
                  alt={item.artwork?.artworkName}
                  {...protectedImageProps}
                  className={`h-20 w-20 rounded-lg object-cover ${PROTECTED_IMAGE_CLASS}`}
                />
                <div className="flex-1">
                  <p className="font-medium text-stone-900">{item.artwork?.artworkName}</p>
                  <p className="text-xs text-stone-500">{item.artwork?.sellerName}</p>
                  <p className="text-xs text-stone-400">
                    เพิ่มเมื่อ {new Date(item.addDate).toLocaleDateString("th-TH")}
                  </p>
                </div>
                <p className="font-semibold text-stone-900">{item.priceAtAdd.toLocaleString()} บาท</p>
                <Button variant="ghost" onClick={() => handleRemove(item.id)}>
                  ลบ
                </Button>
              </Card>
            ))}
          </div>

          <Card className="h-fit p-6">
            <h2 className="font-serif text-lg font-bold text-stone-900">สรุปยอดสั่งซื้อ</h2>
            <div className="mt-4 flex items-center justify-between text-sm text-stone-600">
              <span>ราคารวม ({items.length} ชิ้น)</span>
              <span>{total.toLocaleString()} บาท</span>
            </div>
            <p className="mt-1 text-xs text-stone-400">
              * ค่าจัดส่งจะคำนวณในขั้นตอนยืนยันคำสั่งซื้อ
            </p>
            <Button className="mt-4 w-full" onClick={() => router.push("/checkout")}>
              ยืนยันคำสั่งซื้อ
            </Button>
            <Link href="/" className="mt-3 block text-center text-sm text-amber-700 underline">
              เลือกซื้อผลงานเพิ่ม
            </Link>
          </Card>
        </div>
      )}
    </Container>
  );
}

export default function CartPage() {
  return (
    <RequireUser>
      <CartContent />
    </RequireUser>
  );
}
