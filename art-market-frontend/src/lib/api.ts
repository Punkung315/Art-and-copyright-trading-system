"use client";

/**
 * Mock REST-style data layer.
 *
 * The SRS (section 2.3, General Constraints) specifies a Next.js frontend
 * talking to a Spring Boot backend over a RESTful API, backed by MySQL.
 * Every function below is written the way a real API client would look
 * (async, throws on business-rule failures) so that swapping the body of
 * each function for a `fetch(`${API_BASE}/...`)` call is a mechanical change
 * once the backend is available — nothing above this file needs to change.
 *
 * For now, everything is persisted to localStorage so the app is fully
 * demoable without a running backend.
 */

import {
  Admin,
  Artwork,
  CartItem,
  CopyrightTransfer,
  Order,
  OrderItem,
  Payment,
  User,
} from "@/types";
import { newId, readStorage, writeStorage } from "./storage";
import {
  SEED_ADMIN,
  SEED_ARTWORKS,
  SEED_COPYRIGHT_TRANSFERS,
  SEED_ORDERS,
  SEED_PAYMENTS,
  SEED_USERS,
} from "./seed";

export const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? "";

const KEYS = {
  users: "amk_users",
  admins: "amk_admins",
  artworks: "amk_artworks",
  carts: "amk_carts", // Record<buyerId, CartItem[]>
  orders: "amk_orders",
  payments: "amk_payments",
  copyright: "amk_copyright",
  seeded: "amk_seeded_v1",
} as const;

function delay<T>(value: T, ms = 250): Promise<T> {
  return new Promise((resolve) => setTimeout(() => resolve(value), ms));
}

export function ensureSeeded() {
  if (typeof window === "undefined") return;
  if (readStorage(KEYS.seeded, false)) return;
  writeStorage(KEYS.users, SEED_USERS);
  writeStorage(KEYS.admins, SEED_ADMIN);
  writeStorage(KEYS.artworks, SEED_ARTWORKS);
  writeStorage(KEYS.orders, SEED_ORDERS);
  writeStorage(KEYS.payments, SEED_PAYMENTS);
  writeStorage(KEYS.copyright, SEED_COPYRIGHT_TRANSFERS);
  writeStorage(KEYS.carts, {} as Record<string, CartItem[]>);
  writeStorage(KEYS.seeded, true);
}

function getUsers(): User[] {
  return readStorage<User[]>(KEYS.users, []);
}
function setUsers(v: User[]) {
  writeStorage(KEYS.users, v);
}
function getAdmins(): Admin[] {
  return readStorage<Admin[]>(KEYS.admins, []);
}
function getArtworks(): Artwork[] {
  return readStorage<Artwork[]>(KEYS.artworks, []);
}
function setArtworks(v: Artwork[]) {
  writeStorage(KEYS.artworks, v);
}
function getCarts(): Record<string, CartItem[]> {
  return readStorage<Record<string, CartItem[]>>(KEYS.carts, {});
}
function setCarts(v: Record<string, CartItem[]>) {
  writeStorage(KEYS.carts, v);
}
function getOrders(): Order[] {
  return readStorage<Order[]>(KEYS.orders, []);
}
function setOrders(v: Order[]) {
  writeStorage(KEYS.orders, v);
}
function getPayments(): Payment[] {
  return readStorage<Payment[]>(KEYS.payments, []);
}
function setPayments(v: Payment[]) {
  writeStorage(KEYS.payments, v);
}
function getTransfers(): CopyrightTransfer[] {
  return readStorage<CopyrightTransfer[]>(KEYS.copyright, []);
}
function setTransfers(v: CopyrightTransfer[]) {
  writeStorage(KEYS.copyright, v);
}

export class ApiError extends Error {}

/* ---------------------------- Auth / Users ---------------------------- */

export type SessionPrincipal =
  | { kind: "user"; user: User }
  | { kind: "admin"; admin: Admin };

export async function loginUser(
  usernameOrEmail: string,
  password: string
): Promise<SessionPrincipal> {
  ensureSeeded();
  const admins = getAdmins();
  const admin = admins.find(
    (a) => a.username === usernameOrEmail && a.password === password
  );
  if (admin) return delay({ kind: "admin", admin });

  const users = getUsers();
  const user = users.find(
    (u) =>
      (u.username === usernameOrEmail || u.email === usernameOrEmail) &&
      u.password === password
  );
  if (!user) throw new ApiError("ไม่พบข้อมูลผู้ใช้");
  return delay({ kind: "user", user });
}

export async function registerBuyer(input: {
  username: string;
  password: string;
  email: string;
}): Promise<User> {
  ensureSeeded();
  const users = getUsers();
  if (users.some((u) => u.username === input.username)) {
    throw new ApiError("ข้อมูลผู้ใช้ซ้ำ กรุณาลองใหม่อีกครั้ง");
  }
  if (users.some((u) => u.email === input.email)) {
    throw new ApiError("ข้อมูลผู้ใช้ซ้ำ กรุณาลองใหม่อีกครั้ง");
  }
  const user: User = {
    id: newId("user"),
    username: input.username,
    password: input.password,
    email: input.email,
    roles: ["buyer"],
    sellerStatus: "none",
    createdAt: new Date().toISOString(),
  };
  setUsers([...users, user]);
  return delay(user);
}

export async function registerSeller(
  userId: string,
  input: {
    fullName: string;
    phoneNumber: string;
    nationalNo: string;
    houseNo: string;
    villageNo?: string;
    thoroughfare?: string;
    subDistrict: string;
    district: string;
    province: string;
    postalCode: string;
  }
): Promise<User> {
  const users = getUsers();
  const idx = users.findIndex((u) => u.id === userId);
  if (idx === -1) throw new ApiError("ไม่พบข้อมูลผู้ใช้งาน");
  const updated: User = {
    ...users[idx],
    fullName: input.fullName,
    phoneNumber: input.phoneNumber,
    nationalNo: input.nationalNo,
    address: {
      id: newId("addr"),
      houseNo: input.houseNo,
      villageNo: input.villageNo,
      thoroughfare: input.thoroughfare,
      subDistrict: input.subDistrict,
      district: input.district,
      province: input.province,
      postalCode: input.postalCode,
    },
    roles: Array.from(new Set([...users[idx].roles, "seller"])) as User["roles"],
    sellerStatus: "pending",
  };
  users[idx] = updated;
  setUsers(users);
  return delay(updated);
}

export async function getUser(userId: string): Promise<User | undefined> {
  ensureSeeded();
  return delay(getUsers().find((u) => u.id === userId));
}

export async function updateProfile(
  userId: string,
  patch: Partial<Pick<User, "username" | "fullName" | "email" | "phoneNumber" | "profileImage">>
): Promise<User> {
  const users = getUsers();
  const idx = users.findIndex((u) => u.id === userId);
  if (idx === -1) throw new ApiError("ไม่พบข้อมูลผู้ใช้งาน");
  if (
    patch.username &&
    users.some((u) => u.username === patch.username && u.id !== userId)
  ) {
    throw new ApiError("ไม่สามารถแก้ไขได้ กรุณาลองอีกครั้ง");
  }
  users[idx] = { ...users[idx], ...patch };
  setUsers(users);
  return delay(users[idx]);
}

export async function listUsers(): Promise<User[]> {
  ensureSeeded();
  return delay(getUsers());
}

export async function verifySeller(
  userId: string,
  approve: boolean
): Promise<User> {
  const users = getUsers();
  const idx = users.findIndex((u) => u.id === userId);
  if (idx === -1) throw new ApiError("ไม่พบข้อมูลผู้ใช้งาน");
  users[idx] = {
    ...users[idx],
    sellerStatus: approve ? "approved" : "rejected",
  };
  setUsers(users);
  return delay(users[idx]);
}

/* ------------------------------ Artworks ------------------------------ */

export interface ArtworkSearchParams {
  q?: string;
  artworkType?: string;
}

export async function searchArtworks(
  params: ArtworkSearchParams = {}
): Promise<Artwork[]> {
  ensureSeeded();
  let list = getArtworks().filter((a) => a.artworkStatus === "published");
  if (params.q) {
    const q = params.q.trim().toLowerCase();
    list = list.filter(
      (a) =>
        a.artworkName.toLowerCase().includes(q) ||
        a.sellerName.toLowerCase().includes(q) ||
        a.artworkType.toLowerCase().includes(q)
    );
  }
  if (params.artworkType) {
    list = list.filter((a) => a.artworkType === params.artworkType);
  }
  return delay(list);
}

export async function getArtwork(id: string): Promise<Artwork | undefined> {
  ensureSeeded();
  return delay(getArtworks().find((a) => a.id === id));
}

export async function listArtworksBySeller(sellerId: string): Promise<Artwork[]> {
  ensureSeeded();
  return delay(getArtworks().filter((a) => a.sellerId === sellerId));
}

export async function addArtwork(
  sellerId: string,
  sellerName: string,
  input: Omit<
    Artwork,
    "id" | "sellerId" | "sellerName" | "publishDate" | "artworkStatus"
  >
): Promise<Artwork> {
  const artworks = getArtworks();
  const artwork: Artwork = {
    ...input,
    id: newId("art"),
    sellerId,
    sellerName,
    publishDate: new Date().toISOString(),
    artworkStatus: "draft",
  };
  setArtworks([...artworks, artwork]);
  return delay(artwork);
}

export async function updateArtwork(
  id: string,
  patch: Partial<Artwork>
): Promise<Artwork> {
  const artworks = getArtworks();
  const idx = artworks.findIndex((a) => a.id === id);
  if (idx === -1) throw new ApiError("ไม่พบข้อมูลงานศิลปะ");
  artworks[idx] = { ...artworks[idx], ...patch };
  setArtworks(artworks);
  return delay(artworks[idx]);
}

export async function publishArtwork(id: string): Promise<Artwork> {
  return updateArtwork(id, { artworkStatus: "published" });
}

/* -------------------------------- Cart -------------------------------- */

export async function listCart(buyerId: string): Promise<
  Array<CartItem & { artwork?: Artwork }>
> {
  ensureSeeded();
  const carts = getCarts();
  const items = carts[buyerId] ?? [];
  const artworks = getArtworks();
  return delay(
    items.map((item) => ({
      ...item,
      artwork: artworks.find((a) => a.id === item.artworkId),
    }))
  );
}

export async function addToCart(
  buyerId: string,
  artworkId: string
): Promise<CartItem[]> {
  const artworks = getArtworks();
  const artwork = artworks.find((a) => a.id === artworkId);
  if (!artwork) throw new ApiError("ไม่พบงานศิลปะ");
  const carts = getCarts();
  const items = carts[buyerId] ?? [];
  if (items.some((i) => i.artworkId === artworkId)) {
    throw new ApiError("งานศิลปะนี้อยู่ในตะกร้าอยู่แล้ว");
  }
  const newItem: CartItem = {
    id: newId("cart_item"),
    artworkId,
    addDate: new Date().toISOString(),
    priceAtAdd: artwork.price,
  };
  carts[buyerId] = [...items, newItem];
  setCarts(carts);
  return delay(carts[buyerId]);
}

export async function removeFromCart(
  buyerId: string,
  cartItemId: string
): Promise<CartItem[]> {
  const carts = getCarts();
  const items = carts[buyerId] ?? [];
  carts[buyerId] = items.filter((i) => i.id !== cartItemId);
  setCarts(carts);
  return delay(carts[buyerId]);
}

/* ------------------------------- Orders -------------------------------- */

const SHIPPING_COST = 150;

export async function confirmOrder(
  buyer: User
): Promise<Order[]> {
  const carts = getCarts();
  const items = carts[buyer.id] ?? [];
  if (items.length === 0) throw new ApiError("ไม่พบรายการสั่งซื้อ");
  const artworks = getArtworks();

  const bySeller = new Map<string, CartItem[]>();
  for (const item of items) {
    const artwork = artworks.find((a) => a.id === item.artworkId);
    if (!artwork) continue;
    const list = bySeller.get(artwork.sellerId) ?? [];
    list.push(item);
    bySeller.set(artwork.sellerId, list);
  }

  const orders = getOrders();
  const createdOrders: Order[] = [];
  for (const [sellerId, sellerItems] of bySeller.entries()) {
    const artwork = artworks.find((a) => a.id === sellerItems[0].artworkId);
    const orderItems: OrderItem[] = sellerItems.map((i) => {
      const art = artworks.find((a) => a.id === i.artworkId)!;
      return {
        id: newId("order_item"),
        artworkId: art.id,
        artworkName: art.artworkName,
        artworkImage: art.artworkImage,
        price: i.priceAtAdd,
      };
    });
    const totalAmount = orderItems.reduce((sum, i) => sum + i.price, 0);
    const order: Order = {
      id: newId("order"),
      buyerId: buyer.id,
      buyerName: buyer.fullName || buyer.username,
      sellerId,
      sellerName: artwork?.sellerName ?? "",
      items: orderItems,
      totalAmount,
      shippingCost: SHIPPING_COST,
      grandTotal: totalAmount + SHIPPING_COST,
      orderStatus: "pending_availability",
      availabilityStatus: "waiting",
      shippingStatus: "not_shipped",
      paymentStatus: "unpaid",
      orderDate: new Date().toISOString(),
      confirmDateTime: new Date().toISOString(),
    };
    createdOrders.push(order);
  }

  setOrders([...orders, ...createdOrders]);
  carts[buyer.id] = [];
  setCarts(carts);
  return delay(createdOrders);
}

export async function listOrdersByBuyer(buyerId: string): Promise<Order[]> {
  ensureSeeded();
  return delay(getOrders().filter((o) => o.buyerId === buyerId));
}

export async function listOrdersBySeller(sellerId: string): Promise<Order[]> {
  ensureSeeded();
  return delay(getOrders().filter((o) => o.sellerId === sellerId));
}

export async function getOrder(orderId: string): Promise<Order | undefined> {
  ensureSeeded();
  return delay(getOrders().find((o) => o.id === orderId));
}

export async function confirmAvailability(
  orderId: string,
  confirmed: boolean
): Promise<Order> {
  const orders = getOrders();
  const idx = orders.findIndex((o) => o.id === orderId);
  if (idx === -1) throw new ApiError("ไม่สามารถแก้ไขสถานะได้ กรุณาลองใหม่อีกครั้ง");
  orders[idx] = {
    ...orders[idx],
    availabilityStatus: confirmed ? "confirmed" : "rejected",
    orderStatus: confirmed ? "awaiting_payment" : "cancelled",
  };
  setOrders(orders);
  return delay(orders[idx]);
}

export async function updateShippingStatus(
  orderId: string,
  status: Order["shippingStatus"]
): Promise<Order> {
  const orders = getOrders();
  const idx = orders.findIndex((o) => o.id === orderId);
  if (idx === -1) throw new ApiError("ไม่สามารถแก้ไขสถานะได้ กรุณาลองใหม่อีกครั้ง");
  orders[idx] = {
    ...orders[idx],
    shippingStatus: status,
    orderStatus: status === "delivered" ? "delivered" : orders[idx].orderStatus,
  };
  setOrders(orders);
  return delay(orders[idx]);
}

export async function makePayment(
  orderId: string,
  slipTransfer: string
): Promise<Order> {
  const orders = getOrders();
  const idx = orders.findIndex((o) => o.id === orderId);
  if (idx === -1) throw new ApiError("ไม่พบคำสั่งซื้อ");
  const order = { ...orders[idx], slipTransfer, paymentStatus: "submitted" as const, orderStatus: "payment_review" as const };
  orders[idx] = order;
  setOrders(orders);

  const payments = getPayments();
  const payment: Payment = {
    id: newId("payment"),
    orderId: order.id,
    buyerId: order.buyerId,
    buyerName: order.buyerName,
    sellerId: order.sellerId,
    sellerName: order.sellerName,
    totalPrice: order.totalAmount,
    shippingCost: order.shippingCost,
    grandTotal: order.grandTotal,
    slipTransfer,
    status: "submitted",
    createdAt: new Date().toISOString(),
  };
  setPayments([...payments, payment]);
  return delay(order);
}

/* ------------------------------ Payments -------------------------------- */

export async function listPayments(): Promise<Payment[]> {
  ensureSeeded();
  return delay(getPayments());
}

export async function getPayment(id: string): Promise<Payment | undefined> {
  ensureSeeded();
  return delay(getPayments().find((p) => p.id === id));
}

export async function confirmPayment(
  paymentId: string,
  approve: boolean
): Promise<Payment> {
  const payments = getPayments();
  const idx = payments.findIndex((p) => p.id === paymentId);
  if (idx === -1) throw new ApiError("ไม่พบคำการโอนเงิน");
  payments[idx] = {
    ...payments[idx],
    status: approve ? "confirmed" : "rejected",
  };
  setPayments(payments);

  const orders = getOrders();
  const oIdx = orders.findIndex((o) => o.id === payments[idx].orderId);
  if (oIdx !== -1) {
    orders[oIdx] = {
      ...orders[oIdx],
      paymentStatus: approve ? "confirmed" : "rejected",
      orderStatus: approve ? "paid" : "awaiting_payment",
    };
    setOrders(orders);
  }
  return delay(payments[idx]);
}

/* --------------------------- Copyright Transfer -------------------------- */

export async function sendCopyrightTransfer(input: {
  artwork: Artwork;
  buyer: User;
  fullName: string;
  nationalNo: string;
  address: CopyrightTransfer["address"];
  agreement: string;
}): Promise<CopyrightTransfer> {
  const transfers = getTransfers();
  const transfer: CopyrightTransfer = {
    id: newId("copyright"),
    artworkId: input.artwork.id,
    artworkName: input.artwork.artworkName,
    artworkImage: input.artwork.artworkImage,
    buyerId: input.buyer.id,
    buyerName: input.buyer.fullName || input.buyer.username,
    sellerId: input.artwork.sellerId,
    sellerName: input.artwork.sellerName,
    price: input.artwork.copyrightPrice ?? input.artwork.price,
    fullName: input.fullName,
    nationalNo: input.nationalNo,
    address: input.address,
    agreement: input.agreement,
    transferStatus: "requested",
    transferDate: new Date().toISOString(),
  };
  setTransfers([...transfers, transfer]);
  return delay(transfer);
}

export async function listCopyrightTransfersByBuyer(
  buyerId: string
): Promise<CopyrightTransfer[]> {
  ensureSeeded();
  return delay(getTransfers().filter((t) => t.buyerId === buyerId));
}

export async function listCopyrightTransfersBySeller(
  sellerId: string
): Promise<CopyrightTransfer[]> {
  ensureSeeded();
  return delay(getTransfers().filter((t) => t.sellerId === sellerId));
}

export async function getCopyrightTransfer(
  id: string
): Promise<CopyrightTransfer | undefined> {
  ensureSeeded();
  return delay(getTransfers().find((t) => t.id === id));
}

export async function respondCopyrightTransfer(
  id: string,
  accept: boolean,
  responseDetail: string
): Promise<CopyrightTransfer> {
  const transfers = getTransfers();
  const idx = transfers.findIndex((t) => t.id === id);
  if (idx === -1) throw new ApiError("ไม่พบข้อมูลสัญญาการโอนลิขสิทธิ์");
  transfers[idx] = {
    ...transfers[idx],
    transferStatus: accept ? "accepted" : "rejected",
    responseDetail,
  };
  setTransfers(transfers);
  return delay(transfers[idx]);
}

export async function signCopyrightTransfer(
  id: string,
  documentFile: string
): Promise<CopyrightTransfer> {
  const transfers = getTransfers();
  const idx = transfers.findIndex((t) => t.id === id);
  if (idx === -1) throw new ApiError("ไม่สามารถค้นหาไฟล์เอกสารสัญญาการโอนได้");
  transfers[idx] = {
    ...transfers[idx],
    documentFile,
    transferStatus: "signed",
  };
  setTransfers(transfers);
  return delay(transfers[idx]);
}
