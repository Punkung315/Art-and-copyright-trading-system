"use client";

import { useEffect, useMemo, useState } from "react";
import { searchArtworks } from "@/lib/api";
import { Artwork } from "@/types";
import { ArtCard } from "@/components/ArtCard";
import { Container, EmptyState, Input, Select, Spinner } from "@/components/ui";

const ARTWORK_TYPES = [
  "Painting",
  "Digital Art",
  "Photography",
  "Sculpture",
];

export default function HomePage() {
  const [artworks, setArtworks] = useState<Artwork[] | null>(null);
  const [q, setQ] = useState("");
  const [type, setType] = useState("");

  useEffect(() => {
    let active = true;
    searchArtworks({ q, artworkType: type || undefined }).then((res) => {
      if (active) setArtworks(res);
    });
    return () => {
      active = false;
    };
  }, [q, type]);

  const count = useMemo(() => artworks?.length ?? 0, [artworks]);

  return (
    <div>
      <section className="border-b border-stone-200 bg-gradient-to-b from-amber-50 to-stone-50 py-14">
        <Container className="flex flex-col gap-4 text-center">
          <p className="text-sm font-medium uppercase tracking-widest text-amber-700">
            Art & Copyright Market
          </p>
          <h1 className="font-serif text-3xl font-bold text-stone-900 sm:text-4xl">
            ค้นพบและซื้อขายผลงานศิลปะ พร้อมโอนลิขสิทธิ์อย่างน่าเชื่อถือ
          </h1>
          <p className="mx-auto max-w-2xl text-sm text-stone-600 sm:text-base">
            แพลตฟอร์มกลางเชื่อมโยงศิลปิน ผู้ซื้อ และผู้ดูแลระบบ
            เพื่อการซื้อขายชิ้นงานต้นฉบับและลิขสิทธิ์ผลงานศิลปะที่โปร่งใสและปลอดภัย
          </p>
        </Container>
      </section>

      <Container className="py-10">
        <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center">
          <Input
            placeholder="ค้นหาชื่อผลงาน ศิลปิน หรือประเภทงานศิลปะ"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            className="sm:flex-1"
          />
          <Select value={type} onChange={(e) => setType(e.target.value)} className="sm:w-56">
            <option value="">ทุกประเภทงานศิลปะ</option>
            {ARTWORK_TYPES.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </Select>
        </div>

        {artworks === null ? (
          <Spinner />
        ) : count === 0 ? (
          <EmptyState title="ไม่พบงานศิลปะที่ค้นหา" description="ลองเปลี่ยนคำค้นหาหรือประเภทงานศิลปะ" />
        ) : (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {artworks.map((a) => (
              <ArtCard key={a.id} artwork={a} />
            ))}
          </div>
        )}
      </Container>
    </div>
  );
}
