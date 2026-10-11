"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { RequireSeller } from "@/components/RoleGuard";
import { useAuth } from "@/context/AuthContext";
import { listArtworksBySeller } from "@/lib/api";
import { Artwork } from "@/types";
import { Button, Card, Container, EmptyState, Select, Spinner } from "@/components/ui";
import { StatusBadge } from "@/components/StatusBadge";

function SellerArtListContent() {
  const { user } = useAuth();
  const [artworks, setArtworks] = useState<Artwork[] | null>(null);
  const [filter, setFilter] = useState("");

  useEffect(() => {
    if (user) listArtworksBySeller(user.id).then(setArtworks);
  }, [user]);

  const types = Array.from(new Set((artworks ?? []).map((a) => a.artworkType)));
  const filtered = filter ? (artworks ?? []).filter((a) => a.artworkType === filter) : artworks;

  return (
    <Container className="py-10">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-serif text-2xl font-bold text-stone-900">ผลงานศิลปะของฉัน</h1>
        <Link href="/seller/art/new">
          <Button>+ เพิ่มผลงานศิลปะ</Button>
        </Link>
      </div>

      {artworks && artworks.length > 0 && (
        <div className="mb-4 max-w-xs">
          <Select value={filter} onChange={(e) => setFilter(e.target.value)}>
            <option value="">ทุกประเภท</option>
            {types.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </Select>
        </div>
      )}

      {artworks === null ? (
        <Spinner />
      ) : (filtered ?? []).length === 0 ? (
        <EmptyState title="ยังไม่มีรายการงานศิลปะ" description="เริ่มเพิ่มผลงานศิลปะของคุณเข้าสู่ระบบ" />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered!.map((a) => (
            <Card key={a.id} className="overflow-hidden">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={a.artworkImage} alt={a.artworkName} className="h-48 w-full object-cover" />
              <div className="flex flex-col gap-2 p-4">
                <div className="flex items-center justify-between">
                  <p className="font-medium text-stone-900">{a.artworkName}</p>
                  <StatusBadge status={a.artworkStatus} domain="artwork" />
                </div>
                <p className="text-sm text-stone-500">{a.artworkType} · {a.price.toLocaleString()} บาท</p>
                <div className="mt-2 flex gap-2">
                  <Link href={`/seller/art/${a.id}/edit`} className="flex-1">
                    <Button variant="secondary" className="w-full">
                      แก้ไข
                    </Button>
                  </Link>
                  <Link href={`/seller/art/${a.id}/certificate`} className="flex-1">
                    <Button variant="ghost" className="w-full">
                      ใบรับรอง
                    </Button>
                  </Link>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </Container>
  );
}

export default function SellerArtListPage() {
  return (
    <RequireSeller>
      <SellerArtListContent />
    </RequireSeller>
  );
}
