"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { Spinner } from "./ui";

export function RequireUser({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) router.replace("/login");
  }, [loading, user, router]);

  if (loading || !user) return <Spinner />;
  return <>{children}</>;
}

export function RequireSeller({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;
    if (!user) {
      router.replace("/login");
      return;
    }
    if (!user.roles.includes("seller")) {
      router.replace("/register-seller");
    }
  }, [loading, user, router]);

  if (loading || !user || !user.roles.includes("seller")) return <Spinner />;

  if (user.sellerStatus !== "approved") {
    return (
      <div className="mx-auto max-w-lg rounded-xl border border-amber-200 bg-amber-50 p-6 text-center">
        <p className="font-semibold text-amber-800">
          {user.sellerStatus === "pending"
            ? "บัญชีผู้ขายของคุณอยู่ระหว่างรอผู้ดูแลระบบตรวจสอบและอนุมัติ"
            : "คำขอสมัครเป็นผู้ขายของคุณไม่ได้รับการอนุมัติ"}
        </p>
      </div>
    );
  }

  return <>{children}</>;
}

export function RequireAdmin({ children }: { children: React.ReactNode }) {
  const { admin, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !admin) router.replace("/admin/login");
  }, [loading, admin, router]);

  if (loading || !admin) return <Spinner />;
  return <>{children}</>;
}
