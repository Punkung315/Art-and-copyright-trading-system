"use client";

import Link from "next/link";
import { useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { useCart } from "@/context/CartContext";
import { Container, Button } from "./ui";

function NavLink({ href, children }: { href: string; children: React.ReactNode }) {
  const pathname = usePathname();
  const active = pathname === href;
  return (
    <Link
      href={href}
      className={`rounded-md px-3 py-2 text-sm font-medium transition ${
        active ? "bg-stone-900 text-white" : "text-stone-600 hover:bg-stone-100"
      }`}
    >
      {children}
    </Link>
  );
}

export function Navbar() {
  const { user, admin, logout } = useAuth();
  const { count } = useCart();
  const router = useRouter();
  const [open, setOpen] = useState(false);

  const isSeller = !!user && user.roles.includes("seller") && user.sellerStatus === "approved";

  function handleLogout() {
    logout();
    router.push("/");
  }

  return (
    <header className="sticky top-0 z-40 border-b border-stone-200 bg-white/90 backdrop-blur">
      <Container className="flex h-16 items-center justify-between gap-4">
        <Link href="/" className="font-serif text-xl font-bold tracking-tight text-stone-900">
          Artmara<span className="text-amber-600">.</span>
        </Link>

        <nav className="hidden items-center gap-1 md:flex">
          <NavLink href="/">หน้าแรก</NavLink>
            <NavLink href="/search">ค้นหางานศิลปะ</NavLink>
          {user && <NavLink href="/orders">คำสั่งซื้อของฉัน</NavLink>}
          {user && <NavLink href="/copyright">การโอนลิขสิทธิ์</NavLink>}
          {isSeller && <NavLink href="/seller">พื้นที่ผู้ขาย</NavLink>}
          {admin && <NavLink href="/admin">ผู้ดูแลระบบ</NavLink>}
        </nav>

        <div className="flex items-center gap-2">
          {user && (
            <Link
              href="/cart"
              className="relative rounded-lg p-2 text-stone-700 hover:bg-stone-100"
              aria-label="ตะกร้าสินค้า"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                <circle cx="9" cy="21" r="1" /> <circle cx="20" cy="21" r="1" />
                <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" />
              </svg>
              {count > 0 && (
                <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-amber-600 px-1 text-[10px] font-bold text-white">
                  {count}
                </span>
              )}
            </Link>
          )}

          {user ? (
            <div className="hidden items-center gap-2 md:flex">
              <Link href="/profile" className="flex items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-stone-100">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={user.profileImage}
                  alt={user.username}
                  className="h-8 w-8 rounded-full object-cover"
                />
                <span className="text-sm font-medium text-stone-800">{user.username}</span>
              </Link>
              <Button variant="ghost" onClick={handleLogout}>
                ออกจากระบบ
              </Button>
            </div>
          ) : admin ? (
            <div className="hidden items-center gap-2 md:flex">
              <span className="text-sm font-medium text-stone-800">ผู้ดูแลระบบ: {admin.username}</span>
              <Button variant="ghost" onClick={handleLogout}>
                ออกจากระบบ
              </Button>
            </div>
          ) : (
            <div className="hidden items-center gap-2 md:flex">
              <Link href="/login">
                <Button variant="ghost">เข้าสู่ระบบ</Button>
              </Link>
              <Link href="/register">
                <Button variant="primary">สมัครสมาชิก</Button>
              </Link>
            </div>
          )}

          <button
            className="rounded-lg p-2 text-stone-700 hover:bg-stone-100 md:hidden"
            onClick={() => setOpen((o) => !o)}
            aria-label="เมนู"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
              <path d="M3 12h18M3 6h18M3 18h18" />
            </svg>
          </button>
        </div>
      </Container>

      {open && (
        <div className="border-t border-stone-200 bg-white md:hidden">
          <Container className="flex flex-col gap-1 py-3">
            <NavLink href="/">หน้าแรก</NavLink>
            <NavLink href="/search">ค้นหางานศิลปะ</NavLink>
            {user && <NavLink href="/orders">คำสั่งซื้อของฉัน</NavLink>}
            {user && <NavLink href="/copyright">การโอนลิขสิทธิ์</NavLink>}
            {isSeller && <NavLink href="/seller">พื้นที่ผู้ขาย</NavLink>}
            {admin && <NavLink href="/admin">ผู้ดูแลระบบ</NavLink>}
            {user && <NavLink href="/profile">โปรไฟล์ของฉัน</NavLink>}
            {(user || admin) && (
              <button
                onClick={handleLogout}
                className="rounded-md px-3 py-2 text-left text-sm font-medium text-rose-600 hover:bg-rose-50"
              >
                ออกจากระบบ
              </button>
            )}
            {!user && !admin && (
              <div className="flex gap-2 pt-2">
                <Link href="/login" className="flex-1">
                  <Button variant="secondary" className="w-full">เข้าสู่ระบบ</Button>
                </Link>
                <Link href="/register" className="flex-1">
                  <Button variant="primary" className="w-full">สมัครสมาชิก</Button>
                </Link>
              </div>
            )}
          </Container>
        </div>
      )}
    </header>
  );
}
