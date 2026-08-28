"use client";

import { use, useEffect, useState } from "react";
import { RequireSeller } from "@/components/RoleGuard";
import { getArtwork } from "@/lib/api";
import { formatArtworkSize } from "@/lib/format";
import { Artwork } from "@/types";
import { Button, Card, Container, Spinner } from "@/components/ui";

function CertificateContent({ id }: { id: string }) {
  const [artwork, setArtwork] = useState<Artwork | null | undefined>(undefined);

  useEffect(() => {
    getArtwork(id).then((a) => setArtwork(a ?? null));
  }, [id]);

  if (artwork === undefined) return <Spinner />;
  if (artwork === null) {
    return <Container className="py-16 text-center text-stone-600">ไม่พบข้อมูลงานศิลปะ</Container>;
  }

  return (
    <Container className="py-10">
      <div className="mb-4 flex justify-end print:hidden">
        <Button onClick={() => window.print()}>พิมพ์ใบรับรอง</Button>
      </div>

      <Card className="mx-auto max-w-2xl border-4 border-double border-stone-300 p-10 text-center print:border-0 print:shadow-none">
        <p className="font-serif text-2xl font-bold uppercase tracking-widest text-stone-900">
          Certificate of Authenticity
        </p>
        <p className="mt-1 text-xs uppercase tracking-widest text-stone-400">ใบรับรองผลงานศิลปะ</p>

        <div className="my-8 flex justify-center">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={artwork.artworkImage} alt={artwork.artworkName} className="h-48 w-48 rounded-lg object-cover shadow" />
        </div>

        <p className="font-serif text-xl text-stone-900">{artwork.artworkName}</p>
        <p className="mt-1 text-sm text-stone-500">โดย {artwork.sellerName}</p>

        <div className="mx-auto mt-6 grid max-w-sm grid-cols-2 gap-3 text-left text-sm">
          <p className="text-stone-500">ประเภท</p>
          <p className="text-stone-800">{artwork.artworkType}</p>
          <p className="text-stone-500">เทคนิค</p>
          <p className="text-stone-800">{artwork.artworkMediums}</p>
          <p className="text-stone-500">วัสดุ</p>
          <p className="text-stone-800">{artwork.artworkMaterial}</p>
          <p className="text-stone-500">ขนาด (กว้าง x ยาว)</p>
          <p className="text-stone-800">{formatArtworkSize(artwork)}</p>
          <p className="text-stone-500">วันที่ลงขาย</p>
          <p className="text-stone-800">{new Date(artwork.publishDate).toLocaleDateString("th-TH")}</p>
        </div>

        <p className="mt-8 text-xs text-stone-400">
          I certify that I am the creator of this artwork and that this piece is an authentic, original work.
        </p>
        <p className="text-xs text-stone-400">Copyright © All rights reserved</p>
      </Card>
    </Container>
  );
}

export default function CertificatePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  return (
    <RequireSeller>
      <CertificateContent id={id} />
    </RequireSeller>
  );
}
