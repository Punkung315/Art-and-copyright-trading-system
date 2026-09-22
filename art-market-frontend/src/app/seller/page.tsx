"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { RequireSeller } from "@/components/RoleGuard";
import { useAuth } from "@/context/AuthContext";
import {
  getMyBankAccount,
  listArtworksBySeller,
  listOrdersBySeller,
  listCopyrightTransfersBySeller,
} from "@/lib/api";
import { Card, Container } from "@/components/ui";

function SellerDashboardContent() {
  const { user } = useAuth();
  const [artworkCount, setArtworkCount] = useState(0);
  const [orderCount, setOrderCount] = useState(0);
  const [pendingOrders, setPendingOrders] = useState(0);
  const [copyrightCount, setCopyrightCount] = useState(0);
  /** null = ยังไม่รู้ / false = ยังไม่ได้ตั้งบัญชีรับเงิน */
  const [hasBank, setHasBank] = useState<boolean | null>(null);

  useEffect(() => {
    if (!user) return;
    listArtworksBySeller(user.id).then((list) => setArtworkCount(list.length));
    listOrdersBySeller(user.id).then((list) => {
      setOrderCount(list.length);
      setPendingOrders(list.filter((o) => o.availabilityStatus === "waiting").length);
    });
    getMyBankAccount()
      .then((b) => setHasBank(!!b))
      .catch(() => setHasBank(null));
    listCopyrightTransfersBySeller(user.id).then((list) =>
      setCopyrightCount(list.filter((t) => t.transferStatus === "requested").length)
    );
  }, [user]);

  const tiles = [
    { label: "ผลงานศิลปะทั้งหมด", value: artworkCount, href: "/seller/art" },
    { label: "คำสั่งซื้อทั้งหมด", value: orderCount, href: "/seller/orders" },
    { label: "รอยืนยันความพร้อม", value: pendingOrders, href: "/seller/orders" },
    { label: "คำขอโอนลิขสิทธิ์รอตอบ", value: copyrightCount, href: "/seller/copyright" },
  ];

  return (
    <Container className="py-10">
      <h1 className="mb-1 font-serif text-2xl font-bold text-stone-900">พื้นที่ผู้ขาย</h1>
      <p className="mb-6 text-sm text-stone-500">ยินดีต้อนรับ, {user?.fullName || user?.username}</p>

      {/* ผู้ขายที่สมัครก่อนมีช่องบัญชีธนาคารยังไม่มีบัญชี — เผยแพร่ผลงานและรับเงินไม่ได้จนกว่าจะตั้ง */}
      {hasBank === false && (
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4">
          <p className="text-sm text-amber-900">
            คุณยังไม่ได้ตั้งบัญชีธนาคารสำหรับรับเงิน — ต้องตั้งก่อนจึงจะเผยแพร่ผลงานและรับเงินค่าผลงานได้
          </p>
          <Link
            href="/profile/bank-account"
            className="rounded-lg bg-stone-900 px-4 py-2 text-sm font-semibold text-white hover:bg-stone-700"
          >
            ตั้งบัญชีรับเงิน
          </Link>
        </div>
      )}

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {tiles.map((tile) => (
          <Link key={tile.label} href={tile.href}>
            <Card className="p-5 transition hover:shadow-md">
              <p className="text-3xl font-bold text-stone-900">{tile.value}</p>
              <p className="mt-1 text-sm text-stone-500">{tile.label}</p>
            </Card>
          </Link>
        ))}
      </div>

      <div className="mt-8 flex flex-wrap gap-3">
        <Link href="/seller/art/new">
          <Card className="px-5 py-3 text-sm font-semibold text-stone-800 transition hover:shadow-md">
            + เพิ่มผลงานศิลปะใหม่
          </Card>
        </Link>
        <Link href="/seller/orders">
          <Card className="px-5 py-3 text-sm font-semibold text-stone-800 transition hover:shadow-md">
            จัดการคำสั่งซื้อ
          </Card>
        </Link>
        <Link href="/seller/copyright">
          <Card className="px-5 py-3 text-sm font-semibold text-stone-800 transition hover:shadow-md">
            คำขอโอนลิขสิทธิ์
          </Card>
        </Link>
      </div>
    </Container>
  );
}

export default function SellerDashboardPage() {
  return (
    <RequireSeller>
      <SellerDashboardContent />
    </RequireSeller>
  );
}
