"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { Admin, User } from "@/types";
import { ensureSeeded, getUser, loginUser, registerBuyer } from "@/lib/api";
import { readStorage, writeStorage } from "@/lib/storage";

interface Session {
  kind: "user" | "admin";
  id: string;
}

interface AuthContextValue {
  user: User | null;
  admin: Admin | null;
  loading: boolean;
  login: (usernameOrEmail: string, password: string) => Promise<void>;
  register: (input: { username: string; password: string; email: string }) => Promise<void>;
  logout: () => void;
  refresh: () => Promise<void>;
  setUser: (u: User) => void;
}

const SESSION_KEY = "amk_session";

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUserState] = useState<User | null>(null);
  const [admin, setAdmin] = useState<Admin | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    ensureSeeded();
    const session = readStorage<Session | null>(SESSION_KEY, null);
    (async () => {
      if (session?.kind === "user") {
        const u = await getUser(session.id);
        if (u) setUserState(u);
      } else if (session?.kind === "admin") {
        const admins = readStorage<Admin[]>("amk_admins", []);
        const a = admins.find((x) => x.id === session.id);
        if (a) setAdmin(a);
      }
      setLoading(false);
    })();
  }, []);

  async function login(usernameOrEmail: string, password: string) {
    const result = await loginUser(usernameOrEmail, password);
    if (result.kind === "user") {
      setUserState(result.user);
      setAdmin(null);
      writeStorage(SESSION_KEY, { kind: "user", id: result.user.id });
    } else {
      setAdmin(result.admin);
      setUserState(null);
      writeStorage(SESSION_KEY, { kind: "admin", id: result.admin.id });
    }
  }

  async function register(input: { username: string; password: string; email: string }) {
    const u = await registerBuyer(input);
    setUserState(u);
    setAdmin(null);
    writeStorage(SESSION_KEY, { kind: "user", id: u.id });
  }

  function logout() {
    setUserState(null);
    setAdmin(null);
    writeStorage(SESSION_KEY, null);
  }

  async function refresh() {
    if (!user) return;
    const u = await getUser(user.id);
    if (u) setUserState(u);
  }

  return (
    <AuthContext.Provider
      value={{ user, admin, loading, login, register, logout, refresh, setUser: setUserState }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
