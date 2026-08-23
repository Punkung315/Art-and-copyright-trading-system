"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { listLatestArtworks, listRecommendedArtworks, searchArtworks } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { Artwork } from "@/types";
import { ArtSection } from "@/components/ArtSection";
import { Button, Container, Input } from "@/components/ui";

/**
 * หน้าแรก — หน้าสำหรับ "ค้นพบ" ผลงาน
 *
 * แยกหน้าที่กับหน้า /search อย่างชัดเจน:
 *   หน้านี้   = แนะนำงานให้ผู้ใช้ดู (งานมาใหม่ + งานที่น่าจะชอบ) ไม่มีตัวกรอง
 *   /search  = ค้นหาแบบละเอียด มีตัวกรองครบทุกมิติ
 * ช่องค้นหาที่นี่จึงไม่ค้นในหน้าเดียวกัน แต่พาไปหน้า /search พร้อมคำค้น
 */
export default function HomePage() {
  const router = useRouter();
  const { user, loading } = useAuth();

  const [latest, setLatest] = useState<Artwork[] | null>(null);
  const [recommended, setRecommended] = useState<Artwork[] | null>(null);
  const [affordable, setAffordable] = useState<Artwork[] | null>(null);
  const [keyword, setKeyword] = useState("");

  useEffect(() => {
    let active = true;
    listLatestArtworks(8).then((r) => {
      if (active) setLatest(r);
    });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    // รอให้ AuthContext คืน session ก่อน ไม่งั้นจะยิงตอนยังไม่มี token
    // แล้วได้ผลลัพธ์แบบ "ยังไม่ได้ login" ทั้งที่ผู้ใช้ login อยู่
    if (loading) return;
    let active = true;

    // ดึงงานราคาเข้าถึงง่ายไว้เสมอ ใช้เป็นเนื้อหาสำรองของแถวที่สอง
    // เพื่อไม่ให้หน้าเหลือช่องว่างตอนที่ยังไม่มีอะไรจะแนะนำ
    searchArtworks({ sort: "price_asc", limit: 4 }).then((r) => {
      if (active) setAffordable(r);
    });

    if (user) {
      // ขอมาเกินจำนวนที่จะแสดง เพราะต้องตัดงานที่ซ้ำกับแถว "งานมาใหม่" ออกก่อน
      listRecommendedArtworks(16).then((r) => {
        if (active) setRecommended(r);
      });
    } else {
      setRecommended([]); // ยังไม่ได้ login = ไม่มีข้อมูลความสนใจให้แนะนำ
    }

    return () => {
      active = false;
    };
  }, [loading, user?.id]);

  /**
   * ตัดงานที่โชว์ในแถว "งานมาใหม่ล่าสุด" ออกจากแถวแนะนำ
   * ไม่งั้นเวลาระบบยังมีงานไม่เยอะ สองแถวจะแสดงงานชุดเดียวกันเป๊ะ ๆ ดูเหมือนหน้าเสีย
   */
  const latestIds = new Set((latest ?? []).map((a) => a.id));
  const recommendedUnique =
    recommended === null ? null : recommended.filter((a) => !latestIds.has(a.id)).slice(0, 8);

  // ถ้าไม่เหลืองานที่ไม่ซ้ำเลย (เกิดขึ้นตอนระบบยังมีงานไม่เยอะ)
  // ให้แถวที่สองแสดงงานราคาเข้าถึงง่ายแทน จะได้ไม่เหลือช่องว่างบนหน้า
  const hasRecommendations = recommendedUnique === null || recommendedUnique.length > 0;

  function handleSearch(e: FormEvent) {
    e.preventDefault();
    const q = keyword.trim();
    router.push(q ? `/search?keyword=${encodeURIComponent(q)}` : "/search");
  }

  return (
    <div>
      <section className="border-b border-stone-200 bg-gradient-to-b from-amber-50 to-stone-50 py-16">
        <Container className="flex flex-col items-center gap-5 text-center">
          <p className="text-sm font-medium uppercase tracking-widest text-amber-700">
            Art &amp; Copyright Market
          </p>
          <h1 className="font-serif text-3xl font-bold text-stone-900 sm:text-4xl">
            ค้นพบและซื้อขายผลงานศิลปะ พร้อมโอนลิขสิทธิ์อย่างน่าเชื่อถือ
          </h1>
          <p className="max-w-2xl text-sm text-stone-600 sm:text-base">
            แพลตฟอร์มกลางเชื่อมโยงศิลปิน ผู้ซื้อ และผู้ดูแลระบบ
            เพื่อการซื้อขายชิ้นงานต้นฉบับและลิขสิทธิ์ผลงานศิลปะที่โปร่งใสและปลอดภัย
          </p>

          <form onSubmit={handleSearch} className="mt-2 flex w-full max-w-xl gap-2">
            <Input
              placeholder="ค้นหาชื่อผลงาน หรือชื่อศิลปิน"
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              aria-label="ค้นหาผลงานศิลปะ"
            />
            <Button type="submit" className="shrink-0">
              ค้นหา
            </Button>
          </form>

          <Link
            href="/search"
            className="text-sm font-medium text-stone-600 underline underline-offset-4 hover:text-stone-900"
          >
            หรือเลือกดูตามประเภท สไตล์ และช่วงราคา
          </Link>
        </Container>
      </section>

      <Container className="pb-12">
        <ArtSection
          title="งานมาใหม่ล่าสุด"
          description="ผลงานที่เพิ่งเผยแพร่เข้าสู่ระบบ"
          artworks={latest}
          viewAllHref="/search?sort=newest"
          emptyTitle="ยังไม่มีผลงานเผยแพร่ในระบบ"
        />

        <div className="border-t border-stone-200" />

        {hasRecommendations ? (
          <ArtSection
            title="แนะนำสำหรับคุณ"
            description="คัดจากประเภทและสไตล์ของงานที่คุณเคยสั่งซื้อหรือใส่ตะกร้าไว้"
            artworks={recommendedUnique}
            viewAllHref="/search"
            emptyTitle="ยังไม่มีผลงานให้แนะนำ"
          />
        ) : (
          <ArtSection
            title="เริ่มต้นสะสมงานศิลปะ"
            description="ผลงานราคาเข้าถึงง่ายสำหรับผู้เริ่มต้น"
            artworks={affordable}
            viewAllHref="/search?sort=price_asc"
            emptyTitle="ยังไม่มีผลงานในระบบ"
          />
        )}

        {!user && (
          <div className="rounded-xl border border-stone-200 bg-stone-50 p-5 text-center">
            <p className="text-sm text-stone-600">
              <Link href="/login" className="font-semibold text-stone-900 underline underline-offset-4">
                เข้าสู่ระบบ
              </Link>{" "}
              เพื่อให้ระบบแนะนำผลงานที่ตรงกับความสนใจของคุณ
            </p>
          </div>
        )}
      </Container>
    </div>
  );
}
