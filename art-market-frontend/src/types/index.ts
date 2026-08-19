// Domain types derived from the SRS class diagram (ระบบซื้อขายงานศิลปะ v4.0)

export type SellerStatus = "none" | "pending" | "approved" | "rejected";

export interface Address {
  id: string;
  houseNo: string;
  villageNo?: string;
  thoroughfare?: string;
  subDistrict: string;
  district: string;
  province: string;
  postalCode: string;
}

export interface User {
  id: string;
  username: string;
  password: string; // demo only – never do this in a real backend
  email: string;
  fullName?: string;
  phoneNumber?: string;
  nationalNo?: string;
  profileImage?: string; // data URL for demo
  address?: Address;
  roles: Array<"buyer" | "seller">;
  sellerStatus: SellerStatus;
  createdAt: string;
}

export interface Admin {
  id: string;
  username: string;
  password: string;
}

export type ArtworkStatus = "draft" | "published" | "sold";

export interface Artwork {
  id: string;
  sellerId: string;
  sellerName: string;
  artworkName: string;
  artworkImage: string;
  artworkType: string;
  artworkStyle: string;
  artworkMediums: string;
  artworkMaterial: string;
  artworkSize: string;
  description: string;
  price: number;
  publishDate: string;
  artworkStatus: ArtworkStatus;
  copyrightAvailable: boolean;
  copyrightPrice?: number;
}

export interface CartItem {
  id: string;
  artworkId: string;
  addDate: string;
  priceAtAdd: number;
}

export type OrderStatus =
  | "pending_availability"
  | "awaiting_payment"
  | "payment_review"
  | "paid"
  | "shipped"
  | "delivered"
  | "cancelled";

export type AvailabilityStatus = "waiting" | "confirmed" | "rejected";
export type ShippingStatus = "not_shipped" | "packed" | "shipped" | "delivered";
export type PaymentStatus = "unpaid" | "submitted" | "confirmed" | "rejected";

export interface OrderItem {
  id: string;
  artworkId: string;
  artworkName: string;
  artworkImage: string;
  price: number;
}

export interface Order {
  id: string;
  buyerId: string;
  buyerName: string;
  sellerId: string;
  sellerName: string;
  items: OrderItem[];
  totalAmount: number;
  shippingCost: number;
  grandTotal: number;
  orderStatus: OrderStatus;
  availabilityStatus: AvailabilityStatus;
  shippingStatus: ShippingStatus;
  paymentStatus: PaymentStatus;
  slipTransfer?: string; // data URL
  orderDate: string;
  confirmDateTime?: string;
}

export type TransferStatus =
  | "requested"
  | "accepted"
  | "rejected"
  | "signed"
  | "completed";

export interface CopyrightTransfer {
  id: string;
  artworkId: string;
  artworkName: string;
  artworkImage: string;
  buyerId: string;
  buyerName: string;
  sellerId: string;
  sellerName: string;
  price: number;
  fullName: string;
  nationalNo: string;
  address: Address;
  agreement: string;
  responseDetail?: string;
  documentFile?: string; // data URL of uploaded signed contract
  transferStatus: TransferStatus;
  transferDate: string;
}

export interface Payment {
  id: string;
  orderId: string;
  buyerId: string;
  buyerName: string;
  sellerId: string;
  sellerName: string;
  totalPrice: number;
  shippingCost: number;
  grandTotal: number;
  slipTransfer?: string;
  status: PaymentStatus;
  createdAt: string;
}
