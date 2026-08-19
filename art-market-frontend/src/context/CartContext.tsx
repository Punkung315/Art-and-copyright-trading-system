"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { useAuth } from "./AuthContext";
import { addToCart, listCart, removeFromCart } from "@/lib/api";
import { Artwork, CartItem } from "@/types";

type CartLine = CartItem & { artwork?: Artwork };

interface CartContextValue {
  items: CartLine[];
  count: number;
  total: number;
  refresh: () => Promise<void>;
  add: (artworkId: string) => Promise<void>;
  remove: (cartItemId: string) => Promise<void>;
}

const CartContext = createContext<CartContextValue | null>(null);

export function CartProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [items, setItems] = useState<CartLine[]>([]);

  const refresh = useCallback(async () => {
    if (!user) {
      setItems([]);
      return;
    }
    const cart = await listCart(user.id);
    setItems(cart);
  }, [user]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  async function add(artworkId: string) {
    if (!user) throw new Error("กรุณาเข้าสู่ระบบก่อนทำรายการ");
    await addToCart(user.id, artworkId);
    await refresh();
  }

  async function remove(cartItemId: string) {
    if (!user) return;
    await removeFromCart(user.id, cartItemId);
    await refresh();
  }

  const total = items.reduce((sum, i) => sum + i.priceAtAdd, 0);

  return (
    <CartContext.Provider value={{ items, count: items.length, total, refresh, add, remove }}>
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used within CartProvider");
  return ctx;
}
