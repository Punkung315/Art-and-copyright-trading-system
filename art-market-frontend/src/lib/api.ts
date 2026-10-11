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
  CopyrightPayment,
  CopyrightPaymentPreview,
  CopyrightTransfer,
  Order,
  OrderItem,
  OrderStatus,
  Payment,
  PaymentStatus,
  Quotation,
  BankAccount,
  SellerPayout,
  ShippingCompanyCode,
  ShippingOption,
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

/**
 * บทบาทจาก backend — ADMIN รวมอยู่ในนี้แล้ว
 *
 * ผู้ดูแลระบบเคยอยู่คนละตารางกับผู้ใช้ทั่วไป enum ฝั่ง backend จึงไม่มีค่า ADMIN
 * และต้องส่ง role = null มาพร้อม roleName เป็น string แทน
 * ตอนนี้ยุบเป็นตารางเดียวแล้ว role จึงมีค่าจริงทุกกรณี
 * (คง roleName ไว้เพื่อไม่ให้ client เก่าพัง — ค่าเดียวกันทั้งคู่)
 */
type BeRole = "BUYER" | "SELLER" | "ADMIN";

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
  pickupAddress?: boolean;
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
  /**
   * token ใบใหม่ — backend ส่งมาเฉพาะตอนที่ผู้ใช้เปลี่ยนชื่อผู้ใช้ของตัวเอง
   * เพราะ JWT เก็บ username ไว้ใน subject ใบเดิมจึงใช้ไม่ได้อีก
   */
  token?: string | null;
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
  /**
   * ข้อมูลลิขสิทธิ์และขนาด — backend ส่งมากับผลการค้นหาแล้ว
   * (ของเดิมมีเฉพาะใน detail การ์ดจึงขึ้นป้าย "ซื้อลิขสิทธิ์ได้" ไม่ได้เลย)
   */
  copyrightPrice?: number | null;
  copyrightSold?: boolean | null;
  width?: number | null;
  height?: number | null;
}

interface BeArtworkDetail extends BeArtworkSummary {
  artworkMediums: string | null;
  artworkMaterial: string | null;
  description: string | null;
  copyrightAutoPrice?: boolean;
  /** ค่าส่ง "ประเมิน" ของชิ้นงาน — ห้ามใช้คิดเงิน ค่าจริงอยู่ที่ BeOrderItem.shippingCost */
  shippingCostEstimate: number | null;
  shippingCompany: ShippingCompanyCode | null;
  shippingCompanyName: string | null;
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
  /** ผู้ขายรายชิ้น — มีเฉพาะ endpoint ที่ส่ง OrderDetailResponse */
  sellerId?: number | null;
  sellerUserId?: number | null;
  sellerName?: string | null;
  /** ค่าจัดส่งรายชิ้น ล็อกไว้ตอนยืนยันคำสั่งซื้อ */
  shippingCost?: number | null;
  shippingCompanyName?: string | null;
  /** หลักฐานการจัดส่ง */
  packingImage?: string | null;
  packedAt?: string | null;
  trackingNumber?: string | null;
  shippedAt?: string | null;
  deliveredAt?: string | null;
  deliveryConfirmedBy?: "BUYER" | "AUTO" | null;
}

interface BeSellerPayout {
  sellerId: number;
  sellerUserId: number | null;
  sellerName: string | null;
  sellerEmail?: string | null;
  sellerPhone?: string | null;
  amount: number;
  itemCount: number;
  deliveredCount: number;
  readyForPayout: boolean;
  paid: boolean;
  paidAt?: string | null;
  slipTransfer?: string | null;
  hasBankAccount?: boolean;
  bankName?: string | null;
  bankAccountNumber?: string | null;
  bankAccountName?: string | null;
  bankBookImage?: string | null;
}

interface BeBankAccount {
  bankCode: string;
  bankName: string;
  accountNumber: string;
  accountName: string;
  bankBookImage: string | null;
  updatedAt: string | null;
}

function mapBankAccount(b: BeBankAccount | null | undefined): BankAccount | undefined {
  if (!b) return undefined;
  return {
    bankCode: b.bankCode,
    bankName: b.bankName,
    accountNumber: b.accountNumber,
    accountName: b.accountName,
    bankBookImage: b.bankBookImage ?? undefined,
    updatedAt: b.updatedAt ?? undefined,
  };
}

/** ข้อมูลบัญชีที่ส่งไป backend — เลขบัญชีส่งไปตามที่กรอก backend ตัดขีดให้เอง */
export interface BankAccountInput {
  bankCode: string;
  accountNumber: string;
  accountName: string;
  /** ว่าง = คงรูปเดิม (ตอนแก้ไข) */
  bankBookImage?: string;
}

interface BeOrder {
  orderId: number;
  orderStatus: "PENDING" | "CONFIRMED" | "COMPLETED" | "CANCELLED";
  orderDate: string;
  confirmDateTime: string | null;
  totalAmount: number;
  shippingCost: number;
  grandTotal: number;
  /** ยอดเฉพาะชิ้นที่ผู้ขายยืนยันว่าพร้อมขาย — ยอดที่ต้องจ่ายจริง */
  payableTotalAmount?: number | null;
  payableShippingCost?: number | null;
  payableGrandTotal?: number | null;
  buyerId: number;
  buyerName: string | null;
  buyerUserId: number | null;
  sellerId: number | null;
  sellerName: string | null;
  sellerUserId: number | null;
  paymentId: number | null;
  paymentStatus: BePaymentStatus | null;
  slipTransfer: string | null;
  /** ที่อยู่ปลายทาง บันทึกเป็นสำเนาตอนยืนยันคำสั่งซื้อ */
  shippingAddress?: string | null;
  shippingProvince?: string | null;
  paymentConfirmedAt?: string | null;
  autoDeliveryConfirmAt?: string | null;
  autoDeliveryConfirmDays?: number | null;
  /** มีเฉพาะตอนผู้ขายเปิดดู */
  sellerPayout?: BeSellerPayout | null;
  items: BeOrderItem[];
}

/** ใบเสนอราคา — GET /orders/{id}/quotation (ยูสเคส 3.1.14) */
interface BeQuotationItem {
  no: number | null;
  artworkName: string | null;
  sellerName: string | null;
  quantity: number | null;
  price: number | null;
  amount: number | null;
  shippingCost: number | null;
  shippingCompanyName: string | null;
  availabilityStatus: BeOrderItem["availabilityStatus"] | null;
}

interface BeQuotation {
  orderId: number;
  dateTimeNow: string;
  orderDate: string | null;
  confirmDateTime: string | null;
  sellerName: string | null;
  sellerAddress: string | null;
  sellerTel: string | null;
  sellerEmail: string | null;
  buyerName: string | null;
  buyerAddress: string | null;
  buyerTel: string | null;
  buyerEmail: string | null;
  buyerTaxId: string | null;
  shippingAddress: string | null;
  totalAmount: number | null;
  shippingCost: number | null;
  grandTotal: number | null;
  payableTotalAmount: number | null;
  payableShippingCost: number | null;
  payableGrandTotal: number | null;
  partial: boolean | null;
  items: BeQuotationItem[];
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
  payout?: BeSellerPayout | null;
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
  paymentStatus: BePaymentStatus;
  orderDate?: string | null;
  confirmDateTime?: string | null;
  orderStatus?: "PENDING" | "CONFIRMED" | "COMPLETED" | "CANCELLED" | null;
  itemCount?: number | null;
  artworks?: BeArtworkSummary[];
  items?: BePaymentItemLine[];
  paymentConfirmedAt?: string | null;
  autoDeliveryConfirmAt?: string | null;
  payouts?: BeSellerPayout[];
  payoutReadyCount?: number | null;
  payoutPaidCount?: number | null;
  payoutSellerCount?: number | null;
}

interface BePaymentItemLine {
  orderItemId: number;
  artworkId: number;
  artworkName: string;
  price: number | null;
  availabilityStatus: BeOrderItem["availabilityStatus"] | null;
  shippingStatus: BeOrderItem["shippingStatus"];
  sellerId?: number | null;
  sellerName?: string | null;
  shippingCost?: number | null;
  shippingCompanyName?: string | null;
  packingImage?: string | null;
  packedAt?: string | null;
  trackingNumber?: string | null;
  shippedAt?: string | null;
  deliveredAt?: string | null;
  deliveryConfirmedBy?: "BUYER" | "AUTO" | null;
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
  /** ข้อตกลงที่ผู้ซื้อระบุตอนยื่นคำขอ — ชื่อเดิมคือ agreement เฉยๆ ซึ่งชวนเข้าใจว่าเป็นตัวสัญญา */
  buyerAgreementDetail: string | null;
  /** คำตอบ/เหตุผลของผู้ขาย — null จนกว่าผู้ขายจะตอบ */
  sellerResponseDetail: string | null;
  documentFile: string | null;
  sellerSignature?: string | null;
  buyerSignature?: string | null;
  sellerSignedDate?: string | null;
  buyerSignedDate?: string | null;
  termsVersion?: string | null;
  /** ราคาที่ตกลงกัน ล็อกไว้ตอนยื่นคำขอ (ไม่ใช่ราคาลิขสิทธิ์ปัจจุบันของงาน) */
  copyrightPrice: number | null;
  artworks: BeArtworkSummary[] | null;
  /** null = ผู้ซื้อยังไม่เคยอัปสลิปค่าลิขสิทธิ์ */
  copyrightPaymentStatus?: BePaymentStatus | null;
  copyrightPaidAmount?: number | null;
  copyrightPaid?: boolean | null;
}

interface BeCopyrightPaymentPreview {
  copyrightId: number;
  artworkId: number | null;
  artworkName: string | null;
  sellerName: string | null;
  amount: number;
  copyrightTransferStatus: BeTransfer["transferStatus"];
  paymentStatus: BePaymentStatus | null;
  slipTransfer: string | null;
  canPay: boolean;
  reason: string | null;
}

interface BeCopyrightPayment {
  copyrightPaymentId: number;
  copyrightId: number;
  amount: number;
  paymentStatus: BePaymentStatus;
  paymentDate: string;
  slipTransfer: string | null;
  artworkId: number | null;
  artworkName: string | null;
  buyerName: string | null;
  buyerUserId: number | null;
  buyerEmail: string | null;
  buyerPhone: string | null;
  sellerName: string | null;
  sellerUserId: number | null;
  copyrightTransferStatus: BeTransfer["transferStatus"];
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
  bankAccount?: BeBankAccount | null;
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
    pickupAddress: a.pickupAddress ?? false,
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
    // addresses = รายการทั้งหมด, address = รายการแรกไว้ใช้เติมฟอร์มอัตโนมัติ
    // (คงไว้เพื่อไม่ให้หน้าที่อ้าง user.address อยู่เดิมพัง)
    addresses: (p.addresses ?? []).map(mapAddress),
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
    description: "",
    price: a.price,
    publishDate: "",
    artworkStatus: mapArtworkStatus(a),
    // artworkStatus ของหน้าเว็บรวมเรื่องเผยแพร่ไว้ด้วย (draft/published/sold)
    // จึงแยกสถานะการขายดิบไว้ต่างหาก ไม่งั้นงานที่ RESERVED จะดูเหมือนงานปกติทุกประการ
    salesStatus:
      a.artworkStatus === "SOLD"
        ? "sold"
        : a.artworkStatus === "RESERVED"
          ? "reserved"
          : "available",
    width: a.width ?? undefined,
    height: a.height ?? undefined,
    // ขายไปแล้ว = ซื้อลิขสิทธิ์ไม่ได้อีก (สัญญาเป็นการโอนแต่เพียงผู้เดียว ขายได้ครั้งเดียว)
    // ตรรกะเดียวกับ mapArtworkDetail เป๊ะ ๆ ไม่งั้นการ์ดกับหน้ารายละเอียดจะบอกคนละอย่าง
    copyrightAvailable: (a.copyrightPrice ?? 0) > 0 && !a.copyrightSold,
    copyrightSold: !!a.copyrightSold,
    copyrightPrice: a.copyrightPrice ?? undefined,
  };
}

function mapArtworkDetail(a: BeArtworkDetail): Artwork {
  return {
    ...mapArtworkSummary(a),
    artworkMediums: a.artworkMediums ?? "",
    artworkMaterial: a.artworkMaterial ?? "",
    width: a.width ?? undefined,
    length: a.length ?? undefined,
    height: a.height ?? undefined,
    weight: a.weight ?? undefined,
    shippingCompany: a.shippingCompany ?? undefined,
    shippingCompanyName: a.shippingCompanyName ?? undefined,
    shippingCostEstimate: a.shippingCostEstimate ?? undefined,
    description: a.description ?? "",
    publishDate: a.publishDate ?? "",
    // ขายไปแล้ว = ไม่ว่างขายอีก ไม่ว่าราคาจะยังค้างอยู่หรือไม่
    // (สัญญาเป็นการโอนแต่เพียงผู้เดียวตลอดอายุการคุ้มครอง — ขายได้ครั้งเดียว)
    copyrightAvailable: (a.copyrightPrice ?? 0) > 0 && !a.copyrightSold,
    copyrightSold: !!a.copyrightSold,
    copyrightPrice: a.copyrightPrice ?? undefined,
    // ไม่ระบุมา = โหมดอัตโนมัติ ซึ่งเป็นค่าเริ่มต้นของระบบ
    copyrightAutoPrice: a.copyrightAutoPrice ?? true,
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

function rollupShipping(all: BeOrderItem[]): ShippingStatus {
  // ชิ้นที่ผู้ขายแจ้งไม่พร้อมขายไม่มีวันถูกจัดส่ง ถ้านับรวมด้วย
  // คำสั่งซื้อที่ซื้อบางชิ้นจะไม่มีวันขึ้น "จัดส่งสำเร็จ" ทั้งที่ของที่จ่ายเงินถึงครบแล้ว
  const available = all.filter((i) => i.availabilityStatus === "AVAILABLE");
  const items = available.length > 0 ? available : all;
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

  // ยกเลิกก็ต่อเมื่อผู้ขายแจ้งไม่พร้อมจำหน่าย "ทุกชิ้น"
  // ถ้ามีบางชิ้นที่ยังพร้อมขาย ผู้ซื้อยังจ่ายเฉพาะชิ้นที่เหลือได้ ไม่ใช่คำสั่งซื้อที่ตายแล้ว
  if (items.length > 0 && items.every((i) => i.availabilityStatus === "UNAVAILABLE")) {
    return "cancelled";
  }

  const payment = mapPaymentStatus(o.paymentStatus);
  if (payment === "confirmed") {
    const shipping = rollupShipping(items);
    if (shipping === "delivered") return "delivered";
    if (shipping === "shipped" || shipping === "packed") return "shipped";
    return "paid";
  }
  if (payment === "submitted") return "payment_review";
  // สลิปถูกปฏิเสธต้องมีสถานะของตัวเอง ไม่ใช่ย้อนไปเป็น "รอชำระเงิน" เหมือนไม่เคยจ่าย
  if (payment === "rejected") return "payment_rejected";
  // จ่ายได้เมื่อผู้ขายตอบครบทุกชิ้นแล้ว และเหลืออย่างน้อยหนึ่งชิ้นที่พร้อมขาย
  if (canPayItems(items)) return "awaiting_payment";
  return "pending_availability";
}

/**
 * ผู้ขายตอบครบทุกชิ้นแล้วหรือยัง และยังมีของให้ซื้อไหม
 * ใช้ตัดสินทั้งสถานะคำสั่งซื้อและการเปิดปุ่มชำระเงิน จะได้ไม่เพี้ยนกันคนละที่
 */
function canPayItems(items: BeOrderItem[]): boolean {
  if (items.length === 0) return false;
  const allAnswered = items.every((i) => i.availabilityStatus !== "PENDING_CONFIRMATION");
  const hasPayable = items.some((i) => i.availabilityStatus === "AVAILABLE");
  return allAnswered && hasPayable;
}

/** ความพร้อมขาย "รายชิ้น" — คนละอย่างกับ rollupAvailability ที่รวมทั้งคำสั่งซื้อ */
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

/** หลักฐานการจัดส่งรายชิ้น ใช้ร่วมกันทั้งหน้าผู้ซื้อ/ผู้ขาย และหน้าผู้ดูแลระบบ */
function mapShippingEvidence(i: {
  shippingStatus: BeOrderItem["shippingStatus"];
  packingImage?: string | null;
  packedAt?: string | null;
  trackingNumber?: string | null;
  shippedAt?: string | null;
  deliveredAt?: string | null;
  deliveryConfirmedBy?: "BUYER" | "AUTO" | null;
}) {
  return {
    shippingStatus: SHIPPING_LINE_MAP[i.shippingStatus ?? ""] ?? ("not_shipped" as ShippingStatus),
    packingImage: i.packingImage ?? undefined,
    packedAt: i.packedAt ?? undefined,
    trackingNumber: i.trackingNumber ?? undefined,
    shippedAt: i.shippedAt ?? undefined,
    deliveredAt: i.deliveredAt ?? undefined,
    deliveryConfirmedBy:
      i.deliveryConfirmedBy === "BUYER"
        ? ("buyer" as const)
        : i.deliveryConfirmedBy === "AUTO"
          ? ("auto" as const)
          : undefined,
  };
}

function mapSellerPayout(p: BeSellerPayout): SellerPayout {
  return {
    sellerId: String(p.sellerId),
    sellerName: p.sellerName ?? "",
    sellerEmail: p.sellerEmail ?? undefined,
    sellerPhone: p.sellerPhone ?? undefined,
    amount: p.amount ?? 0,
    itemCount: p.itemCount ?? 0,
    deliveredCount: p.deliveredCount ?? 0,
    readyForPayout: !!p.readyForPayout,
    paid: !!p.paid,
    paidAt: p.paidAt ?? undefined,
    slipTransfer: p.slipTransfer ?? undefined,
    hasBankAccount: !!p.hasBankAccount,
    bankName: p.bankName ?? undefined,
    bankAccountNumber: p.bankAccountNumber ?? undefined,
    bankAccountName: p.bankAccountName ?? undefined,
    bankBookImage: p.bankBookImage ?? undefined,
  };
}

function mapOrderItem(i: BeOrderItem): OrderItem {
  return {
    id: String(i.orderItemId),
    artworkId: String(i.artworkId),
    artworkName: i.artworkName,
    artworkImage: imageOrPlaceholder(i.artworkImage, i.artworkId, i.artworkName),
    price: i.price,
    // sellerUserId เท่านั้น ไม่ใช่ sellerId — หน้าเว็บเทียบกับ user.id ของคนที่ login อยู่
    sellerId: i.sellerUserId != null ? String(i.sellerUserId) : undefined,
    sellerName: i.sellerName ?? undefined,
    availabilityStatus: AVAILABILITY_LINE_MAP[i.availabilityStatus] ?? "waiting",
    shippingCost: i.shippingCost ?? undefined,
    shippingCompanyName: i.shippingCompanyName ?? undefined,
    ...mapShippingEvidence(i),
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
    // fallback ไปที่ยอดเต็ม เผื่อ backend เวอร์ชันเก่าที่ยังไม่ส่ง field เหล่านี้มา
    payableTotalAmount: o.payableTotalAmount ?? o.totalAmount ?? 0,
    payableShippingCost: o.payableShippingCost ?? o.shippingCost ?? 0,
    payableGrandTotal: o.payableGrandTotal ?? o.grandTotal ?? 0,
    orderStatus: deriveOrderStatus(o),
    availabilityStatus: rollupAvailability(items),
    shippingStatus: rollupShipping(items),
    paymentStatus: mapPaymentStatus(o.paymentStatus),
    slipTransfer: o.slipTransfer ?? undefined,
    orderDate: o.orderDate,
    confirmDateTime: o.confirmDateTime ?? undefined,
    shippingAddress: o.shippingAddress ?? undefined,
    shippingProvince: o.shippingProvince ?? undefined,
    paymentConfirmedAt: o.paymentConfirmedAt ?? undefined,
    autoDeliveryConfirmAt: o.autoDeliveryConfirmAt ?? undefined,
    autoDeliveryConfirmDays: o.autoDeliveryConfirmDays ?? undefined,
    sellerPayout: o.sellerPayout ? mapSellerPayout(o.sellerPayout) : undefined,
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
    // รายการฝั่งผู้ขายไม่มียอดแยก payable — ผู้ขายเห็นเฉพาะงานของตัวเองอยู่แล้ว
    payableTotalAmount: totalAmount,
    payableShippingCost: 0,
    payableGrandTotal: totalAmount,
    orderStatus: deriveOrderStatus(o),
    availabilityStatus: rollupAvailability(items),
    shippingStatus: rollupShipping(items),
    paymentStatus: mapPaymentStatus(o.paymentStatus),
    orderDate: o.orderDate,
    confirmDateTime: undefined,
    sellerPayout: o.payout ? mapSellerPayout(o.payout) : undefined,
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
    status: mapPaymentStatus(p.paymentStatus),
    // ใช้วันที่สั่งซื้อจริงจาก backend ถ้ามี (เดิมยัด "เวลาปัจจุบัน" ทำให้เรียงตามเวลาไม่ได้)
    createdAt: p.orderDate ?? new Date().toISOString(),
    payoutReadyCount: p.payoutReadyCount ?? undefined,
    payoutPaidCount: p.payoutPaidCount ?? undefined,
    payoutSellerCount: p.payoutSellerCount ?? undefined,
  };
}

/* ---- ชนิดข้อมูลเฉพาะหน้า Admin (ข้อมูลเต็มกว่าที่หน้าอื่นต้องใช้) ---- */

export interface AdminPaymentDetail extends Payment {
  buyerEmail?: string;
  buyerPhone?: string;
  orderDate?: string;
  confirmDateTime?: string;
  orderStatusRaw?: string;
  paymentConfirmedAt?: string;
  autoDeliveryConfirmAt?: string;
  items: (Pick<
    OrderItem,
    | "packingImage"
    | "packedAt"
    | "trackingNumber"
    | "shippedAt"
    | "deliveredAt"
    | "deliveryConfirmedBy"
    | "shippingCompanyName"
  > & {
    id: string;
    artworkId: string;
    artworkName: string;
    price: number;
    availabilityStatus: AvailabilityStatus;
    shippingStatus: ShippingStatus;
    sellerId?: string;
    sellerName?: string;
    shippingCost?: number;
  })[];
  /** การโอนเงินต่อให้ผู้ขาย แยกรายผู้ขาย */
  payouts: SellerPayout[];
}

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
      sellerId: i.sellerId != null ? String(i.sellerId) : undefined,
      sellerName: i.sellerName ?? undefined,
      shippingCost: i.shippingCost ?? undefined,
      shippingCompanyName: i.shippingCompanyName ?? undefined,
      ...mapShippingEvidence(i),
    })),
    paymentConfirmedAt: p.paymentConfirmedAt ?? undefined,
    autoDeliveryConfirmAt: p.autoDeliveryConfirmAt ?? undefined,
    payouts: (p.payouts ?? []).map(mapSellerPayout),
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
    agreement: t.buyerAgreementDetail ?? "",
    responseDetail: t.sellerResponseDetail ?? undefined,
    documentFile: t.documentFile ?? undefined,
    transferStatus: TRANSFER_STATUS_MAP[t.transferStatus],
    transferDate: t.transferDate,
    sellerSignature: t.sellerSignature ?? undefined,
    buyerSignature: t.buyerSignature ?? undefined,
    sellerSignedDate: t.sellerSignedDate ?? undefined,
    buyerSignedDate: t.buyerSignedDate ?? undefined,
    termsVersion: t.termsVersion ?? undefined,
    paymentStatus: mapPaymentStatus(t.copyrightPaymentStatus),
    paidAmount: t.copyrightPaidAmount ?? undefined,
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
 * แต่ frontend มีช่อง login ช่องเดียว จึงต้องลองทีละอันที่นี่
 *
 * ตอนนี้ผู้ดูแลระบบอยู่ในตาราง users แล้ว (role = ADMIN) แต่ยังแยก endpoint ไว้
 * เพราะ /api/auth/login ปฏิเสธบัญชี ADMIN โดยตั้งใจ — เซสชันฝั่งแอดมิน
 * กับฝั่งผู้ซื้อเป็นคนละชนิดกันใน AuthContext และหน้าผู้ซื้อคาดหวังว่า
 * ต้องมี buyer record รองรับเสมอ ซึ่งบัญชีแอดมินไม่มี
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
    /*
     * /auth/login คืนแค่ "ผลการยืนยันตัวตน" (token + ตัวตนคร่าวๆ) ไม่ใช่โปรไฟล์
     * AuthResponse ไม่มี addresses, phoneNumber, nationalNo อยู่เลย
     *
     * ถ้าใช้ค่าจาก login เป็น user ของ session ตรงๆ หน้าที่อ่าน user.addresses
     * (เช่นหน้าแก้ไขโปรไฟล์) จะเห็นเป็นว่างทั้งที่ในฐานข้อมูลมีที่อยู่อยู่
     * แล้วจู่ๆ มาแสดงตอนผู้ใช้กด refresh หน้า เพราะตอนนั้น AuthContext เรียก getMe()
     *
     * จึงดึงโปรไฟล์เต็มจาก /users/me ต่อทันทีหลังได้ token
     * ให้ user ของ session มาจากแหล่งเดียวกันเสมอ ไม่ว่าจะเพิ่ง login หรือ refresh หน้า
     */
    const profile = await getMe();
    return { kind: "user", user: profile ?? mapAuthToUser(auth) };
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

export interface RegisterBuyerInput {
  username: string;
  password: string;
  email: string;
  fullName: string;
  phoneNumber: string;
  nationalNo: string;
  houseNo?: string;
  villageNo?: string;
  thoroughfare?: string;
  subDistrict: string;
  district: string;
  province: string;
  postalCode: string;
}

export async function registerBuyer(input: RegisterBuyerInput): Promise<User> {
  const auth = await request<BeAuth>("/auth/register", {
    method: "POST",
    auth: false,
    body: JSON.stringify({
      username: input.username,
      password: input.password,
      email: input.email,
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
    bankAccount: BankAccountInput;
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
      bankAccount: input.bankAccount,
    }),
  });
  // role เปลี่ยนเป็น SELLER แล้ว token เดิมยังถือ role BUYER อยู่ → ต้องเปลี่ยนเป็นตัวใหม่
  setToken(auth.token);
  return mapAuthToUser(auth);
}

/* --------------------------- บัญชีรับเงินผู้ขาย --------------------------- */

/** บัญชีรับเงินของผู้ขายที่ login อยู่ — undefined ถ้ายังไม่ได้ตั้ง */
export async function getMyBankAccount(): Promise<BankAccount | undefined> {
  const b = await request<BeBankAccount | null>("/seller/bank-account");
  return mapBankAccount(b);
}

export async function updateMyBankAccount(input: BankAccountInput): Promise<BankAccount> {
  const b = await request<BeBankAccount>("/seller/bank-account", {
    method: "PUT",
    body: JSON.stringify({ ...input, bankBookImage: input.bankBookImage || undefined }),
  });
  return mapBankAccount(b)!;
}

export async function getUser(userId: string): Promise<User | undefined> {
  try {
    const p = await request<BeProfile>(`/users/${userId}`);
    return mapProfile(p);
  } catch {
    return undefined;
  }
}

/**
 * โปรไฟล์สาธารณะของผู้ใช้คนอื่น (ยูสเคส 3.1.6 View Profile)
 *
 * backend ซ่อนอีเมล/เบอร์โทรให้เองเมื่อไม่ใช่เจ้าของโปรไฟล์ และส่งเฉพาะผลงานที่เผยแพร่แล้ว
 * จึงเรียก endpoint เดียวกับ getUser ได้เลย ไม่ต้องมีตัวกรองเพิ่มฝั่งหน้าเว็บ
 */
export async function getPublicProfile(
  userId: string
): Promise<{ user: User; artworks: Artwork[] } | undefined> {
  const p = await requestOr<BeProfile | null>(`/users/${userId}`, null);
  if (!p) return undefined;
  return {
    user: mapProfile(p),
    artworks: (p.artworks ?? []).map(mapArtworkSummary),
  };
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
    Pick<
      User,
      "username" | "fullName" | "email" | "phoneNumber" | "nationalNo" | "profileImage"
    >
  >
): Promise<User> {
  const p = await request<BeProfile>("/users/me", {
    method: "PUT",
    body: JSON.stringify(patch),
  });

  /*
   * เปลี่ยนชื่อผู้ใช้แล้ว token ใบเดิมใช้ไม่ได้ เพราะ JWT เก็บ username ไว้ใน subject
   * และชื่อเดิมไม่มีอยู่ในฐานข้อมูลอีกแล้ว — request ถัดไปจะล้มทันที
   * เหมือนถูกเตะออกจากระบบทั้งที่ผู้ใช้แค่กดบันทึกโปรไฟล์
   *
   * backend จึงส่ง token ใบใหม่มาด้วยเฉพาะกรณีนี้ สลับไปใช้ทันทีก่อนคืนค่า
   * เพื่อให้ refresh() หรือ request ตัวถัดไปใช้ใบที่ถูกต้อง
   */
  if (p.token) setToken(p.token);

  return mapProfile(p);
}

/* ------------------------------ สมุดที่อยู่ ------------------------------ */

/**
 * backend ใช้ชื่อ subdistrict (ตัวเล็กติดกัน) ส่วน frontend ใช้ subDistrict
 * แปลงชื่อไว้ที่เดียวตรงนี้ ถ้าไปแปลงกระจายตามหน้า พลาดที่ไหนที่อยู่จะหายเงียบๆ
 */
function toAddressBody(a: Omit<Address, "id">) {
  return {
    houseNo: a.houseNo ?? "",
    villageNo: a.villageNo ?? "",
    thoroughfare: a.thoroughfare ?? "",
    subdistrict: a.subDistrict,
    district: a.district,
    province: a.province,
    postalCode: a.postalCode,
  };
}

/** ทุก endpoint ของสมุดที่อยู่คืนโปรไฟล์ฉบับล่าสุด จึงอัปเดตรายการได้ในครั้งเดียว */
export async function addAddress(address: Omit<Address, "id">): Promise<User> {
  const p = await request<BeProfile>("/users/me/addresses", {
    method: "POST",
    body: JSON.stringify(toAddressBody(address)),
  });
  return mapProfile(p);
}

/**
 * ตั้งที่อยู่นี้เป็นที่อยู่ต้นทางส่งของ — จังหวัดของมันเป็นตัวคิดค่าจัดส่ง
 * ผู้ขายมีได้รายการเดียว ตั้งใหม่แล้วของเดิมถูกยกเลิกให้อัตโนมัติ
 */
export async function setPickupAddress(addressId: string): Promise<User> {
  const p = await request<BeProfile>(`/users/me/addresses/${addressId}/pickup`, {
    method: "PATCH",
  });
  return mapProfile(p);
}

export async function updateAddress(
  addressId: string,
  address: Omit<Address, "id">
): Promise<User> {
  const p = await request<BeProfile>(`/users/me/addresses/${addressId}`, {
    method: "PUT",
    body: JSON.stringify(toAddressBody(address)),
  });
  return mapProfile(p);
}

export async function deleteAddress(addressId: string): Promise<User> {
  const p = await request<BeProfile>(`/users/me/addresses/${addressId}`, {
    method: "DELETE",
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
  /** บัญชีรับเงินของผู้ขาย (หน้านี้เป็นของแอดมินเท่านั้น) */
  bankAccount?: BankAccount;
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
      bankAccount: mapBankAccount(u.bankAccount),
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

export type ArtworkSort =
  | "newest"
  | "price_asc"
  | "price_desc"
  | "name"
  | "copyright_asc"
  | "copyright_desc";

/**
 * สิ่งที่ผู้ขายเปิดขายของงานชิ้นนั้น
 *   all            = ไม่กรอง
 *   with_copyright = ซื้อลิขสิทธิ์ได้ด้วย
 *   original_only  = ขายแต่ตัวชิ้นงาน
 */
export type ArtworkOffer = "all" | "with_copyright" | "original_only";

export interface ArtworkSearchParams {
  q?: string;
  artworkType?: string;
  artworkStyle?: string;
  artworkMediums?: string;
  minPrice?: number;
  maxPrice?: number;
  minSize?: number;
  maxSize?: number;
  offer?: ArtworkOffer;
  /** ช่วงราคาลิขสิทธิ์ — ใช้แทน minPrice/maxPrice เมื่อผู้ใช้สลับฐานราคา */
  minCopyrightPrice?: number;
  maxCopyrightPrice?: number;
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
      // backend ใช้ UPPER_SNAKE กับค่านี้ ส่วน URL ของหน้าเว็บใช้ตัวพิมพ์เล็กให้อ่านง่าย
      offer: params.offer && params.offer !== "all" ? params.offer.toUpperCase() : undefined,
      minCopyrightPrice: params.minCopyrightPrice,
      maxCopyrightPrice: params.maxCopyrightPrice,
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
  /** ขอบสไลเดอร์เมื่อสลับไปกรองด้วยราคาลิขสิทธิ์ — null = ยังไม่มีงานที่ขายลิขสิทธิ์ */
  minCopyrightPrice: number | null;
  maxCopyrightPrice: number | null;
  /** จำนวนงานของตัวกรอง "สิ่งที่ขาย" */
  withCopyrightCount: number;
  originalOnlyCount: number;
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
    minCopyrightPrice: null,
    maxCopyrightPrice: null,
    withCopyrightCount: 0,
    originalOnlyCount: 0,
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
      // width บังคับกรอกฝั่ง backend (@NotNull @Positive) เพราะเป็นทั้งตัวคำนวณค่าส่ง
      // และตัวกรอง "ช่วงขนาด" ในหน้าค้นหา — เดิมมีคอลัมน์ artworkSize แยกไว้ทำหน้าที่หลัง
      // แล้วโค้ดตรงนี้ต้องคอยเซ็ตให้เท่ากับ width ตลอด ตอนนี้ตัดออกแล้ว
      width: input.width ?? null,
      height: input.height ?? null,
      length: input.length ?? null,
      weight: input.weight ?? null,
      shippingCompany: input.shippingCompany ?? null,
      description: input.description,
      price: input.price,
      publishDate: new Date().toISOString().slice(0, 10),
      // ราคาลิขสิทธิ์ให้ backend เป็นคนคิด ฝั่งนี้ส่งแค่ "เปิดไหม" กับ "คิดเองไหม"
      copyrightAvailable: input.copyrightAvailable,
      copyrightAutoPrice: input.copyrightAutoPrice ?? true,
      copyrightPrice: input.copyrightAutoPrice === false ? input.copyrightPrice ?? null : null,
    }),
  });
  return mapArtworkDetail(a);
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
  if (patch.width !== undefined) body.width = patch.width;
  if (patch.height !== undefined) body.height = patch.height;
  if (patch.length !== undefined) body.length = patch.length;
  if (patch.weight !== undefined) body.weight = patch.weight;
  if (patch.shippingCompany !== undefined) body.shippingCompany = patch.shippingCompany;
  if (patch.description !== undefined) body.description = patch.description;
  if (patch.price !== undefined) body.price = patch.price;
  /*
   * ต้องส่ง copyrightAvailable ไปด้วยเสมอเมื่อฟอร์มมีค่านี้
   * ของเดิมส่งแต่ copyrightPrice ทำให้ติ๊กปิด "เปิดให้ซื้อลิขสิทธิ์" แล้วไม่มีผลอะไรเลย
   * เพราะ backend ไม่มีทางรู้ว่าต้องเซ็ตราคากลับเป็น null
   */
  if (patch.copyrightAvailable !== undefined) {
    body.copyrightAvailable = patch.copyrightAvailable;
  }
  if (patch.copyrightAutoPrice !== undefined) {
    body.copyrightAutoPrice = patch.copyrightAutoPrice;
  }
  // ส่งราคาที่กรอกเองเฉพาะตอนปิดโหมดอัตโนมัติ ไม่งั้น backend คิดเองอยู่แล้ว
  if (patch.copyrightAutoPrice === false && patch.copyrightPrice !== undefined) {
    body.copyrightPrice = patch.copyrightPrice;
  }

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

/** ถอนงานที่เผยแพร่แล้วกลับไปเป็นฉบับร่าง (ทำได้เฉพาะงานที่ยังไม่มีคนสั่งซื้อ) */
export async function unpublishArtwork(id: string): Promise<Artwork> {
  const a = await request<BeArtworkDetail>(`/artworks/${id}/unpublish`, {
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

/**
 * ยืนยันคำสั่งซื้อ ต้องระบุที่อยู่ปลายทางเสมอ
 * เพราะค่าจัดส่งคำนวณจากจังหวัดปลายทาง (ดู ShippingRateService ฝั่ง backend)
 */
export async function confirmOrder(
  _buyer: User,
  addressId: string,
  cartItemIds?: string[]
): Promise<Order[]> {
  const o = await request<BeOrder>("/cart/confirm", {
    method: "POST",
    body: JSON.stringify({
      addressId: Number(addressId),
      /*
       * ส่งเสมอเมื่อผู้เรียกระบุมา ไม่ปล่อยเป็น undefined
       *
       * backend ตีความ "ไม่ส่งมา" ว่าสั่งทั้งตะกร้า ซึ่งเป็น default ที่อันตราย
       * ถ้า field นี้หายไประหว่างทางด้วยเหตุใดก็ตาม ระบบจะสั่งซื้อทุกชิ้นเงียบๆ
       * แทนที่จะฟ้อง — เป็นความผิดพลาดที่ผู้ซื้อเสียเงินจริง
       */
      cartItemIds: cartItemIds?.length ? cartItemIds.map(Number) : undefined,
    }),
  });
  return [mapOrder(o)];
}

/**
 * ประเมินค่าจัดส่งของขนส่งทุกเจ้าจากน้ำหนักและขนาด
 * ใช้ในหน้าเพิ่ม/แก้ไขงานศิลปะ ให้ผู้ขายเทียบราคาก่อนเลือก
 */
export async function getShippingQuotes(dims: {
  weight?: number;
  width?: number;
  length?: number;
  height?: number;
}): Promise<ShippingOption[]> {
  const params = new URLSearchParams();
  for (const [k, v] of Object.entries(dims)) {
    if (v != null && Number.isFinite(v) && v > 0) params.set(k, String(v));
  }
  const res = await requestOr<{ options: ShippingOption[] } | null>(
    `/shipping/quote?${params.toString()}`,
    null
  );
  return res?.options ?? [];
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
 * ใบเสนอราคาของคำสั่งซื้อ (ยูสเคส 3.1.14)
 *
 * backend เปิดให้เฉพาะ "ผู้ซื้อของคำสั่งซื้อนั้น" เรียกได้ — ผู้ขาย/แอดมินจะได้ error
 * ซึ่งตรงกับหน้าเว็บที่ซ่อนปุ่มใบเสนอราคาไว้จากคนอื่นอยู่แล้ว
 */
export async function getQuotation(orderId: string): Promise<Quotation | undefined> {
  try {
    const q = await request<BeQuotation>(`/orders/${orderId}/quotation`);
    const items = q.items ?? [];
    const totalAmount = q.totalAmount ?? 0;
    const shippingCost = q.shippingCost ?? 0;
    return {
      orderId: String(q.orderId),
      issuedAt: q.dateTimeNow,
      orderDate: q.orderDate ?? q.dateTimeNow,
      confirmDateTime: q.confirmDateTime ?? undefined,
      sellerName: q.sellerName ?? "",
      sellerAddress: q.sellerAddress ?? undefined,
      sellerTel: q.sellerTel ?? undefined,
      sellerEmail: q.sellerEmail ?? undefined,
      buyerName: q.buyerName ?? "",
      buyerAddress: q.buyerAddress ?? undefined,
      buyerTel: q.buyerTel ?? undefined,
      buyerEmail: q.buyerEmail ?? undefined,
      buyerTaxId: q.buyerTaxId ?? undefined,
      shippingAddress: q.shippingAddress ?? undefined,
      totalAmount,
      shippingCost,
      grandTotal: q.grandTotal ?? totalAmount + shippingCost,
      // fallback ไปยอดเต็ม เผื่อ backend เวอร์ชันเก่าที่ยังไม่ส่ง field ยอด payable
      payableTotalAmount: q.payableTotalAmount ?? totalAmount,
      payableShippingCost: q.payableShippingCost ?? shippingCost,
      payableGrandTotal: q.payableGrandTotal ?? totalAmount + shippingCost,
      partial: !!q.partial,
      items: items.map((i, index) => ({
        no: i.no ?? index + 1,
        artworkName: i.artworkName ?? "",
        sellerName: i.sellerName ?? undefined,
        quantity: i.quantity ?? 1,
        price: i.price ?? 0,
        amount: i.amount ?? (i.price ?? 0) * (i.quantity ?? 1),
        shippingCost: i.shippingCost ?? 0,
        shippingCompanyName: i.shippingCompanyName ?? undefined,
        availabilityStatus:
          AVAILABILITY_LINE_MAP[i.availabilityStatus ?? "PENDING_CONFIRMATION"] ?? "waiting",
      })),
    };
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
/**
 * ตอบความพร้อมขายแยกทีละชิ้น
 *
 * @param answers  orderItemId -> พร้อมขายไหม
 *                 ส่งเฉพาะชิ้นที่ยังรอตอบอยู่ ชิ้นที่ตอบไปแล้ว backend ปฏิเสธ
 *
 * backend มี endpoint รายชิ้นอยู่แล้ว (PATCH /seller/order-items/{id}/availability)
 * ของเดิมฝั่งนี้บังคับตอบเหมือนกันทุกชิ้น ทำให้ผู้ขายที่มีงานหลายชิ้นในคำสั่งซื้อเดียว
 * แยกไม่ได้ว่าชิ้นไหนพร้อมชิ้นไหนไม่พร้อม
 */
export async function confirmAvailability(
  orderId: string,
  answers: Record<string, boolean>
): Promise<Order> {
  const orders = await requestOr<BeSellerOrder[]>("/seller/orders", []);
  const target = orders.find((o) => String(o.orderId) === String(orderId));
  if (!target) throw new ApiError("ไม่พบรายการคำสั่งซื้อนี้");

  const pendingItems = target.items.filter(
    (i) => i.availabilityStatus === "PENDING_CONFIRMATION"
  );
  if (pendingItems.length === 0) throw new ApiError("รายการนี้ถูกยืนยันไปแล้ว");

  // ตอบเฉพาะชิ้นที่ผู้ขายเลือกไว้จริง ชิ้นที่ไม่ได้เลือกยังรอตอบต่อไป
  const toAnswer = pendingItems.filter((i) => answers[String(i.orderItemId)] !== undefined);
  if (toAnswer.length === 0) throw new ApiError("กรุณาเลือกผลงานที่ต้องการตอบอย่างน้อย 1 ชิ้น");

  for (const item of toAnswer) {
    await request<unknown>(`/seller/order-items/${item.orderItemId}/availability`, {
      method: "PATCH",
      body: JSON.stringify({ available: answers[String(item.orderItemId)] }),
    });
  }

  const refreshed = await requestOr<BeSellerOrder[]>("/seller/orders", []);
  const updated = refreshed.find((o) => String(o.orderId) === String(orderId));
  return updated ? mapSellerOrder(updated, "") : mapSellerOrder(target, "");
}

/**
 * ผู้ขายอัปเดตการจัดส่ง "ทีละชิ้น" พร้อมหลักฐาน
 *
 *   packed  → ต้องแนบรูปสินค้าที่แพ็คแล้ว (ครั้งแรก — ส่งซ้ำโดยไม่แนบ = ใช้รูปเดิม)
 *   shipped → ต้องกรอกรหัสพัสดุของขนส่ง
 *   delivered ผู้ขายตั้งเองไม่ได้ ผู้ซื้อเป็นคนยืนยัน (ดู confirmItemDelivered)
 *
 * เดิมอัปเดตทั้งคำสั่งซื้อทีเดียวด้วยสถานะเดียว ซึ่งใส่หลักฐานแยกรายชิ้นไม่ได้
 * และทำให้ผู้ขายกด "จัดส่งสำเร็จ" แทนผู้ซื้อได้เอง
 */
export async function updateItemShipping(
  orderItemId: string,
  status: "packed" | "shipped",
  evidence: { packingImage?: string; trackingNumber?: string }
): Promise<void> {
  await request<unknown>(`/seller/order-items/${orderItemId}/shipping`, {
    method: "PATCH",
    body: JSON.stringify({
      shippingStatus: status === "packed" ? "PREPARING" : "SHIPPED",
      packingImage: evidence.packingImage || undefined,
      trackingNumber: evidence.trackingNumber || undefined,
    }),
  });
}

/** ผู้ซื้อยืนยันว่าได้รับสินค้าชิ้นนี้แล้ว (จัดส่งแล้ว → จัดส่งสำเร็จ) */
export async function confirmItemDelivered(orderId: string, orderItemId: string): Promise<Order> {
  const o = await request<BeOrder>(`/orders/${orderId}/items/${orderItemId}/delivered`, {
    method: "PATCH",
  });
  return mapOrder(o);
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

/**
 * ผู้ดูแลระบบบันทึกการโอนเงินให้ผู้ขาย พร้อมแนบสลิป
 * ยอดเงินคำนวณที่ backend — หน้าเว็บไม่ได้ส่งตัวเลขไป
 */
export async function createSellerPayout(
  orderId: string,
  sellerId: string,
  slipTransfer: string
): Promise<AdminPaymentDetail> {
  const p = await request<BePayment>(`/admin/orders/${orderId}/payouts`, {
    method: "POST",
    body: JSON.stringify({ sellerId: Number(sellerId), slipTransfer }),
  });
  return mapPaymentDetail(p);
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
      buyerAgreementDetail: input.agreement,
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
  responseDetail: string,
  /** ลายมือชื่อผู้โอน — จำเป็นเมื่อตอบรับ (backend บังคับกฎเดียวกัน) */
  signature?: string
): Promise<CopyrightTransfer> {
  const t = await request<BeTransfer>(`/copyright-transfers/${id}/respond`, {
    method: "PATCH",
    body: JSON.stringify({ approved: accept, detail: responseDetail, signature }),
  });
  return mapTransfer(t);
}

export async function signCopyrightTransfer(
  id: string,
  /** ลายมือชื่อผู้รับโอน — สิ่งที่บังคับ */
  signature: string,
  /** ไฟล์เอกสารที่เซ็นกระดาษแล้ว — ไม่บังคับ แนบเพิ่มเป็นหลักฐานได้ */
  documentFile?: string
): Promise<CopyrightTransfer> {
  const t = await request<BeTransfer>(`/copyright-transfers/${id}/sign`, {
    method: "PATCH",
    body: JSON.stringify({ signature, documentFile }),
  });
  return mapTransfer(t);
}

/* ----------------------- Copyright Payment (ผู้ซื้อ) ---------------------- */

function mapCopyrightPaymentPreview(p: BeCopyrightPaymentPreview): CopyrightPaymentPreview {
  return {
    copyrightId: String(p.copyrightId),
    artworkId: String(p.artworkId ?? ""),
    artworkName: p.artworkName ?? "",
    sellerName: p.sellerName ?? "",
    amount: p.amount ?? 0,
    transferStatus: TRANSFER_STATUS_MAP[p.copyrightTransferStatus],
    paymentStatus: mapPaymentStatus(p.paymentStatus),
    slipTransfer: p.slipTransfer ?? undefined,
    canPay: !!p.canPay,
    reason: p.reason ?? undefined,
  };
}

function mapCopyrightPayment(p: BeCopyrightPayment): CopyrightPayment {
  return {
    id: String(p.copyrightPaymentId),
    copyrightId: String(p.copyrightId),
    amount: p.amount ?? 0,
    status: mapPaymentStatus(p.paymentStatus),
    paymentDate: p.paymentDate,
    slipTransfer: p.slipTransfer ?? undefined,
    artworkId: String(p.artworkId ?? ""),
    artworkName: p.artworkName ?? "",
    buyerName: p.buyerName ?? "",
    buyerEmail: p.buyerEmail ?? undefined,
    buyerPhone: p.buyerPhone ?? undefined,
    sellerName: p.sellerName ?? "",
    transferStatus: TRANSFER_STATUS_MAP[p.copyrightTransferStatus],
  };
}

export async function getCopyrightPaymentPreview(
  copyrightId: string
): Promise<CopyrightPaymentPreview> {
  const p = await request<BeCopyrightPaymentPreview>(
    `/copyright-transfers/${copyrightId}/payment`
  );
  return mapCopyrightPaymentPreview(p);
}

export async function payCopyrightTransfer(
  copyrightId: string,
  slipTransfer: string
): Promise<CopyrightPayment> {
  const p = await request<BeCopyrightPayment>(`/copyright-transfers/${copyrightId}/payment`, {
    method: "POST",
    body: JSON.stringify({ slipTransfer }),
  });
  return mapCopyrightPayment(p);
}

/* ---------------------- Copyright Payment (ผู้ดูแลระบบ) --------------------- */

export async function listCopyrightPayments(): Promise<CopyrightPayment[]> {
  const list = await requestOr<BeCopyrightPayment[]>("/admin/copyright-payments", []);
  return list.map(mapCopyrightPayment);
}

export async function getCopyrightPayment(id: string): Promise<CopyrightPayment | undefined> {
  try {
    const p = await request<BeCopyrightPayment>(`/admin/copyright-payments/${id}`);
    return mapCopyrightPayment(p);
  } catch {
    return undefined;
  }
}

export async function confirmCopyrightPayment(
  id: string,
  approved: boolean
): Promise<CopyrightPayment> {
  const p = await request<BeCopyrightPayment>(`/admin/copyright-payments/${id}/confirm`, {
    method: "PATCH",
    body: JSON.stringify({ approved }),
  });
  return mapCopyrightPayment(p);
}
