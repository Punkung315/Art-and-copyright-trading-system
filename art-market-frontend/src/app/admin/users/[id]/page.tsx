"use client";

import Link from "next/link";
import { use, useCallback, useEffect, useState } from "react";
import { RequireAdmin } from "@/components/RoleGuard";
import { useToast } from "@/context/ToastContext";
import { getUserDetail, verifySeller, AdminUserDetail, ApiError } from "@/lib/api";
import { Button, Card, Container, EmptyState, Spinner } from "@/components/ui";
import { StatusBadge } from "@/components/StatusBadge";
import { EvidenceThumb } from "@/components/ShippingEvidence";
import { formatBankAccountNumber } from "@/lib/banks";

/** แถวข้อมูลหนึ่งบรรทัด — ค่าว่างแสดง "—" เพื่อให้เห็นว่าไม่มีข้อมูล ไม่ใช่แสดงพลาด */
function Row({ label, value }: { label: string; value?: string | number | null }) {
  const empty = value === null || value === undefined || value === "";
  return (
    <div className="flex justify-between gap-4 border-b border-stone-100 py-2 last:border-0">
      <span className="text-sm text-stone-500">{label}</span>
      <span className={`text-sm ${empty ? "text-stone-400" : "font-medium text-stone-900"}`}>
        {empty ? "—" : value}
      </span>
    </div>
  );
}

function formatDate(iso?: string) {
  if (!iso) return undefined;
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? undefined : d.toLocaleString("th-TH");
}

function AdminUserDetailContent({ userId }: { userId: string }) {
  const { notify } = useToast();
  const [user, setUser] = useState<AdminUserDetail | null | undefined>(undefined);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setUser((await getUserDetail(userId)) ?? null);
  }, [userId]);

  useEffect(() => {
    load();
  }, [load]);

  async function handleVerify(approve: boolean) {
    setBusy(true);
    try {
      await verifySeller(userId, approve);
      await load();
      notify(approve ? "อนุมัติผู้ขายสำเร็จ" : "ปฏิเสธคำขอผู้ขายแล้ว", "success");
    } catch (err) {
      notify(
        err instanceof ApiError ? err.message : "ไม่สามารถแก้ไขสถานะได้ กรุณาลองใหม่อีกครั้ง",
        "error"
      );
    } finally {
      setBusy(false);
    }
  }

  if (user === undefined) return <Spinner />;
  if (user === null) {
    return (
      <Container className="py-16">
        <EmptyState title="ไม่พบข้อมูลผู้ใช้งาน" description="ผู้ใช้รายนี้อาจถูกลบไปแล้ว" />
        <div className="mt-6 text-center">
          <Link href="/admin/users" className="text-sm text-stone-600 underline">
            กลับไปรายการผู้ใช้งาน
          </Link>
        </div>
      </Container>
    );
  }

  const isSeller = user.roles.includes("seller");

  return (
    <Container className="py-10">
      <Link href="/admin/users" className="text-sm text-stone-500 hover:text-stone-900">
        ← กลับไปรายการผู้ใช้งาน
      </Link>

      <div className="mt-4 mb-6 flex items-center gap-4">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={user.profileImage}
          alt=""
          className="h-16 w-16 rounded-full object-cover"
        />
        <div>
          <h1 className="font-serif text-2xl font-bold text-stone-900">
            {user.fullName || user.username}
          </h1>
          <p className="text-sm text-stone-500">
            @{user.username} · รหัสผู้ใช้ #{user.id}
          </p>
        </div>
        <div className="ml-auto">
          <StatusBadge status={user.sellerStatus} domain="seller" />
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="p-5 lg:col-span-2">
          <h2 className="mb-3 font-serif text-base font-bold text-stone-900">ข้อมูลบัญชี</h2>
          {/*
            หน้านี้แสดงข้อมูลผู้ใช้ทุกอย่างยกเว้นรหัสผ่าน
            backend ไม่ส่ง password มาให้ตั้งแต่ต้นทาง (UserDetailResponse) —
            ต่อให้เผลอเรนเดอร์ที่นี่ก็ไม่มีค่าให้แสดง เป็นการกันสองชั้น
          */}
          <Row label="ชื่อผู้ใช้" value={user.username} />
          <Row label="ชื่อ-นามสกุล" value={user.fullName} />
          <Row label="อีเมล" value={user.email} />
          <Row label="เบอร์โทรศัพท์" value={user.phoneNumber} />
          <Row label="เลขบัตรประชาชน" value={user.nationalNo} />
          <Row label="บทบาท" value={user.roles.join(", ")} />
          <Row label="รหัสผู้ขาย" value={user.sellerId} />
          <Row label="รหัสผู้ซื้อ" value={user.buyerId} />
          <Row label="วันที่สมัครสมาชิก" value={formatDate(user.createdAt)} />

          {isSeller && (
            <>
              <h2 className="mt-6 mb-3 font-serif text-base font-bold text-stone-900">
                บัญชีธนาคารสำหรับรับเงิน
              </h2>
              {user.bankAccount ? (
                <div className="flex flex-wrap items-start gap-4">
                  <div className="min-w-[240px] flex-1">
                    <Row label="ธนาคาร" value={user.bankAccount.bankName} />
                    <Row
                      label="เลขบัญชี"
                      value={formatBankAccountNumber(user.bankAccount.accountNumber)}
                    />
                    <Row label="ชื่อบัญชี" value={user.bankAccount.accountName} />
                  </div>
                  {user.bankAccount.bankBookImage && (
                    <EvidenceThumb src={user.bankAccount.bankBookImage} alt="รูปหน้าสมุดบัญชี" />
                  )}
                </div>
              ) : (
                <p className="rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800">
                  ผู้ขายยังไม่ได้ตั้งบัญชีรับเงิน
                </p>
              )}
              {/* ชื่อบัญชีควรตรงกับชื่อผู้สมัคร ถ้าไม่ตรงควรสอบถามก่อนอนุมัติ */}
              {user.bankAccount &&
                user.fullName &&
                user.bankAccount.accountName.replace(/\s+/g, "") !==
                  user.fullName.replace(/\s+/g, "") && (
                  <p className="mt-2 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-800">
                    ชื่อบัญชีไม่ตรงกับชื่อ-นามสกุลของผู้ขาย — ตรวจสอบก่อนอนุมัติหรือโอนเงิน
                  </p>
                )}
            </>
          )}

          <h2 className="mt-6 mb-3 font-serif text-base font-bold text-stone-900">
            ที่อยู่ ({user.addresses.length})
          </h2>
          {user.addresses.length === 0 ? (
            <p className="text-sm text-stone-400">ยังไม่ได้บันทึกที่อยู่</p>
          ) : (
            <ul className="flex flex-col gap-2">
              {user.addresses.map((a) => (
                <li key={a.id} className="rounded-lg bg-stone-50 p-3 text-sm text-stone-700">
                  {a.houseNo} {a.villageNo ? `หมู่ ${a.villageNo}` : ""} {a.thoroughfare} ต.
                  {a.subDistrict} อ.{a.district} จ.{a.province} {a.postalCode}
                </li>
              ))}
            </ul>
          )}
        </Card>

        <div className="flex flex-col gap-6">
          <Card className="p-5">
            <h2 className="mb-3 font-serif text-base font-bold text-stone-900">สรุปกิจกรรม</h2>
            <Row label="คำสั่งซื้อ" value={user.orderCount} />
            <Row label="ผลงานที่ลงขาย" value={isSeller ? user.artworkCount : null} />
            <Row label="คำขอลิขสิทธิ์ที่ส่ง" value={user.copyrightSentCount} />
            <Row label="คำขอลิขสิทธิ์ที่ได้รับ" value={isSeller ? user.copyrightReceivedCount : null} />
          </Card>

          {user.sellerStatus === "pending" && (
            <Card className="p-5">
              <h2 className="mb-1 font-serif text-base font-bold text-stone-900">
                คำร้องขอเป็นผู้ขาย
              </h2>
              <p className="mb-4 text-sm text-stone-500">
                ตรวจสอบข้อมูลด้านซ้ายให้ครบก่อนตัดสินใจ
              </p>
              <div className="flex gap-2">
                <Button disabled={busy} onClick={() => handleVerify(true)} className="flex-1">
                  อนุมัติ
                </Button>
                <Button
                  variant="danger"
                  disabled={busy}
                  onClick={() => handleVerify(false)}
                  className="flex-1"
                >
                  ปฏิเสธ
                </Button>
              </div>
            </Card>
          )}
        </div>
      </div>
    </Container>
  );
}

export default function AdminUserDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  return (
    <RequireAdmin>
      <AdminUserDetailContent userId={id} />
    </RequireAdmin>
  );
}
