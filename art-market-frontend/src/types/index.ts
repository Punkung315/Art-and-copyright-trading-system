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
  /**
   * true = ที่อยู่ต้นทางส่งของ (ผู้ขายมีได้รายการเดียว)
   * จังหวัดของที่อยู่นี้เป็นตัวคิดค่าจัดส่ง ผู้ขายต้องตั้งก่อนถึงจะเผยแพร่ผลงานได้
   */
  pickupAddress?: boolean;
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
  /** ที่อยู่รายการแรก — ใช้เติมฟอร์มอัตโนมัติ (ผู้ใช้มีที่อยู่ได้หลายรายการ ดู addresses) */
  address?: Address;
  /** ที่อยู่ทั้งหมดของผู้ใช้ */
  addresses?: Address[];
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

/**
 * สถานะการขายของชิ้นงาน แยกจาก ArtworkStatus ที่รวมเรื่องการเผยแพร่ไว้ด้วย
 * "reserved" = อยู่ในคำสั่งซื้อของใครบางคนแล้ว แต่ยังไม่ปิดการขาย
 */
export type ArtworkSalesStatus = "available" | "reserved" | "sold";

/** ขนส่งที่ระบบรองรับ ต้องตรงกับ enum ShippingCompany ฝั่ง backend */
export type ShippingCompanyCode = "FLASH" | "KERRY" | "THAILAND_POST" | "JT";

/** ราคาประเมินของขนส่งหนึ่งเจ้า สำหรับชิ้นงานขนาด/น้ำหนักหนึ่งๆ */
export interface ShippingOption {
  company: ShippingCompanyCode;
  companyName: string;
  cost: number;
  rateVersion: string;
  billableWeightKg: number;
  dimensionSumCm: number;
  /** false = ชิ้นงานเกินพิกัดที่ขนส่งเจ้านี้รับได้ */
  available: boolean;
  note?: string | null;
}

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
  /**
   * มิติจริงของชิ้นงาน หน่วยเซนติเมตร แยกตามคอลัมน์ใน DB
   * หน้าชิ้นงานที่ผู้ใช้เรียกว่า "กว้าง x ยาว" คือ width x height
   * ส่วน length คือความหนา/ความลึก (ตาม SRS: Size = Height x Width x Depth)
   */
  width?: number;
  length?: number;
  height?: number;
  /** น้ำหนักพร้อมแพ็ค หน่วยกิโลกรัม ใช้คำนวณค่าจัดส่ง */
  weight?: number;
  /** ขนส่งที่ผู้ขายเลือก — ผู้ขายเลือกได้เจ้าเดียวต่อชิ้นงาน */
  shippingCompany?: ShippingCompanyCode;
  shippingCompanyName?: string;
  /**
   * ค่าจัดส่ง "ประเมิน" ที่ระบบคำนวณจากน้ำหนัก/ขนาด/ขนส่ง
   * ค่าจริงคิดอีกครั้งตอนยืนยันคำสั่งซื้อเมื่อรู้จังหวัดปลายทาง
   */
  shippingCost?: number;
  description: string;
  price: number;
  publishDate: string;
  artworkStatus: ArtworkStatus;
  /** สถานะการขายดิบจาก backend — ใช้ตัดสินว่าถอนงานออกจากการเผยแพร่ได้ไหม */
  salesStatus?: ArtworkSalesStatus;
  copyrightAvailable: boolean;
  copyrightPrice?: number;
  /** true = ราคาลิขสิทธิ์มาจากการคำนวณอัตโนมัติ (ราคาขาย x 3) ไม่ใช่ผู้ขายกรอกเอง */
  copyrightAutoPrice?: boolean;
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
  /** ผู้ดูแลระบบตรวจสลิปแล้วปฏิเสธ — ผู้ซื้อต้องอัปโหลดใหม่ */
  | "payment_rejected"
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
  /** ผู้ขายของชิ้นนี้ (userId) — คำสั่งซื้อใบเดียวมีงานจากหลายผู้ขายได้ */
  sellerId?: string;
  sellerName?: string;
  /** ความพร้อมขายรายชิ้น ผู้ขายแต่ละคนยืนยันเฉพาะงานของตัวเอง */
  availabilityStatus?: AvailabilityStatus;
  /** ค่าจัดส่งของชิ้นนี้ ล็อกไว้ตอนยืนยันคำสั่งซื้อ */
  shippingCost?: number;
  shippingCompanyName?: string;
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
  /**
   * ยอดที่ต้องจ่ายจริง — นับเฉพาะชิ้นที่ผู้ขายยืนยันว่าพร้อมขาย
   * ต่างจาก grandTotal เมื่อมีผู้ขายบางรายแจ้งไม่พร้อมจำหน่าย
   */
  payableTotalAmount: number;
  payableShippingCost: number;
  payableGrandTotal: number;
  orderStatus: OrderStatus;
  availabilityStatus: AvailabilityStatus;
  shippingStatus: ShippingStatus;
  paymentStatus: PaymentStatus;
  slipTransfer?: string; // data URL
  orderDate: string;
  confirmDateTime?: string;
  /** ที่อยู่ปลายทางแบบบรรทัดเดียว บันทึกเป็นสำเนาตอนยืนยันคำสั่งซื้อ */
  shippingAddress?: string;
  /** จังหวัดปลายทาง — เป็นตัวกำหนดโซนค่าจัดส่ง */
  shippingProvince?: string;
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

  /**
   * สถานะการชำระค่าลิขสิทธิ์ — "unpaid" = ยังไม่เคยอัปสลิป
   *
   * ต้องรู้ตรงนี้เพราะหน้าสัญญาเป็นที่เดียวที่ผู้ซื้อเห็นว่าต้องทำอะไรต่อ
   * ถ้าไม่มี ปุ่มลงนามจะโผล่ตั้งแต่ผู้ขายตอบรับ แล้วกดแล้วเจอ error เฉยๆ
   */
  paymentStatus: PaymentStatus;
  /** ยอดที่ล็อกไว้ตอนจ่าย — undefined ถ้ายังไม่เคยจ่าย (ใช้ price แทน) */
  paidAmount?: number;
}

/** ยอดและสถานะสำหรับหน้าชำระค่าลิขสิทธิ์ของผู้ซื้อ */
export interface CopyrightPaymentPreview {
  copyrightId: string;
  artworkId: string;
  artworkName: string;
  sellerName: string;
  amount: number;
  transferStatus: TransferStatus;
  paymentStatus: PaymentStatus;
  slipTransfer?: string;
  /** backend เป็นเจ้าของกฎว่าจ่ายได้ตอนไหน — หน้าเว็บแค่แสดงตาม */
  canPay: boolean;
  reason?: string;
}

/** รายการชำระค่าลิขสิทธิ์ในหน้าตรวจสลิปของแอดมิน */
export interface CopyrightPayment {
  id: string;
  copyrightId: string;
  amount: number;
  status: PaymentStatus;
  paymentDate: string;
  slipTransfer?: string;
  artworkId: string;
  artworkName: string;
  buyerName: string;
  buyerEmail?: string;
  buyerPhone?: string;
  sellerName: string;
  transferStatus: TransferStatus;
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
