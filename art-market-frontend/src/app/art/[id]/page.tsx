"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { getArtwork } from "@/lib/api";
import { formatArtworkSize } from "@/lib/format";
import { Artwork } from "@/types";
import { Button, Card, Container, Spinner } from "@/components/ui";
import { StatusBadge } from "@/components/StatusBadge";
import { ZoomableImage } from "@/components/ZoomableImage";
import { useAuth } from "@/context/AuthContext";
import { useCart } from "@/context/CartContext";
import { useToast } from "@/context/ToastContext";

const FIELD_LABELS: Array<[keyof Artwork, string]> = [
  ["artworkType", "ประเภทงานศิลปะ"],
  ["artworkStyle", "สไตล์งานศิลปะ"],
  ["artworkMediums", "เทคนิคงานศิลปะ"],
  ["artworkMaterial", "วัสดุงานศิลปะ"],
];

export default function ArtDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [artwork, setArtwork] = useState<Artwork | null | undefined>(undefined);
  const { user } = useAuth();
  const { add, items } = useCart();
  const { notify } = useToast();
  const router = useRouter();

  useEffect(() => {
    getArtwork(id).then((a) => setArtwork(a ?? null));
  }, [id]);

  if (artwork === undefined) return <Spinner />;
  if (artwork === null) {
    return (
      <Container className="py-16 text-center">
        <p className="text-stone-600">ไม่พบงานศิลปะที่ค้นหา</p>
        <Link href="/" className="mt-4 inline-block text-amber-700 underline">
          กลับไปหน้าค้นหางานศิลปะ
        </Link>
      </Container>
    );
  }

  const alreadyInCart = items.some((i) => i.artworkId === artwork.id);
  const isOwnArtwork = user?.id === artwork.sellerId;

  /*
   * งานที่ถูกสั่งซื้อไปแล้ว (RESERVED) หรือขายแล้ว (SOLD) ใส่ตะกร้าไม่ได้
   * backend ปฏิเสธอยู่แล้วด้วย "งานศิลปะชิ้นนี้ไม่พร้อมจำหน่ายในขณะนี้"
   * แต่ต้องปิดปุ่มด้วย — ปุ่มที่กดแล้วเด้ง error ทุกครั้งแย่กว่าปุ่มที่กดไม่ได้
   */
  const salesStatus = artwork.salesStatus ?? "available";
  const isAvailable = salesStatus === "available";
  const isSold = salesStatus === "sold";

  function cartButtonLabel() {
    if (isSold) return "ขายแล้ว";
    if (!isAvailable) return "ไม่พร้อมจำหน่าย";
    return alreadyInCart ? "อยู่ในตะกร้าแล้ว" : "เพิ่มลงตะกร้า";
  }

  async function handleAddToCart() {
    if (!user) {
      router.push("/login");
      return;
    }
    try {
      await add(artwork!.id);
      notify("เพิ่มลงในตะกร้าเรียบร้อยแล้ว", "success");
    } catch (e) {
      notify(e instanceof Error ? e.message : "ไม่สามารถเพิ่มลงในตะกร้าได้", "error");
    }
  }

  return (
    <Container className="grid gap-8 py-10 md:grid-cols-2">
      <div className="self-start">
        <ZoomableImage src={artwork.artworkImage} alt={artwork.artworkName} />
      </div>

      <div className="flex flex-col gap-5">
        <div>
          <p className="text-sm text-stone-500">
            โดย{" "}
            <Link
              href={`/users/${artwork.sellerId}`}
              className="font-medium text-stone-700 underline hover:text-stone-900"
            >
              {artwork.sellerName}
            </Link>
          </p>
          <div className="mt-1 flex flex-wrap items-center gap-3">
            <h1 className="font-serif text-2xl font-bold text-stone-900">{artwork.artworkName}</h1>
            {!isAvailable && <StatusBadge status={salesStatus} domain="sales" />}
          </div>
        </div>

        <p className="text-3xl font-bold text-stone-900">฿{artwork.price.toLocaleString()}</p>

        {/*
          แถบสถานะ — ขึ้นเฉพาะตอนที่ซื้อไม่ได้ ไม่มีแถบ "พร้อมจำหน่าย"
          เพราะการติดป้ายให้ทุกงานทำให้ป้ายหมดความหมาย งานที่ซื้อไม่ได้จริง ๆ จะไม่สะดุดตา

          วางไว้ใต้ราคาเพราะเป็นจุดที่สายตาหยุดอยู่แล้ว ป้ายเล็ก ๆ ข้างชื่อผลงาน
          อ่านไม่ทันถ้าไม่ตั้งใจมอง แต่แถบเต็มความกว้างมองข้ามไม่ได้
        */}
        {!isAvailable && (
          <div
            role="status"
            className={`rounded-lg border px-4 py-3 ${
              isSold ? "border-stone-300 bg-stone-100" : "border-amber-200 bg-amber-50"
            }`}
          >
            <p
              className={`text-sm font-semibold ${
                isSold ? "text-stone-900" : "text-amber-900"
              }`}
            >
              {isSold ? "ผลงานชิ้นนี้ขายไปแล้ว" : "ผลงานชิ้นนี้อยู่ในคำสั่งซื้อของผู้ซื้อรายอื่น"}
            </p>
            <p className={`mt-0.5 text-sm ${isSold ? "text-stone-600" : "text-amber-800"}`}>
              {isSold
                ? "หน้านี้แสดงไว้เป็นผลงานเก่าของศิลปิน ไม่เปิดขายอีกและไม่ปรากฏในหน้าค้นหาแล้ว"
                : "หากผู้ขายแจ้งว่าไม่พร้อมจำหน่าย หรือคำสั่งซื้อถูกยกเลิก ผลงานจะกลับมาเปิดขายอีกครั้ง"}
            </p>
          </div>
        )}

        <Card className="grid grid-cols-2 gap-4 p-4 text-sm">
          {FIELD_LABELS.map(([key, label]) => (
            <div key={key}>
              <p className="text-stone-500">{label}</p>
              <p className="font-medium text-stone-800">{String(artwork[key])}</p>
            </div>
          ))}
          <div>
            <p className="text-stone-500">ขนาดงานศิลปะ (กว้าง x ยาว)</p>
            <p className="font-medium text-stone-800">{formatArtworkSize(artwork)}</p>
          </div>
          {artwork.weight != null && (
            <div>
              <p className="text-stone-500">น้ำหนัก</p>
              <p className="font-medium text-stone-800">{artwork.weight} กก.</p>
            </div>
          )}
        </Card>

        {/*
          ค่าจัดส่งที่โชว์ตรงนี้เป็น "ค่าประเมิน" เส้นทางข้ามจังหวัด
          ค่าจริงคำนวณตอนยืนยันคำสั่งซื้อ เมื่อผู้ซื้อเลือกที่อยู่ปลายทางแล้ว
          จึงต้องเขียนกำกับให้ชัด ไม่ใช่โชว์ตัวเลขลอยๆ ให้เข้าใจว่าเป็นราคาสุดท้าย
        */}
        {artwork.shippingCompanyName && (
          <div className="rounded-lg bg-stone-100 px-3 py-2 text-sm text-stone-600">
            จัดส่งโดย{" "}
            <span className="font-medium text-stone-800">{artwork.shippingCompanyName}</span>
            {artwork.shippingCostEstimate != null && (
              <>
                {" "}· ค่าจัดส่งประมาณ{" "}
                <span className="font-medium text-stone-800">
                  ฿{artwork.shippingCostEstimate.toLocaleString()}
                </span>
              </>
            )}
            <span className="mt-0.5 block text-xs text-stone-500">
              ค่าจัดส่งจริงคำนวณจากจังหวัดปลายทาง จะแสดงตอนยืนยันคำสั่งซื้อ
            </span>
          </div>
        )}

        <div>
          <p className="mb-1 text-sm font-medium text-stone-700">คำอธิบายผลงาน</p>
          <p className="text-sm leading-relaxed text-stone-600">{artwork.description}</p>
        </div>

        {!isOwnArtwork && (
          <div className="flex flex-col gap-2 pt-2">
            <div className="flex flex-wrap gap-3">
              <Button onClick={handleAddToCart} disabled={alreadyInCart || !isAvailable}>
                {cartButtonLabel()}
              </Button>

              {/*
                ลิขสิทธิ์ถูกโอนไปแล้ว = จบถาวร ไม่ใช่แค่ "ตอนนี้ยังไม่ว่าง"
                สัญญาของระบบเป็นการโอนแต่เพียงผู้เดียวตลอดอายุการคุ้มครอง ขายได้ครั้งเดียว
                ต้องขึ้นปุ่มบอกสถานะ ไม่ใช่ซ่อนไปเฉยๆ แล้วให้ผู้ใช้เดาว่าทำไมหาย
              */}
              {artwork.copyrightSold ? (
                <Button variant="secondary" disabled>
                  ลิขสิทธิ์ถูกโอนไปแล้ว
                </Button>
              ) : (
                artwork.copyrightAvailable &&
                /*
                 * ลิขสิทธิ์กับตัวชิ้นงานเป็นสินค้าคนละชิ้น งานที่มีคนสั่งซื้ออยู่ (RESERVED)
                 * จึงยังขอซื้อลิขสิทธิ์ได้ตามปกติ — ปิดเฉพาะตอนขายขาดไปแล้ว (SOLD)
                 */
                (isSold ? (
                  <Button variant="secondary" disabled>
                    ขอซื้อลิขสิทธิ์ไม่ได้ (ขายแล้ว)
                  </Button>
                ) : (
                  <Link href={user ? `/copyright/new/${artwork.id}` : "/login"}>
                    <Button variant="secondary">
                      ขอซื้อลิขสิทธิ์ (฿{(artwork.copyrightPrice ?? 0).toLocaleString()})
                    </Button>
                  </Link>
                ))
              )}
            </div>

          </div>
        )}
        {isOwnArtwork && (
          <p className="rounded-lg bg-stone-100 px-3 py-2 text-sm text-stone-600">
            นี่คือผลงานของคุณเอง — จัดการได้ที่{" "}
            <Link
              href={`/seller/art/${artwork.id}/edit`}
              className="font-medium text-amber-700 underline"
            >
              แก้ไขงานศิลปะ
            </Link>
          </p>
        )}
      </div>
    </Container>
  );
}
