"use client";

/**
 * REST client จริงที่คุยกับ Spring Boot backend (com.maejo.artmarket)
 *
 * ไฟล์นี้เคยเป็น mock ที่เก็บข้อมูลลง localStorage ทั้งหมด ตอนนี้เปลี่ยนเป็นการเรียก
 * REST API จริงแล้ว โดย "คงลายเซ็นของทุกฟังก์ชันไว้เหมือนเดิม" และคง type ใน
 * src/types/index.ts ไว้ทั้งหมด — เพจทุกหน้าจึงไม่ต้องแก้แม้แต่บรรทัดเดียว
 *
 * หน้าที่หลักของไฟล์นี้คือเป็น "ตัวแปลง" ระหว่างสองฝั่ง เพราะ backend กับ frontend
 * ใช้คำศัพท์คนละชุดกัน:
 *
 *   1. id        backend เป็น Integer / frontend เป็น string
 *   2. enum      backend เป็น UPPER_SNAKE (AVAILABLE, PENDING_CONFIRMATION)
 *                frontend เป็น lower_snake (confirmed, waiting)
 *   3. สถานะ order  backend เก็บ availability/shipping ไว้ที่ "รายชิ้น" (OrderItem)
 *                frontend มองเป็นสถานะระดับ "ทั้งคำสั่งซื้อ" → รวมยอดให้ที่นี่
 *   4. envelope  ทุก endpoint ห่อด้วย { success, message, data }
 *                และคืน HTTP 200 แม้ตอน business error → ต้องเช็ค success เอง
 *
 * ตั้งค่า URL ของ backend ที่ NEXT_PUBLIC_API_BASE_URL (ดู .env.example)
 */

import {
  Address,
  Admin,
  Artwork,
  ArtworkStatus,
  AvailabilityStatus,
  CartItem,
  CopyrightTransfer,
  Order,
  OrderItem,
  OrderStatus,
  Payment,
  PaymentStatus,
  ShippingStatus,
  TransferStatus,
  User,
} from "@/types";
import { artworkPlaceholder, avatarPlaceholder } from "./placeholder";

export const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE_URL?.replace(/\/+$/, "") ||
  "http://localhost:8080/api";

const TOKEN_KEY = "amk_token";

export class ApiError extends Error {}

/* ------------------------------ token store ------------------------------ */

export function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string | null) {
  if (typeof window === "undefined") return;
  if (token) window.localStorage.setItem(TOKEN_KEY, token);
  else window.localStorage.removeItem(TOKEN_KEY);
}

/** เดิม seed ข้อมูลลง localStorage — ตอนนี้ backend เป็นเจ้าของข้อมูลแล้ว จึงไม่ต้องทำอะไร */
export function ensureSeeded() {
  /* no-op */
}

/* ------------------------------ http helper ------------------------------ */

interface Envelope<T> {
  success: boolean;
  message: string;
  data: T;
}

async function request<T>(
  path: string,
  init: RequestInit & { auth?: boolean } = {}
): Promise<T> {
  const { auth = true, headers, ...rest } = init;

  const finalHeaders: Record<string, string> = {
    "Content-Type": "application/json",
    ...((headers as Record<string, string>) ?? {}),
  };

  const token = auth ? getToken() : null;
  if (token) finalHeaders.Authorization = `Bearer ${token}`;

  let res: Response;
  try {
    res = await fetch(`${API_BASE}${path}`, { ...rest, headers: finalHeaders });
  } catch {
    // fetch จะ throw TypeError เมื่อ backend ไม่ได้เปิด หรือโดน CORS บล็อก
    throw new ApiError(
      "ไม่สามารถเชื่อมต่อกับเซิร์ฟเวอร์ได้ กรุณาตรวจสอบว่า backend ทำงานอยู่"
    );
  }

  if (res.status === 401) throw new ApiError("กรุณาเข้าสู่ระบบใหม่อีกครั้ง");
  if (res.status === 403) throw new ApiError("ไม่มีสิทธิ์เข้าถึงข้อมูลนี้");

  // 204 No Content
  if (res.status === 204) return undefined as T;

  let body: Envelope<T> | null = null;
  const text = await res.text();
  if (text) {
    try {
      body = JSON.parse(text) as Envelope<T>;
    } catch {
      // health check คืน plain text ไม่ใช่ JSON
      return text as unknown as T;
    }
  }

  if (!body) throw new ApiError("เซิร์ฟเวอร์ไม่ได้ส่งข้อมูลกลับมา");

  // backend คืน HTTP 200 พร้อม success=false เวลาเกิด business error
  if (!body.success) throw new ApiError(body.message || "เกิดข้อผิดพลาด");

  return body.data;
}

/**
 * เหมือน request() แต่แปลง "ไม่พบข้อมูล" ให้เป็นค่า fallback แทนการ throw
 *
 * จำเป็นเพราะ endpoint ฝั่ง list บางตัวยังคืน success=false เมื่อไม่มีข้อมูล
 * ซึ่งสำหรับ UI แล้ว "ไม่มีข้อมูล" คือหน้าว่าง ไม่ใช่ error ที่ต้องเด้ง toast
 */
async function requestOr<T>(
  path: string,
  fallback: T,
  init: RequestInit & { auth?: boolean } = {}
): Promise<T> {
  try {
    const data = await request<T>(path, init);
    return data ?? fallback;
  } catch (e) {
    if (e instanceof ApiError && /ไม่พบ|ยังไม่มี|ไม่มีรายการ/.test(e.message)) {
      return fallback;
    }
    throw e;
  }
}

function qs(params: Record<string, string | number | undefined>): string {
  const sp = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== null && `${v}` !== "") sp.set(k, `${v}`);
  }
  const s = sp.toString();
  return s ? `?${s}` : "";
}

/* ------------------------- backend payload shapes ------------------------- */

type BeRole = "BUYER" | "SELLER";

interface BeAuth {
  token: string;
  userId: number;
  username: string;
  email: string | null;
  role: BeRole | null;
  roleName: "BUYER" | "SELLER" | "ADMIN";
  fullName: string | null;
  profileImage: string | null;
  sellerVerified: boolean;
}

interface BeAddress {
  addressId: number;
  houseNo?: string;
  villageNo?: string;
  thoroughfare?: string;
  subdistrict: string;
  district: string;
  province: string;
  postalCode: string;
}

interface BeProfile {
  userId: number;
  username: string;
  fullName: string | null;
  email: string | null;
  phoneNumber: string | null;
  nationalNo: string | null;
  profileImage: string | null;
  role: BeRole;
  sellerStatus: "none" | "pending" | "approved";
  sellerId: number | null;
  addresses: BeAddress[] | null;
  artworks: BeArtworkSummary[] | null;
}

interface BeArtworkSummary {
  artworkId: number;
  artworkName: string;
  artworkImage: string | null;
  artworkType: string | null;
  artworkStyle: string | null;
  price: number;
  artworkStatus: "AVAILABLE" | "RESERVED" | "SOLD";
  publishStatus: "DRAFT" | "PUBLISHED";
  sellerId: number;
  sellerName: string | null;
  /** users.user_id ของผู้ขาย — ต่างจาก sellerId ซึ่งเป็น PK ของตาราง seller */
  sellerUserId: number | null;
}

interface BeArtworkDetail extends BeArtworkSummary {
  artworkMediums: string | null;
  artworkMaterial: string | null;
  artworkSize: number | null;
  description: string | null;
  copyrightPrice: number | null;
  shippingCost: number | null;
  weight: number | null;
  width: number | null;
  length: number | null;
  height: number | null;
  publishDate: string;
  sellerProfileImage: string | null;
}

interface BeOrderItem {
  orderItemId: number;
  artworkId: number;
  artworkName: string;
  artworkImage: string | null;
  price: number;
  availabilityStatus: "PENDING_CONFIRMATION" | "AVAILABLE" | "UNAVAILABLE";
  shippingStatus: "PREPARING" | "SHIPPED" | "DELIVERED" | null;
}

interface BeOrder {
  orderId: number;
  orderStatus: "PENDING" | "CONFIRMED" | "COMPLETED" | "CANCELLED";
  orderDate: string;
  confirmDateTime: string | null;
  totalAmount: number;
  shippingCost: number;
  grandTotal: number;
  buyerId: number;
  buyerName: string | null;
  buyerUserId: number | null;
  sellerId: number | null;
  sellerName: string | null;
  sellerUserId: number | null;
  paymentId: number | null;
  paymentStatus: BePaymentStatus | null;
  slipTransfer: string | null;
  items: BeOrderItem[];
}

interface BeSellerOrder {
  orderId: number;
  orderDate: string;
  orderStatus: BeOrder["orderStatus"];
  totalAmount: number;
  buyerId: number;
  buyerName: string | null;
  buyerUserId: number | null;
  paymentStatus: BePaymentStatus | null;
  items: BeOrderItem[];
}

type BePaymentStatus =
  | "AWAITING_PROOF"
  | "PENDING_CONFIRMATION"
  | "COMPLETED"
  | "REJECTED";

interface BePayment {
  paymentId: number;
  orderId: number;
  buyerId: number;
  buyerName: string | null;
  buyerUserId: number | null;
  sellerName: string | null;
  sellerId: number | null;
  sellerUserId: number | null;
  buyerEmail?: string | null;
  buyerPhone?: string | null;
  totalPrice?: number | null;
  grandTotal: number;
  shippingCost: number;
  slipTransfer?: string | null;
  transferStatus: BePaymentStatus;
  orderDate?: string | null;
  confirmDateTime?: string | null;
  orderStatus?: "PENDING" | "CONFIRMED" | "COMPLETED" | "CANCELLED" | null;
  itemCount?: number | null;
  artworks?: BeArtworkSummary[];
  items?: BePaymentItemLine[];
}

interface BePaymentItemLine {
  orderItemId: number;
  artworkId: number;
  artworkName: string;
  price: number | null;
  availabilityStatus: BeOrderItem["availabilityStatus"] | null;
  shippingStatus: BeOrderItem["shippingStatus"];
}

interface BeCartItem {
  cartItemId: number;
  artworkId: number;
  artworkName: string;
  artworkImage: string | null;
  addDate: string;
  priceAtAdd: number;
  artwork: BeArtworkSummary | null;
}

interface BeTransfer {
  copyrightId: number;
  /** งานศิลปะที่ขอโอนลิขสิทธิ์ — ตัวอ้างอิงหลักของสัญญา */
  artworkId: number | null;
  artworkName: string | null;
  /** null ได้ ถ้าผู้ซื้อขอเฉพาะลิขสิทธิ์โดยไม่ได้ซื้อชิ้นงานต้นฉบับ */
  orderId: number | null;
  buyerId: number;
  sellerId: number;
  buyerUserId: number | null;
  sellerUserId: number | null;
  buyerName: string | null;
  sellerName: string | null;
  fullName: string;
  houseNo?: string;
  villageNo?: string;
  thoroughfare?: string;
  subdistrict: string;
  district: string;
  province: string;
  postalCode: string;
  nationalNo: string;
  transferStatus: "PENDING" | "SIGNED" | "COMPLETED" | "REJECTED";
  transferDate: string;
  /** ข้อตกลงที่ผู้ซื้อระบุตอนยื่นคำขอ */
  agreement: string | null;
  /** คำตอบ/เหตุผลของผู้ขาย — null จนกว่าผู้ขายจะตอบ */
  sellerResponseDetail: string | null;
  documentFile: string | null;
  copyrightPrice: number | null;
  artworks: BeArtworkSummary[] | null;
}

interface BeUserSummary {
  userId: number;
  username: string;
  email: string | null;
  fullName: string | null;
  phoneNumber: string | null;
  role: BeRole;
  /** null = ไม่ได้สมัครเป็นผู้ขาย */
  sellerId: number | null;
  sellerVerified: boolean | null;
  createdAt: string | null;
}

interface BeUserDetail extends BeUserSummary {
  nationalNo: string | null;
  profileImage: string | null;
  buyerId: number | null;
  addresses: BeAddress[] | null;
  orderCount: number | null;
  artworkCount: number | null;
  copyrightSentCount: number | null;
  copyrightReceivedCount: number | null;
}

interface BeSellerVerify {
  sellerId: number;
  userId: number;
  username: string;
  email: string | null;
  fullName: string | null;
  phoneNumber: string | null;
  nationalNo: string | null;
  verified: boolean;
  addresses: BeAddress[] | null;
}

/* ------------------------------- mappers -------------------------------- */

/**
 * backend เก็บรูปเป็น null ได้ (ข้อมูล seed ไม่มีไฟล์รูปจริง)
 * แต่เพจใช้ค่านี้เป็น src ของ <img> ตรงๆ ถ้าส่งสตริงว่างไปเบราว์เซอร์จะโหลดหน้าซ้ำทั้งหน้า
 * และ Next.js จะเตือน 'An empty string was passed to the src attribute'
 * จึงเติมรูป SVG แทนให้ที่นี่ (ตัวเดียวกับที่ mock เดิมใช้) — เพจไม่ต้องแก้
 */
function imageOrPlaceholder(
  image: string | null | undefined,
  seed: string | number,
  label: string
): string {
  return image || artworkPlaceholder(String(seed), label || "Art");
}

function avatarOrPlaceholder(
  image: string | null | undefined,
  seed: string | number,
  label: string
): string {
  return image || avatarPlaceholder(String(seed), label || "U");
}

function mapAddress(a: BeAddress): Address {
  return {
    id: String(a.addressId),
    houseNo: a.houseNo ?? "",
    villageNo: a.villageNo ?? undefined,
    thoroughfare: a.thoroughfare ?? undefined,
    subDistrict: a.subdistrict,
    district: a.district,
    province: a.province,
    postalCode: a.postalCode,
  };
}

function mapProfile(p: BeProfile): User {
  const roles: User["roles"] = p.role === "SELLER" ? ["buyer", "seller"] : ["buyer"];
  return {
    id: String(p.userId),
    username: p.username,
    password: "", // backend ไม่เคยส่ง password กลับมา (และไม่ควรส่ง)
    email: p.email ?? "",
    fullName: p.fullName ?? undefined,
    phoneNumber: p.phoneNumber ?? undefined,
    nationalNo: p.nationalNo ?? undefined,
    profileImage: avatarOrPlaceholder(p.profileImage, p.userId, p.fullName || p.username),
    address: p.addresses?.length ? mapAddress(p.addresses[0]) : undefined,
    roles,
    sellerStatus: p.sellerStatus ?? "none",
    createdAt: new Date().toISOString(),
  };
}

function mapAuthToUser(a: BeAuth): User {
  const roles: User["roles"] = a.roleName === "SELLER" ? ["buyer", "seller"] : ["buyer"];
  return {
    id: String(a.userId),
    username: a.username,
    password: "",
    email: a.email ?? "",
    fullName: a.fullName ?? undefined,
    profileImage: avatarOrPlaceholder(a.profileImage, a.userId, a.fullName || a.username),
    roles,
    sellerStatus:
      a.roleName === "SELLER" ? (a.sellerVerified ? "approved" : "pending") : "none",
    createdAt: new Date().toISOString(),
  };
}

function mapArtworkStatus(a: BeArtworkSummary): ArtworkStatus {
  if (a.artworkStatus === "SOLD") return "sold";
  // publishStatus อาจไม่มีมาถ้า backend เป็นเวอร์ชันเก่า → ถือว่าเผยแพร่แล้ว
  if (a.publishStatus === "DRAFT") return "draft";
  return "published";
}

function mapArtworkSummary(a: BeArtworkSummary): Artwork {
  return {
    id: String(a.artworkId),
    // ต้องเป็น userId ของผู้ขาย ไม่ใช่ sellerId
    // เพราะหน้าเว็บเทียบกับ user.id ของคนที่ login อยู่ (เช็ค "งานของฉันไหม")
    // ถ้าใช้ sellerId จะไม่มีวันตรงกันเพราะเป็นคนละ id space
    sellerId: String(a.sellerUserId ?? a.sellerId),
    sellerName: a.sellerName ?? "",
    artworkName: a.artworkName,
    artworkImage: imageOrPlaceholder(a.artworkImage, a.artworkId, a.artworkName),
    artworkType: a.artworkType ?? "",
    artworkStyle: a.artworkStyle ?? "",
    artworkMediums: "",
    artworkMaterial: "",
    artworkSize: "",
    description: "",
    price: a.price,
    publishDate: "",
    artworkStatus: mapArtworkStatus(a),
    copyrightAvailable: false,
  };
}

function mapArtworkDetail(a: BeArtworkDetail): Artwork {
  return {
    ...mapArtworkSummary(a),
    artworkMediums: a.artworkMediums ?? "",
    artworkMaterial: a.artworkMaterial ?? "",
    artworkSize: a.artworkSize != null ? String(a.artworkSize) : "",
    description: a.description ?? "",
    publishDate: a.publishDate ?? "",
    copyrightAvailable: (a.copyrightPrice ?? 0) > 0,
    copyrightPrice: a.copyrightPrice ?? undefined,
  };
}

const PAYMENT_STATUS_MAP: Record<BePaymentStatus, PaymentStatus> = {
  AWAITING_PROOF: "unpaid",
  PENDING_CONFIRMATION: "submitted",
  COMPLETED: "confirmed",
  REJECTED: "rejected",
};

function mapPaymentStatus(s: BePaymentStatus | null | undefined): PaymentStatus {
  return s ? PAYMENT_STATUS_MAP[s] : "unpaid";
}

/**
 * รวมสถานะ availability ของ "ทุกชิ้น" ให้เป็นสถานะเดียวของคำสั่งซื้อ
 * ผู้ขายต้องยืนยันครบทุกชิ้น คำสั่งซื้อถึงจะถือว่าพร้อมให้ชำระเงิน
 */
function rollupAvailability(items: BeOrderItem[]): AvailabilityStatus {
  if (items.length === 0) return "waiting";
  if (items.some((i) => i.availabilityStatus === "UNAVAILABLE")) return "rejected";
  if (items.every((i) => i.availabilityStatus === "AVAILABLE")) return "confirmed";
  return "waiting";
}

function rollupShipping(items: BeOrderItem[]): ShippingStatus {
  if (items.length === 0) return "not_shipped";
  if (items.every((i) => i.shippingStatus === "DELIVERED")) return "delivered";
  if (items.some((i) => i.shippingStatus === "SHIPPED")) return "shipped";
  if (items.some((i) => i.shippingStatus === "PREPARING")) return "packed";
  return "not_shipped";
}

/**
 * backend เก็บ orderStatus แค่ 4 ค่า (PENDING/CONFIRMED/COMPLETED/CANCELLED)
 * ส่วน frontend แสดงไทม์ไลน์ละเอียดกว่า จึงประกอบสถานะขึ้นมาจาก
 * availability + payment + shipping รวมกัน
 */
function deriveOrderStatus(o: BeOrder | BeSellerOrder): OrderStatus {
  const items = o.items ?? [];
  if (o.orderStatus === "CANCELLED") return "cancelled";
  if (items.some((i) => i.availabilityStatus === "UNAVAILABLE")) return "cancelled";

  const payment = mapPaymentStatus(o.paymentStatus);
  if (payment === "confirmed") {
    const shipping = rollupShipping(items);
    if (shipping === "delivered") return "delivered";
    if (shipping === "shipped" || shipping === "packed") return "shipped";
    return "paid";
  }
  if (payment === "submitted") return "payment_review";
  if (rollupAvailability(items) === "confirmed") return "awaiting_payment";
  return "pending_availability";
}

function mapOrderItem(i: BeOrderItem): OrderItem {
  return {
    id: String(i.orderItemId),
    artworkId: String(i.artworkId),
    artworkName: i.artworkName,
    artworkImage: imageOrPlaceholder(i.artworkImage, i.artworkId, i.artworkName),
    price: i.price,
  };
}

function mapOrder(o: BeOrder): Order {
  const items = o.items ?? [];
  return {
    id: String(o.orderId),
    buyerId: String(o.buyerUserId ?? o.buyerId),
    buyerName: o.buyerName ?? "",
    sellerId: o.sellerUserId != null ? String(o.sellerUserId) : "",
    sellerName: o.sellerName ?? "",
    items: items.map(mapOrderItem),
    totalAmount: o.totalAmount ?? 0,
    shippingCost: o.shippingCost ?? 0,
    grandTotal: o.grandTotal ?? (o.totalAmount ?? 0) + (o.shippingCost ?? 0),
    orderStatus: deriveOrderStatus(o),
    availabilityStatus: rollupAvailability(items),
    shippingStatus: rollupShipping(items),
    paymentStatus: mapPaymentStatus(o.paymentStatus),
    slipTransfer: o.slipTransfer ?? undefined,
    orderDate: o.orderDate,
    confirmDateTime: o.confirmDateTime ?? undefined,
  };
}

function mapSellerOrder(o: BeSellerOrder, sellerName: string): Order {
  const items = o.items ?? [];
  const totalAmount = o.totalAmount ?? 0;
  return {
    id: String(o.orderId),
    buyerId: String(o.buyerUserId ?? o.buyerId),
    buyerName: o.buyerName ?? "",
    sellerId: "",
    sellerName,
    items: items.map(mapOrderItem),
    totalAmount,
    shippingCost: 0,
    grandTotal: totalAmount,
    orderStatus: deriveOrderStatus(o),
    availabilityStatus: rollupAvailability(items),
    shippingStatus: rollupShipping(items),
    paymentStatus: mapPaymentStatus(o.paymentStatus),
    orderDate: o.orderDate,
    confirmDateTime: undefined,
  };
}

function mapPayment(p: BePayment): Payment {
  // backend ส่ง totalPrice (ผลรวมราคาใน order_item) มาแล้ว ใช้ค่านั้นก่อน
  // ที่ต้องมี fallback ไว้เพราะ endpoint เก่าบางตัวยังไม่ส่ง field นี้
  const totalPrice = p.totalPrice ?? (p.grandTotal ?? 0) - (p.shippingCost ?? 0);
  return {
    id: String(p.paymentId),
    orderId: String(p.orderId),
    buyerId: String(p.buyerUserId ?? p.buyerId),
    buyerName: p.buyerName ?? "",
    // endpoint รายการ (PaymentSummaryResponse) ส่ง sellerName มาตรงๆ
    // ส่วน endpoint รายละเอียด (PaymentDetailResponse) ต้องดึงจาก artworks
    sellerId: String(
      p.sellerUserId ?? p.artworks?.[0]?.sellerUserId ?? p.artworks?.[0]?.sellerId ?? ""
    ),
    sellerName: p.sellerName ?? p.artworks?.[0]?.sellerName ?? "",
    totalPrice,
    shippingCost: p.shippingCost ?? 0,
    grandTotal: p.grandTotal ?? 0,
    slipTransfer: p.slipTransfer ?? undefined,
    status: mapPaymentStatus(p.transferStatus),
    // ใช้วันที่สั่งซื้อจริงจาก backend ถ้ามี (เดิมยัด "เวลาปัจจุบัน" ทำให้เรียงตามเวลาไม่ได้)
    createdAt: p.orderDate ?? new Date().toISOString(),
  };
}

/* ---- ชนิดข้อมูลเฉพาะหน้า Admin (ข้อมูลเต็มกว่าที่หน้าอื่นต้องใช้) ---- */

export interface AdminPaymentDetail extends Payment {
  buyerEmail?: string;
  buyerPhone?: string;
  orderDate?: string;
  confirmDateTime?: string;
  orderStatusRaw?: string;
  items: {
    id: string;
    artworkId: string;
    artworkName: string;
    price: number;
    availabilityStatus: AvailabilityStatus;
    shippingStatus: ShippingStatus;
  }[];
}

const AVAILABILITY_LINE_MAP: Record<string, AvailabilityStatus> = {
  PENDING_CONFIRMATION: "waiting",
  AVAILABLE: "confirmed",
  UNAVAILABLE: "rejected",
};

const SHIPPING_LINE_MAP: Record<string, ShippingStatus> = {
  PREPARING: "packed",
  SHIPPED: "shipped",
  DELIVERED: "delivered",
};

function mapPaymentDetail(p: BePayment): AdminPaymentDetail {
  return {
    ...mapPayment(p),
    buyerEmail: p.buyerEmail ?? undefined,
    buyerPhone: p.buyerPhone ?? undefined,
    orderDate: p.orderDate ?? undefined,
    confirmDateTime: p.confirmDateTime ?? undefined,
    orderStatusRaw: p.orderStatus ?? undefined,
    items: (p.items ?? []).map((i) => ({
      id: String(i.orderItemId),
      artworkId: String(i.artworkId),
      artworkName: i.artworkName,
      price: i.price ?? 0,
      availabilityStatus:
        AVAILABILITY_LINE_MAP[i.availabilityStatus ?? "PENDING_CONFIRMATION"] ?? "waiting",
      shippingStatus: SHIPPING_LINE_MAP[i.shippingStatus ?? ""] ?? "not_shipped",
    })),
  };
}

const TRANSFER_STATUS_MAP: Record<BeTransfer["transferStatus"], TransferStatus> = {
  PENDING: "requested",
  SIGNED: "accepted", // ผู้ขายตอบรับแล้ว รอผู้ซื้อลงนามกลับ
  COMPLETED: "completed",
  REJECTED: "rejected",
};

function mapTransfer(t: BeTransfer): CopyrightTransfer {
  const art = t.artworks?.[0];
  return {
    id: String(t.copyrightId),
    // ใช้ field ระดับบนก่อน แล้วค่อย fallback ไปที่ artworks[0]
    artworkId: String(t.artworkId ?? art?.artworkId ?? ""),
    artworkName: t.artworkName ?? art?.artworkName ?? "",
    artworkImage: imageOrPlaceholder(art?.artworkImage, art?.artworkId ?? t.copyrightId, art?.artworkName ?? ""),
    // เทียบกับ user.id ในหน้า /copyright/[id] เพื่อตัดสินว่าใครเป็นผู้ซื้อ/ผู้ขาย
    buyerId: String(t.buyerUserId ?? t.buyerId),
    buyerName: t.buyerName ?? "",
    sellerId: String(t.sellerUserId ?? t.sellerId),
    sellerName: t.sellerName ?? "",
    price: t.copyrightPrice ?? art?.price ?? 0,
    fullName: t.fullName,
    nationalNo: t.nationalNo,
    address: {
      id: String(t.copyrightId),
      houseNo: t.houseNo ?? "",
      villageNo: t.villageNo ?? undefined,
      thoroughfare: t.thoroughfare ?? undefined,
      subDistrict: t.subdistrict,
      district: t.district,
      province: t.province,
      postalCode: t.postalCode,
    },
    // ข้อตกลงของผู้ซื้อ กับคำตอบของผู้ขาย เป็นคนละข้อความกัน
    // (เดิม fallback ไปใช้ sellerResponseDetail ทำให้ช่องนี้ว่างจนกว่าผู้ขายจะตอบ)
    agreement: t.agreement ?? "",
    responseDetail: t.sellerResponseDetail ?? undefined,
    documentFile: t.documentFile ?? undefined,
    transferStatus: TRANSFER_STATUS_MAP[t.transferStatus],
    transferDate: t.transferDate,
  };
}

/* ---------------------------- Auth / Users ---------------------------- */

export type SessionPrincipal =
  | { kind: "user"; user: User }
  | { kind: "admin"; admin: Admin };

/**
 * ลอง login เป็น user ก่อน ถ้าไม่ผ่านค่อยลองเป็น admin
 *
 * backend แยก endpoint ไว้คนละตัว (/api/auth/login กับ /api/admin/login)
 * เพราะ SRS กำหนดให้ Admin อยู่คนละตารางกับ User
 * แต่ frontend มีช่อง login ช่องเดียว จึงต้องลองทีละอันที่นี่
 */
export async function loginUser(
  usernameOrEmail: string,
  password: string
): Promise<SessionPrincipal> {
  try {
    const auth = await request<BeAuth>("/auth/login", {
      method: "POST",
      auth: false,
      body: JSON.stringify({ usernameOrEmail, password }),
    });
    setToken(auth.token);
    return { kind: "user", user: mapAuthToUser(auth) };
  } catch (userErr) {
    try {
      const auth = await request<BeAuth>("/admin/login", {
        method: "POST",
        auth: false,
        body: JSON.stringify({ username: usernameOrEmail, password }),
      });
      setToken(auth.token);
      return {
        kind: "admin",
        admin: { id: String(auth.userId), username: auth.username, password: "" },
      };
    } catch {
      throw userErr instanceof ApiError ? userErr : new ApiError("ไม่พบข้อมูลผู้ใช้");
    }
  }
}

/** login เฉพาะ admin — ใช้ในหน้า /admin/login */
export async function loginAdmin(
  username: string,
  password: string
): Promise<Admin> {
  const auth = await request<BeAuth>("/admin/login", {
    method: "POST",
    auth: false,
    body: JSON.stringify({ username, password }),
  });
  setToken(auth.token);
  return { id: String(auth.userId), username: auth.username, password: "" };
}

export async function registerBuyer(input: {
  username: string;
  password: string;
  email: string;
}): Promise<User> {
  const auth = await request<BeAuth>("/auth/register", {
    method: "POST",
    auth: false,
    body: JSON.stringify(input),
  });
  setToken(auth.token);
  return mapAuthToUser(auth);
}

export async function registerSeller(
  _userId: string,
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
  // backend รู้ว่าใครเป็นคนสมัครจาก JWT อยู่แล้ว จึงไม่ต้องส่ง userId ไปด้วย
  const auth = await request<BeAuth>("/auth/register-seller", {
    method: "POST",
    body: JSON.stringify({
      fullName: input.fullName,
      phoneNumber: input.phoneNumber,
      nationalNo: input.nationalNo,
      address: {
        houseNo: input.houseNo,
        villageNo: input.villageNo,
        thoroughfare: input.thoroughfare,
        subdistrict: input.subDistrict, // backend สะกด subdistrict ตัวเล็กทั้งคำ
        district: input.district,
        province: input.province,
        postalCode: input.postalCode,
      },
    }),
  });
  // role เปลี่ยนเป็น SELLER แล้ว token เดิมยังถือ role BUYER อยู่ → ต้องเปลี่ยนเป็นตัวใหม่
  setToken(auth.token);
  return mapAuthToUser(auth);
}

export async function getUser(userId: string): Promise<User | undefined> {
  try {
    const p = await request<BeProfile>(`/users/${userId}`);
    return mapProfile(p);
  } catch {
    return undefined;
  }
}

/** โปรไฟล์ของคนที่ login อยู่ — ใช้คืนสถานะ session ตอน refresh หน้า */
export async function getMe(): Promise<User | undefined> {
  try {
    const p = await request<BeProfile>("/users/me");
    return mapProfile(p);
  } catch {
    return undefined;
  }
}

export async function updateProfile(
  _userId: string,
  patch: Partial<
    Pick<User, "username" | "fullName" | "email" | "phoneNumber" | "profileImage">
  >
): Promise<User> {
  const p = await request<BeProfile>("/users/me", {
    method: "PUT",
    body: JSON.stringify(patch),
  });
  return mapProfile(p);
}

/**
 * แปลง sellerVerified (true/false/null) ที่ backend ส่งมาเป็นสถานะที่หน้าเว็บใช้
 * null = ไม่ได้สมัครเป็นผู้ขาย, false = ยื่นแล้วรออนุมัติ, true = อนุมัติแล้ว
 */
function toSellerStatus(u: BeUserSummary): User["sellerStatus"] {
  if (u.sellerVerified == null) return "none";
  return u.sellerVerified ? "approved" : "pending";
}

function mapUserSummary(u: BeUserSummary): User {
  return {
    id: String(u.userId),
    username: u.username,
    password: "",
    email: u.email ?? "",
    fullName: u.fullName ?? undefined,
    phoneNumber: u.phoneNumber ?? undefined,
    roles: u.sellerId != null || u.role === "SELLER" ? ["buyer", "seller"] : ["buyer"],
    sellerStatus: toSellerStatus(u),
    createdAt: u.createdAt ?? new Date().toISOString(),
    // รายการรวมไม่ส่งรูปโปรไฟล์มา (หนักเกินไป) จึงใช้รูปแทนที่สร้างจากชื่อ
    // ถ้าปล่อยว่างไว้ <img> จะไม่มี src แล้วขึ้นไอคอนรูปเสียในตาราง
    profileImage: avatarOrPlaceholder(null, u.userId, u.fullName ?? u.username),
  };
}

export async function listUsers(): Promise<User[]> {
  // เดิมต้องยิง /admin/sellers/pending อีกรอบเพื่อเดาว่าใครรออนุมัติ
  // ตอนนี้ backend ส่ง sellerVerified มาในรายการเลย จึงเหลือ request เดียว
  const users = await requestOr<BeUserSummary[]>("/admin/users", []);
  return users.map(mapUserSummary);
}

/** ข้อมูลผู้ใช้แบบเต็มสำหรับหน้า Admin — ทุกอย่างยกเว้นรหัสผ่าน */
export interface AdminUserDetail extends User {
  addresses: Address[];
  sellerId?: string;
  buyerId?: string;
  orderCount: number;
  artworkCount: number;
  copyrightSentCount: number;
  copyrightReceivedCount: number;
}

export async function getUserDetail(userId: string): Promise<AdminUserDetail | undefined> {
  try {
    const u = await request<BeUserDetail>(`/admin/users/${userId}`);
    return {
      ...mapUserSummary(u),
      nationalNo: u.nationalNo ?? undefined,
      profileImage: avatarOrPlaceholder(u.profileImage, u.userId, u.fullName ?? u.username),
      addresses: (u.addresses ?? []).map(mapAddress),
      sellerId: u.sellerId != null ? String(u.sellerId) : undefined,
      buyerId: u.buyerId != null ? String(u.buyerId) : undefined,
      orderCount: u.orderCount ?? 0,
      artworkCount: u.artworkCount ?? 0,
      copyrightSentCount: u.copyrightSentCount ?? 0,
      copyrightReceivedCount: u.copyrightReceivedCount ?? 0,
    };
  } catch {
    return undefined;
  }
}

/**
 * อนุมัติ/ปฏิเสธผู้สมัครขาย
 *
 * frontend ส่ง userId มา แต่ backend รับ sellerId จึงต้องหาคู่ที่ตรงกันจาก
 * รายการรออนุมัติก่อน (เป็นรายการเดียวที่ Admin กดอนุมัติได้อยู่แล้ว)
 */
export async function verifySeller(
  userId: string,
  approve: boolean
): Promise<User> {
  const pending = await requestOr<BeSellerVerify[]>("/admin/sellers/pending", []);
  const target = pending.find((s) => String(s.userId) === String(userId));
  if (!target) throw new ApiError("ไม่พบข้อมูลผู้สมัครขาย");

  await request<unknown>(`/admin/sellers/${target.sellerId}/verify`, {
    method: "PATCH",
    body: JSON.stringify({ approved: approve }),
  });

  return {
    id: String(target.userId),
    username: target.username,
    password: "",
    email: target.email ?? "",
    fullName: target.fullName ?? undefined,
    phoneNumber: target.phoneNumber ?? undefined,
    nationalNo: target.nationalNo ?? undefined,
    roles: approve ? ["buyer", "seller"] : ["buyer"],
    sellerStatus: approve ? "approved" : "rejected",
    createdAt: new Date().toISOString(),
  };
}

/* ------------------------------ Artworks ------------------------------ */

export type ArtworkSort = "newest" | "price_asc" | "price_desc" | "name";

export interface ArtworkSearchParams {
  q?: string;
  artworkType?: string;
  artworkStyle?: string;
  artworkMediums?: string;
  minPrice?: number;
  maxPrice?: number;
  minSize?: number;
  maxSize?: number;
  sort?: ArtworkSort;
  limit?: number;
}

export async function searchArtworks(
  params: ArtworkSearchParams = {}
): Promise<Artwork[]> {
  const list = await requestOr<BeArtworkSummary[]>(
    `/artworks${qs({
      keyword: params.q,
      artworkType: params.artworkType,
      artworkStyle: params.artworkStyle,
      artworkMediums: params.artworkMediums,
      minPrice: params.minPrice,
      maxPrice: params.maxPrice,
      minSize: params.minSize,
      maxSize: params.maxSize,
      sort: params.sort,
      limit: params.limit,
    })}`,
    [],
    { auth: false }
  );
  return list.map(mapArtworkSummary);
}

/** งานมาใหม่ล่าสุด — ใช้ในหน้าแรก */
export async function listLatestArtworks(limit = 8): Promise<Artwork[]> {
  const list = await requestOr<BeArtworkSummary[]>(
    `/artworks/latest${qs({ limit })}`,
    [],
    { auth: false }
  );
  return list.map(mapArtworkSummary);
}

/**
 * แนะนำสำหรับคุณ — ใช้ในหน้าแรก
 *
 * ส่ง token ไปด้วยถ้ามี (auth: true) เพื่อให้ backend แนะนำจากประวัติของผู้ใช้คนนั้น
 * ถ้ายังไม่ได้ login backend จะคืนงานล่าสุดให้แทน ไม่ error
 */
export async function listRecommendedArtworks(limit = 8): Promise<Artwork[]> {
  const list = await requestOr<BeArtworkSummary[]>(
    `/artworks/recommended${qs({ limit })}`,
    []
  );
  return list.map(mapArtworkSummary);
}

export interface FacetValue {
  value: string;
  count: number;
}

export interface ArtworkFacets {
  types: FacetValue[];
  styles: FacetValue[];
  mediums: FacetValue[];
  minPrice: number | null;
  maxPrice: number | null;
}

/**
 * ตัวเลือกของตัวกรองในหน้า Search
 *
 * ดึงจากฐานข้อมูลจริงแทนการ hardcode ไว้ในโค้ด
 * พอผู้ขายเพิ่มงานประเภทใหม่ ตัวกรองจะมีตัวเลือกนั้นให้เลือกเองทันที
 */
export async function getArtworkFacets(): Promise<ArtworkFacets> {
  const empty: ArtworkFacets = {
    types: [],
    styles: [],
    mediums: [],
    minPrice: null,
    maxPrice: null,
  };
  return requestOr<ArtworkFacets>("/artworks/facets", empty, { auth: false });
}

export async function getArtwork(id: string): Promise<Artwork | undefined> {
  try {
    const a = await request<BeArtworkDetail>(`/artworks/${id}`);
    return mapArtworkDetail(a);
  } catch {
    return undefined;
  }
}

/**
 * รายการผลงานของผู้ขาย
 *
 * ถ้าเป็นผลงานของตัวเอง ใช้ /artworks/my เพื่อให้เห็นงานที่ยังเป็น DRAFT ด้วย
 * ถ้าเป็นของคนอื่น อ่านจากหน้าโปรไฟล์สาธารณะ (เห็นเฉพาะที่เผยแพร่แล้ว)
 */
export async function listArtworksBySeller(sellerId: string): Promise<Artwork[]> {
  const mine = await requestOr<BeArtworkSummary[]>("/artworks/my", []);
  if (mine.length > 0) return mine.map(mapArtworkSummary);

  const profile = await requestOr<BeProfile | null>(`/users/${sellerId}`, null, {
    auth: false,
  });
  return (profile?.artworks ?? []).map(mapArtworkSummary);
}

export async function addArtwork(
  _sellerId: string,
  _sellerName: string,
  input: Omit<
    Artwork,
    "id" | "sellerId" | "sellerName" | "publishDate" | "artworkStatus"
  >
): Promise<Artwork> {
  const a = await request<BeArtworkDetail>("/artworks", {
    method: "POST",
    body: JSON.stringify({
      artworkName: input.artworkName,
      artworkImage: input.artworkImage,
      artworkType: input.artworkType,
      artworkStyle: input.artworkStyle,
      artworkMediums: input.artworkMediums,
      artworkMaterial: input.artworkMaterial,
      // backend เก็บขนาดเป็นตัวเลข ส่วน frontend เก็บเป็นข้อความ เช่น "40x60 ซม."
      // จึงดึงเฉพาะตัวเลขตัวแรกออกมา และกันไม่ให้เป็น 0 เพราะ backend บังคับ @Positive
      artworkSize: parseSize(input.artworkSize),
      description: input.description,
      price: input.price,
      publishDate: new Date().toISOString().slice(0, 10),
      copyrightPrice: input.copyrightAvailable ? input.copyrightPrice ?? null : null,
    }),
  });
  return mapArtworkDetail(a);
}

function parseSize(size: string | undefined): number {
  const n = Number.parseFloat(String(size ?? "").replace(/[^\d.]/g, ""));
  return Number.isFinite(n) && n > 0 ? n : 1;
}

export async function updateArtwork(
  id: string,
  patch: Partial<Artwork>
): Promise<Artwork> {
  // publishArtwork() เรียกฟังก์ชันนี้ด้วย patch { artworkStatus: "published" }
  // ซึ่งฝั่ง backend เป็นคนละ endpoint กัน จึงต้องแยกทางตรงนี้
  if (patch.artworkStatus === "published" && Object.keys(patch).length === 1) {
    const a = await request<BeArtworkDetail>(`/artworks/${id}/publish`, {
      method: "PATCH",
    });
    return mapArtworkDetail(a);
  }

  const body: Record<string, unknown> = {};
  if (patch.artworkName !== undefined) body.artworkName = patch.artworkName;
  if (patch.artworkImage !== undefined) body.artworkImage = patch.artworkImage;
  if (patch.artworkType !== undefined) body.artworkType = patch.artworkType;
  if (patch.artworkStyle !== undefined) body.artworkStyle = patch.artworkStyle;
  if (patch.artworkMediums !== undefined) body.artworkMediums = patch.artworkMediums;
  if (patch.artworkMaterial !== undefined) body.artworkMaterial = patch.artworkMaterial;
  if (patch.artworkSize !== undefined) body.artworkSize = parseSize(patch.artworkSize);
  if (patch.description !== undefined) body.description = patch.description;
  if (patch.price !== undefined) body.price = patch.price;
  if (patch.copyrightPrice !== undefined) body.copyrightPrice = patch.copyrightPrice;

  const a = await request<BeArtworkDetail>(`/artworks/${id}`, {
    method: "PUT",
    body: JSON.stringify(body),
  });
  return mapArtworkDetail(a);
}

export async function publishArtwork(id: string): Promise<Artwork> {
  const a = await request<BeArtworkDetail>(`/artworks/${id}/publish`, {
    method: "PATCH",
  });
  return mapArtworkDetail(a);
}

/* -------------------------------- Cart -------------------------------- */

export async function listCart(
  _buyerId: string
): Promise<Array<CartItem & { artwork?: Artwork }>> {
  const cart = await requestOr<{ items: BeCartItem[]; totalPrice: number } | null>(
    "/cart",
    null
  );
  const items = cart?.items ?? [];
  return items.map((i) => ({
    id: String(i.cartItemId),
    artworkId: String(i.artworkId),
    addDate: i.addDate,
    priceAtAdd: i.priceAtAdd,
    artwork: i.artwork
      ? mapArtworkSummary(i.artwork)
      : {
          id: String(i.artworkId),
          sellerId: "",
          sellerName: "",
          artworkName: i.artworkName,
          artworkImage: imageOrPlaceholder(i.artworkImage, i.artworkId, i.artworkName),
          artworkType: "",
          artworkStyle: "",
          artworkMediums: "",
          artworkMaterial: "",
          artworkSize: "",
          description: "",
          price: i.priceAtAdd,
          publishDate: "",
          artworkStatus: "published" as ArtworkStatus,
          copyrightAvailable: false,
        },
  }));
}

export async function addToCart(
  buyerId: string,
  artworkId: string
): Promise<CartItem[]> {
  await request<BeCartItem>("/cart", {
    method: "POST",
    body: JSON.stringify({ artworkId: Number(artworkId) }),
  });
  return (await listCart(buyerId)).map(({ artwork: _artwork, ...rest }) => rest);
}

export async function removeFromCart(
  buyerId: string,
  cartItemId: string
): Promise<CartItem[]> {
  await request<void>(`/cart/${cartItemId}`, { method: "DELETE" });
  return (await listCart(buyerId)).map(({ artwork: _artwork, ...rest }) => rest);
}

/* ------------------------------- Orders -------------------------------- */

export async function confirmOrder(_buyer: User): Promise<Order[]> {
  const o = await request<BeOrder>("/cart/confirm", { method: "POST" });
  return [mapOrder(o)];
}

export async function listOrdersByBuyer(_buyerId: string): Promise<Order[]> {
  const list = await requestOr<BeOrder[]>("/orders", []);
  return list.map(mapOrder);
}

export async function listOrdersBySeller(sellerId: string): Promise<Order[]> {
  const list = await requestOr<BeSellerOrder[]>("/seller/orders", []);
  return list.map((o) => mapSellerOrder(o, sellerId));
}

export async function getOrder(orderId: string): Promise<Order | undefined> {
  try {
    const o = await request<BeOrder>(`/orders/${orderId}`);
    return mapOrder(o);
  } catch {
    return undefined;
  }
}

/**
 * ผู้ขายยืนยันความพร้อมในการขาย
 *
 * frontend คิดเป็นระดับ "คำสั่งซื้อ" แต่ backend ยืนยันเป็นราย OrderItem
 * จึงต้องดึงรายการของคำสั่งซื้อนั้นมาก่อน แล้วยิงทีละชิ้นที่ยังรอยืนยันอยู่
 */
export async function confirmAvailability(
  orderId: string,
  confirmed: boolean
): Promise<Order> {
  const orders = await requestOr<BeSellerOrder[]>("/seller/orders", []);
  const target = orders.find((o) => String(o.orderId) === String(orderId));
  if (!target) throw new ApiError("ไม่พบรายการคำสั่งซื้อนี้");

  const pendingItems = target.items.filter(
    (i) => i.availabilityStatus === "PENDING_CONFIRMATION"
  );
  if (pendingItems.length === 0) throw new ApiError("รายการนี้ถูกยืนยันไปแล้ว");

  for (const item of pendingItems) {
    await request<unknown>(`/seller/order-items/${item.orderItemId}/availability`, {
      method: "PATCH",
      body: JSON.stringify({ available: confirmed }),
    });
  }

  const refreshed = await requestOr<BeSellerOrder[]>("/seller/orders", []);
  const updated = refreshed.find((o) => String(o.orderId) === String(orderId));
  return updated ? mapSellerOrder(updated, "") : mapSellerOrder(target, "");
}

const SHIPPING_TO_BACKEND: Record<ShippingStatus, string | null> = {
  not_shipped: null,
  packed: "PREPARING",
  shipped: "SHIPPED",
  delivered: "DELIVERED",
};

export async function updateShippingStatus(
  orderId: string,
  status: Order["shippingStatus"]
): Promise<Order> {
  const beStatus = SHIPPING_TO_BACKEND[status];
  if (!beStatus) throw new ApiError("สถานะการจัดส่งไม่ถูกต้อง");

  const orders = await requestOr<BeSellerOrder[]>("/seller/orders", []);
  const target = orders.find((o) => String(o.orderId) === String(orderId));
  if (!target) throw new ApiError("ไม่พบรายการคำสั่งซื้อนี้");

  // อัปเดตเฉพาะชิ้นที่ผู้ขายยืนยันว่าพร้อมขายแล้ว (backend ปฏิเสธชิ้นที่ยังไม่ยืนยัน)
  const items = target.items.filter((i) => i.availabilityStatus === "AVAILABLE");
  if (items.length === 0) {
    throw new ApiError("ต้องยืนยันความพร้อมในการขายก่อนจึงจะอัปเดตสถานะการจัดส่งได้");
  }

  for (const item of items) {
    await request<unknown>(`/seller/order-items/${item.orderItemId}/shipping`, {
      method: "PATCH",
      body: JSON.stringify({ shippingStatus: beStatus }),
    });
  }

  const refreshed = await requestOr<BeSellerOrder[]>("/seller/orders", []);
  const updated = refreshed.find((o) => String(o.orderId) === String(orderId));
  return updated ? mapSellerOrder(updated, "") : mapSellerOrder(target, "");
}

export async function makePayment(
  orderId: string,
  slipTransfer: string
): Promise<Order> {
  await request<BePayment>("/payments", {
    method: "POST",
    body: JSON.stringify({ orderId: Number(orderId), slipTransfer }),
  });
  const order = await getOrder(orderId);
  if (!order) throw new ApiError("ไม่พบคำสั่งซื้อ");
  return order;
}

/** ยอดที่ต้องชำระของคำสั่งซื้อ (ยูสเคส View Quotation / Make Payment) */
export async function getPaymentSummary(orderId: string): Promise<{
  totalPrice: number;
  shippingCost: number;
  grandTotal: number;
}> {
  return request<{ totalPrice: number; shippingCost: number; grandTotal: number }>(
    `/orders/${orderId}/payment-summary`
  );
}

/* ------------------------------ Payments -------------------------------- */

export async function listPayments(): Promise<Payment[]> {
  const list = await requestOr<BePayment[]>("/admin/payments", []);
  return list.map(mapPayment);
}

export async function getPayment(id: string): Promise<AdminPaymentDetail | undefined> {
  try {
    const p = await request<BePayment>(`/admin/payments/${id}`);
    return mapPaymentDetail(p);
  } catch {
    return undefined;
  }
}

export async function confirmPayment(
  paymentId: string,
  approve: boolean
): Promise<Payment> {
  const p = await request<BePayment>(`/admin/payments/${paymentId}/confirm`, {
    method: "PATCH",
    body: JSON.stringify({ approved: approve }),
  });
  return mapPayment(p);
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
  const t = await request<BeTransfer>("/copyright-transfers", {
    method: "POST",
    body: JSON.stringify({
      // ส่ง artworkId ไป แล้วให้ backend หาคำสั่งซื้อที่มีงานชิ้นนี้ให้เอง
      artworkId: Number(input.artwork.id),
      fullName: input.fullName,
      nationalNo: input.nationalNo,
      houseNo: input.address.houseNo,
      villageNo: input.address.villageNo,
      thoroughfare: input.address.thoroughfare,
      subdistrict: input.address.subDistrict,
      district: input.address.district,
      province: input.address.province,
      postalCode: input.address.postalCode,
      agreement: input.agreement,
    }),
  });
  return mapTransfer(t);
}

export async function listCopyrightTransfersByBuyer(
  _buyerId: string
): Promise<CopyrightTransfer[]> {
  const list = await requestOr<BeTransfer[]>("/copyright-transfers/sent", []);
  return list.map(mapTransfer);
}

export async function listCopyrightTransfersBySeller(
  _sellerId: string
): Promise<CopyrightTransfer[]> {
  const list = await requestOr<BeTransfer[]>("/copyright-transfers/received", []);
  return list.map(mapTransfer);
}

/**
 * backend ไม่มี endpoint ดึงสัญญาทีละฉบับ จึงหาจากรายการที่ดึงมาได้
 * ลองฝั่งผู้ซื้อก่อน ถ้าไม่เจอค่อยลองฝั่งผู้ขาย (หน้าเดียวกันใช้ได้ทั้งสอง role)
 */
export async function getCopyrightTransfer(
  id: string
): Promise<CopyrightTransfer | undefined> {
  const sent = await requestOr<BeTransfer[]>("/copyright-transfers/sent", []);
  const found = sent.find((t) => String(t.copyrightId) === String(id));
  if (found) return mapTransfer(found);

  const received = await requestOr<BeTransfer[]>("/copyright-transfers/received", []);
  const found2 = received.find((t) => String(t.copyrightId) === String(id));
  return found2 ? mapTransfer(found2) : undefined;
}

export async function respondCopyrightTransfer(
  id: string,
  accept: boolean,
  responseDetail: string
): Promise<CopyrightTransfer> {
  const t = await request<BeTransfer>(`/copyright-transfers/${id}/respond`, {
    method: "PATCH",
    body: JSON.stringify({ approved: accept, detail: responseDetail }),
  });
  return mapTransfer(t);
}

export async function signCopyrightTransfer(
  id: string,
  documentFile: string
): Promise<CopyrightTransfer> {
  const t = await request<BeTransfer>(`/copyright-transfers/${id}/sign`, {
    method: "PATCH",
    body: JSON.stringify({ documentFile }),
  });
  return mapTransfer(t);
}
