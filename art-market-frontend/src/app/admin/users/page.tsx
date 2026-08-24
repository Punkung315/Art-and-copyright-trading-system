"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { RequireAdmin } from "@/components/RoleGuard";
import { listUsers } from "@/lib/api";
import { User } from "@/types";
import { Container, EmptyState, Input, Spinner } from "@/components/ui";
import { StatusBadge } from "@/components/StatusBadge";
import { SummaryTable } from "@/components/SummaryTable";
import { FilterChips } from "@/components/FilterChips";

type UserFilter = "all" | "pending" | "approved" | "none";

const FILTER_LABEL: Record<Exclude<UserFilter, "all">, string> = {
  pending: "ผู้ขาย — รออนุมัติ",
  approved: "ผู้ขาย — อนุมัติแล้ว",
  none: "ผู้ซื้อ (ไม่ได้สมัครขาย)",
};

function formatDate(iso?: string) {
  if (!iso) return "—";
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? "—" : d.toLocaleDateString("th-TH");
}

function AdminUsersContent() {
  const [users, setUsers] = useState<User[] | null>(null);
  const [filter, setFilter] = useState<UserFilter>("all");
  const [keyword, setKeyword] = useState("");

  useEffect(() => {
    listUsers().then(setUsers);
  }, []);

  const all = useMemo(() => users ?? [], [users]);

  /**
   * เรียงคำขอใหม่ล่าสุดไว้บนสุด
   * ใช้วันที่สมัครเป็นหลัก ถ้าเท่ากัน (ข้อมูล seed ใส่เวลาเดียวกันได้) ค่อยเทียบด้วย id
   */
  const sorted = useMemo(
    () =>
      [...all].sort((a, b) => {
        const diff = new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        return diff !== 0 ? diff : Number(b.id) - Number(a.id);
      }),
    [all]
  );

  const visible = useMemo(() => {
    const kw = keyword.trim().toLowerCase();
    return sorted.filter((u) => {
      if (filter !== "all" && u.sellerStatus !== filter) return false;
      if (!kw) return true;
      // ค้นหาจากทุกช่องที่แสดงในตาราง เพื่อไม่ให้ผู้ใช้ต้องเดาว่าค้นจากอะไรได้บ้าง
      return [u.fullName, u.username, u.email, u.phoneNumber]
        .filter(Boolean)
        .some((v) => v!.toLowerCase().includes(kw));
    });
  }, [sorted, filter, keyword]);

  // ตัวเลขในสรุปนับจากข้อมูลทั้งหมดเสมอ ไม่ใช่เฉพาะที่ผ่านตัวกรอง
  const counts = {
    pending: all.filter((u) => u.sellerStatus === "pending").length,
    approved: all.filter((u) => u.sellerStatus === "approved").length,
    none: all.filter((u) => u.sellerStatus === "none").length,
  };

  const summary = [
    { label: FILTER_LABEL.pending, count: counts.pending, highlight: true, filterValue: "pending" },
    { label: FILTER_LABEL.approved, count: counts.approved, filterValue: "approved" },
    { label: FILTER_LABEL.none, count: counts.none, filterValue: "none" },
  ];

  const chips = [
    { value: "all", label: "ทั้งหมด", count: all.length },
    { value: "pending", label: "รออนุมัติ", count: counts.pending },
    { value: "approved", label: "ผู้ขายที่อนุมัติแล้ว", count: counts.approved },
    { value: "none", label: "ผู้ซื้อ", count: counts.none },
  ];

  return (
    <Container className="py-10">
      <h1 className="mb-6 font-serif text-2xl font-bold text-stone-900">ผู้ใช้งานในระบบ</h1>

      {users === null ? (
        <Spinner />
      ) : all.length === 0 ? (
        <EmptyState title="ไม่พบข้อมูลผู้ใช้งาน" />
      ) : (
        <>
          <SummaryTable
            title="สรุปผู้ใช้งาน"
            rows={summary}
            totalLabel="ผู้ใช้งานทั้งหมด"
            activeFilter={filter}
            onFilterSelect={(v) => setFilter(v as UserFilter)}
          />

          <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <FilterChips
              options={chips}
              value={filter}
              onChange={(v) => setFilter(v as UserFilter)}
            />
            <div className="md:w-72">
              <Input
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
                placeholder="ค้นหาชื่อ, username, อีเมล, เบอร์โทร"
                aria-label="ค้นหาผู้ใช้งาน"
              />
            </div>
          </div>

          <p className="mb-2 text-sm text-stone-500">
            แสดง {visible.length} จาก {all.length} รายการ
            {filter !== "all" && ` · ${FILTER_LABEL[filter]}`}
            {keyword.trim() && ` · คำค้น "${keyword.trim()}"`}
          </p>

          {visible.length === 0 ? (
            <EmptyState
              title="ไม่พบผู้ใช้งานที่ตรงกับเงื่อนไข"
              description="ลองเปลี่ยนตัวกรองหรือลบคำค้นหา"
            />
          ) : (
            <div className="overflow-x-auto rounded-xl border border-stone-200 bg-white">
              <table className="w-full text-left text-sm">
                <thead className="bg-stone-50 text-stone-500">
                  <tr>
                    <th className="px-4 py-3">ผู้ใช้งาน</th>
                    <th className="px-4 py-3">อีเมล</th>
                    <th className="px-4 py-3">เบอร์โทรศัพท์</th>
                    <th className="px-4 py-3">บทบาท</th>
                    <th className="px-4 py-3">สถานะผู้ขาย</th>
                    <th className="px-4 py-3">วันที่สมัคร</th>
                    <th className="px-4 py-3" />
                  </tr>
                </thead>
                <tbody>
                  {visible.map((u) => (
                    <tr key={u.id} className="border-t border-stone-100 hover:bg-stone-50">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={u.profileImage}
                            alt=""
                            className="h-8 w-8 rounded-full object-cover"
                          />
                          <div>
                            <p className="font-medium text-stone-900">
                              {u.fullName || u.username}
                            </p>
                            <p className="text-xs text-stone-400">@{u.username}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-stone-600">{u.email}</td>
                      <td className="px-4 py-3 text-stone-600">{u.phoneNumber || "—"}</td>
                      <td className="px-4 py-3 text-stone-600">{u.roles.join(", ")}</td>
                      <td className="px-4 py-3">
                        {u.roles.includes("seller") ? (
                          <StatusBadge status={u.sellerStatus} domain="seller" />
                        ) : (
                          "—"
                        )}
                      </td>
                      <td className="px-4 py-3 text-stone-600">{formatDate(u.createdAt)}</td>
                      <td className="px-4 py-3 text-right">
                        <Link
                          href={`/admin/users/${u.id}`}
                          className="text-sm font-medium text-stone-700 underline hover:text-stone-900"
                        >
                          ดูข้อมูล
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
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
