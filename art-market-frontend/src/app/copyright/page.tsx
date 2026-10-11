"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { RequireUser } from "@/components/RoleGuard";
import { useAuth } from "@/context/AuthContext";
import { listCopyrightTransfersByBuyer } from "@/lib/api";
import { CopyrightTransfer } from "@/types";
import { Card, Container, EmptyState, Spinner } from "@/components/ui";
import { StatusBadge } from "@/components/StatusBadge";

function CopyrightListContent() {
  const { user } = useAuth();
  const [transfers, setTransfers] = useState<CopyrightTransfer[] | null>(null);

  useEffect(() => {
    if (user) listCopyrightTransfersByBuyer(user.id).then(setTransfers);
  }, [user]);

  return (
    <Container className="py-10">
      <h1 className="mb-1 font-serif text-2xl font-bold text-stone-900">การโอนลิขสิทธิ์ผลงานศิลปะ</h1>
      <p className="mb-6 text-sm text-stone-500">รายการสัญญาการโอนลิขสิทธิ์ที่คุณเสนอในฐานะผู้ซื้อ</p>

      {transfers === null ? (
        <Spinner />
      ) : transfers.length === 0 ? (
        <EmptyState
          title="ยังไม่มีคำขอโอนลิขสิทธิ์"
          description="เลือกงานศิลปะที่รองรับการซื้อลิขสิทธิ์เพื่อส่งคำขอ"
        />
      ) : (
        <div className="flex flex-col gap-3">
          {[...transfers].reverse().map((t) => (
            <Link key={t.id} href={`/copyright/${t.id}`}>
              <Card className="flex items-center gap-4 p-4 transition hover:shadow-md">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={t.artworkImage} alt={t.artworkName} className="h-16 w-16 rounded-lg object-cover" />
                <div className="flex-1">
                  <p className="text-sm font-semibold text-stone-900">{t.artworkName}</p>
                  <p className="text-xs text-stone-500">ผู้ขาย: {t.sellerName}</p>
                </div>
                <div className="text-right">
                  <p className="mb-1 text-sm font-semibold text-stone-900">{t.price.toLocaleString()} บาท</p>
                  <StatusBadge status={t.transferStatus} domain="transfer" />
                </div>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </Container>
  );
}

export default function CopyrightListPage() {
  return (
    <RequireUser>
      <CopyrightListContent />
    </RequireUser>
  );
}
