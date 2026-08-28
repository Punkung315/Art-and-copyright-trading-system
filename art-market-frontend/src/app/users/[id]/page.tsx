"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import { getPublicProfile } from "@/lib/api";
import { Artwork, User } from "@/types";
import { Card, Container, EmptyState, Spinner } from "@/components/ui";
import { StatusBadge } from "@/components/StatusBadge";
import { ArtCard } from "@/components/ArtCard";

/**
 * โปรไฟล์สาธารณะของผู้ใช้ (ยูสเคส 3.1.6 View Profile)
 *
 * เปิดดูได้โดยไม่ต้อง login ตาม Pre Condition ของยูสเคส
 * backend ซ่อนอีเมล/เบอร์โทรของคนอื่นให้อยู่แล้ว หน้านี้จึงแสดงเท่าที่ได้รับมาได้เลย
 */
export default function PublicProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [data, setData] = useState<{ user: User; artworks: Artwork[] } | null | undefined>(
    undefined
  );

  useEffect(() => {
    getPublicProfile(id).then((d) => setData(d ?? null));
  }, [id]);

  if (data === undefined) return <Spinner />;
  if (data === null) {
    return (
      <Container className="py-16 text-center">
        <p className="text-stone-600">ไม่พบข้อมูลผู้ใช้งาน</p>
        <Link href="/search" className="mt-4 inline-block text-amber-700 underline">
          กลับไปหน้าค้นหางานศิลปะ
        </Link>
      </Container>
    );
  }

  const { user, artworks } = data;
  const isSeller = user.roles.includes("seller");

  return (
    <Container className="py-10">
      <Card className="flex flex-wrap items-center gap-5 p-6">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={user.profileImage}
          alt={user.fullName || user.username}
          className="h-20 w-20 rounded-full object-cover"
        />
        <div className="flex-1">
          <h1 className="font-serif text-2xl font-bold text-stone-900">
            {user.fullName || user.username}
          </h1>
          <p className="text-sm text-stone-500">@{user.username}</p>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            {isSeller ? (
              <StatusBadge status={user.sellerStatus} domain="seller" />
            ) : (
              <span className="text-sm text-stone-500">ผู้ซื้อ</span>
            )}
            {isSeller && (
              <span className="text-sm text-stone-500">· ผลงานที่เผยแพร่ {artworks.length} ชิ้น</span>
            )}
          </div>
        </div>
      </Card>

      {isSeller && (
        <div className="mt-10">
          <h2 className="mb-4 font-serif text-lg font-bold text-stone-900">ผลงานของศิลปิน</h2>
          {artworks.length === 0 ? (
            <EmptyState title="ศิลปินยังไม่มีผลงานที่เผยแพร่" />
          ) : (
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
              {artworks.map((a) => (
                <ArtCard key={a.id} artwork={a} />
              ))}
            </div>
          )}
        </div>
      )}
    </Container>
  );
}
