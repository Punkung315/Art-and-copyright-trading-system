"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { getArtwork } from "@/lib/api";
import { Artwork } from "@/types";
import { Button, Card, Container, Spinner } from "@/components/ui";
import { useAuth } from "@/context/AuthContext";
import { useCart } from "@/context/CartContext";
import { useToast } from "@/context/ToastContext";

const FIELD_LABELS: Array<[keyof Artwork, string]> = [
  ["artworkType", "ประเภทงานศิลปะ"],
  ["artworkStyle", "สไตล์งานศิลปะ"],
  ["artworkMediums", "เทคนิคงานศิลปะ"],
  ["artworkMaterial", "วัสดุงานศิลปะ"],
  ["artworkSize", "ขนาดงานศิลปะ"],
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
      <div className="overflow-hidden rounded-xl border border-stone-200 bg-stone-100">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={artwork.artworkImage} alt={artwork.artworkName} className="h-full w-full object-cover" />
      </div>

      <div className="flex flex-col gap-5">
        <div>
          <p className="text-sm text-stone-500">โดย {artwork.sellerName}</p>
          <h1 className="font-serif text-2xl font-bold text-stone-900">{artwork.artworkName}</h1>
        </div>

        <p className="text-3xl font-bold text-stone-900">฿{artwork.price.toLocaleString()}</p>

        <Card className="grid grid-cols-2 gap-4 p-4 text-sm">
          {FIELD_LABELS.map(([key, label]) => (
            <div key={key}>
              <p className="text-stone-500">{label}</p>
              <p className="font-medium text-stone-800">{String(artwork[key])}</p>
            </div>
          ))}
        </Card>

        <div>
          <p className="mb-1 text-sm font-medium text-stone-700">คำอธิบายผลงาน</p>
          <p className="text-sm leading-relaxed text-stone-600">{artwork.description}</p>
        </div>

        {!isOwnArtwork && (
          <div className="flex flex-wrap gap-3 pt-2">
            <Button onClick={handleAddToCart} disabled={alreadyInCart}>
              {alreadyInCart ? "อยู่ในตะกร้าแล้ว" : "เพิ่มลงตะกร้า"}
            </Button>
            {artwork.copyrightAvailable && (
              <Link href={user ? `/copyright/new/${artwork.id}` : "/login"}>
                <Button variant="secondary">
                  ขอซื้อลิขสิทธิ์ (฿{(artwork.copyrightPrice ?? 0).toLocaleString()})
                </Button>
              </Link>
            )}
          </div>
        )}
        {isOwnArtwork && (
          <p className="rounded-lg bg-stone-100 px-3 py-2 text-sm text-stone-600">
            นี่คือผลงานของคุณเอง — จัดการได้ที่{" "}
            <Link href={`/seller/art/${artwork.id}/edit`} className="font-medium text-amber-700 underline">
              แก้ไขงานศิลปะ
            </Link>
          </p>
        )}
      </div>
    </Container>
  );
}
