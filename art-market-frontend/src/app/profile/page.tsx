"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { RequireUser } from "@/components/RoleGuard";
import { useAuth } from "@/context/AuthContext";
import { Button, Card, Container } from "@/components/ui";
import { StatusBadge } from "@/components/StatusBadge";
import { listArtworksBySeller } from "@/lib/api";
import { Artwork } from "@/types";
import { ArtCard } from "@/components/ArtCard";

function ProfileContent() {
  const { user } = useAuth();
  const [artworks, setArtworks] = useState<Artwork[]>([]);

  useEffect(() => {
    if (user?.roles.includes("seller")) {
      listArtworksBySeller(user.id).then(setArtworks);
    }
  }, [user]);

  if (!user) return null;

  return (
    <Container className="py-10">
      <Card className="flex flex-col gap-6 p-6 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={user.profileImage} alt={user.username} className="h-20 w-20 rounded-full object-cover" />
          <div>
            <h1 className="font-serif text-xl font-bold text-stone-900">
              {user.fullName || user.username}
            </h1>
            <p className="text-sm text-stone-500">@{user.username}</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {user.roles.includes("seller") && <StatusBadge status={user.sellerStatus} domain="seller" />}
              {!user.roles.includes("seller") && <StatusBadge status="none" domain="seller" />}
            </div>
          </div>
        </div>
        <div className="flex gap-2">
          <Link href="/profile/edit">
            <Button variant="secondary">แก้ไขโปรไฟล์</Button>
          </Link>
          {!user.roles.includes("seller") && (
            <Link href="/register-seller">
              <Button variant="primary">สมัครเป็นผู้ขาย</Button>
            </Link>
          )}
        </div>
      </Card>

      <div className="mt-6 grid gap-4 sm:grid-cols-3">
        <Card className="p-4">
          <p className="text-xs text-stone-500">อีเมล</p>
          <p className="text-sm font-medium text-stone-800">{user.email}</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs text-stone-500">เบอร์โทรศัพท์</p>
          <p className="text-sm font-medium text-stone-800">{user.phoneNumber || "—"}</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs text-stone-500">สมาชิกตั้งแต่</p>
          <p className="text-sm font-medium text-stone-800">
            {new Date(user.createdAt).toLocaleDateString("th-TH")}
          </p>
        </Card>
      </div>

      {user.roles.includes("seller") && artworks.length > 0 && (
        <div className="mt-10">
          <h2 className="mb-4 font-serif text-lg font-bold text-stone-900">ผลงานศิลปะของฉัน</h2>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {artworks.map((a) => (
              <ArtCard key={a.id} artwork={a} />
            ))}
          </div>
        </div>
      )}
    </Container>
  );
}

export default function ProfilePage() {
  return (
    <RequireUser>
      <ProfileContent />
    </RequireUser>
  );
}
