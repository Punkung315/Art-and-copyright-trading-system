"use client";

import { useEffect, useState } from "react";
import { RequireAdmin } from "@/components/RoleGuard";
import { useToast } from "@/context/ToastContext";
import { listUsers, verifySeller, ApiError } from "@/lib/api";
import { User } from "@/types";
import { Button, Container, EmptyState, Spinner } from "@/components/ui";
import { StatusBadge } from "@/components/StatusBadge";

function AdminUsersContent() {
  const { notify } = useToast();
  const [users, setUsers] = useState<User[] | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  async function load() {
    setUsers(await listUsers());
  }

  useEffect(() => {
    load();
  }, []);

  async function handleVerify(userId: string, approve: boolean) {
    setBusyId(userId);
    try {
      await verifySeller(userId, approve);
      await load();
      notify(approve ? "อนุมัติผู้ขายสำเร็จ" : "ปฏิเสธคำขอผู้ขายแล้ว", "success");
    } catch (err) {
      notify(err instanceof ApiError ? err.message : "ไม่สามารถแก้ไขสถานะได้ กรุณาลองใหม่อีกครั้ง", "error");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <Container className="py-10">
      <h1 className="mb-6 font-serif text-2xl font-bold text-stone-900">ผู้ใช้งานในระบบ</h1>

      {users === null ? (
        <Spinner />
      ) : users.length === 0 ? (
        <EmptyState title="ไม่พบข้อมูลผู้ใช้งาน" />
      ) : (
        <div className="overflow-hidden rounded-xl border border-stone-200 bg-white">
          <table className="w-full text-left text-sm">
            <thead className="bg-stone-50 text-stone-500">
              <tr>
                <th className="px-4 py-3">ผู้ใช้งาน</th>
                <th className="px-4 py-3">อีเมล</th>
                <th className="px-4 py-3">เบอร์โทรศัพท์</th>
                <th className="px-4 py-3">บทบาท</th>
                <th className="px-4 py-3">สถานะผู้ขาย</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id} className="border-t border-stone-100">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={u.profileImage} alt="" className="h-8 w-8 rounded-full object-cover" />
                      <div>
                        <p className="font-medium text-stone-900">{u.fullName || u.username}</p>
                        <p className="text-xs text-stone-400">@{u.username}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-stone-600">{u.email}</td>
                  <td className="px-4 py-3 text-stone-600">{u.phoneNumber || "—"}</td>
                  <td className="px-4 py-3 text-stone-600">{u.roles.join(", ")}</td>
                  <td className="px-4 py-3">
                    {u.roles.includes("seller") ? <StatusBadge status={u.sellerStatus} domain="seller" /> : "—"}
                  </td>
                  <td className="px-4 py-3">
                    {u.sellerStatus === "pending" && (
                      <div className="flex gap-2">
                        <Button
                          disabled={busyId === u.id}
                          onClick={() => handleVerify(u.id, true)}
                        >
                          อนุมัติ
                        </Button>
                        <Button
                          variant="danger"
                          disabled={busyId === u.id}
                          onClick={() => handleVerify(u.id, false)}
                        >
                          ปฏิเสธ
                        </Button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Container>
  );
}

export default function AdminUsersPage() {
  return (
    <RequireAdmin>
      <AdminUsersContent />
    </RequireAdmin>
  );
}
