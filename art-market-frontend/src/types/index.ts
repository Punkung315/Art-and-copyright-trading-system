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
   *
   * ชื่อมี Estimate ต่อท้ายเพื่อไม่ให้สับสนกับ OrderItem.shippingCost
   * ซึ่งเป็นยอดที่คิดเงินจริงและห้ามเปลี่ยนย้อนหลัง
   */
  shippingCostEstimate?: number;
  description: string;
  price: number;
  publishDate: string;
  artworkStatus: ArtworkStatus;
  /** สถานะการขายดิบจาก backend — ใช้ตัดสินว่าถอนงานออกจากการเผยแพร่ได้ไหม */
  salesStatus?: ArtworkSalesStatus;
  copyrightAvailable: boolean;
  /** ลิขสิทธิ์ถูกโอนให้ผู้อื่นไปแล้ว — คนละความหมายกับ "ผู้ขายไม่เปิดขาย" */
  copyrightSold?: boolean;
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
  /** สถานะการจัดส่ง "รายชิ้น" — ผู้ขายแต่ละคนส่งของไม่พร้อมกัน */
  shippingStatus?: ShippingStatus;
  /** หลักฐานการจัดส่ง — ผู้ซื้อและผู้ดูแลระบบเปิดดูเพื่อตรวจสอบได้ */
  packingImage?: string;
  packedAt?: string;
  trackingNumber?: string;
  shippedAt?: string;
  deliveredAt?: string;
  /** buyer = ผู้ซื้อกดยืนยันเอง / auto = ระบบยืนยันให้เมื่อครบกำหนด */
  deliveryConfirmedBy?: "buyer" | "auto";
}

/**
 * บัญชีรับเงินของผู้ขาย — backend ส่งให้เฉพาะเจ้าของบัญชีและผู้ดูแลระบบ
 * ห้ามนำไปแสดงในหน้าที่ผู้ซื้อหรือคนทั่วไปเห็น
 */
export interface BankAccount {
  bankCode: string;
  bankName: string;
  /** ตัวเลขล้วน (backend ตัดขีดออกแล้ว) */
  accountNumber: string;
  accountName: string;
  bankBookImage?: string;
  updatedAt?: string;
}

/** การโอนเงินจากแพลตฟอร์มให้ผู้ขาย 1 คน ใน 1 คำสั่งซื้อ */
export interface SellerPayout {
  /** รหัสผู้ขาย (seller_id ซึ่งเท่ากับ userId) — ใช้ส่งกลับไปตอนบันทึกการโอน */
  sellerId: string;
  sellerName: string;
  sellerEmail?: string;
  sellerPhone?: string;
  /** ราคาผลงาน + ค่าจัดส่ง ของชิ้นที่พร้อมขาย (backend คำนวณ) */
  amount: number;
  itemCount: number;
  deliveredCount: number;
  /** จัดส่งสำเร็จครบแล้วและยังไม่ได้โอน */
  readyForPayout: boolean;
  paid: boolean;
  paidAt?: string;
  slipTransfer?: string;
  /**
   * บัญชีปลายทาง — ยังไม่โอน: บัญชีปัจจุบันของผู้ขาย / โอนแล้ว: สำเนาบัญชี ณ ตอนโอน
   */
  hasBankAccount: boolean;
  bankName?: string;
  bankAccountNumber?: string;
  bankAccountName?: string;
  /** รูปหน้าสมุดบัญชี (มีเฉพาะก่อนโอน ให้แอดมินตรวจ) */
  bankBookImage?: string;
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
  /** วันที่ผู้ดูแลระบบยืนยันการชำระเงิน */
  paymentConfirmedAt?: string;
  /** ชิ้นที่จัดส่งแล้วแต่ผู้ซื้อยังไม่ยืนยัน จะถูกยืนยันอัตโนมัติวันนี้ */
  autoDeliveryConfirmAt?: string;
  autoDeliveryConfirmDays?: number;
  /** มีเฉพาะตอนผู้ขายเปิดดู — สถานะการโอนเงินให้ผู้ขายคนนั้น */
  sellerPayout?: SellerPayout;
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

  /** ลายมือชื่อผู้โอน แนบตอนตอบรับคำขอ (พ.ร.บ. ลิขสิทธิ์ ม.17 ต้องมีลายมือชื่อสองฝ่าย) */
  sellerSignature?: string;
  /** ลายมือชื่อผู้รับโอน แนบตอนลงนาม — คนละตัวกับ documentFile ที่เป็นไฟล์แนบทางเลือก */
  buyerSignature?: string;
  /** วันที่แต่ละฝ่ายลงนาม — คนละตัวกับ transferDate ซึ่งเป็นวันที่ยื่นคำขอ */
  sellerSignedDate?: string;
  buyerSignedDate?: string;
  /** เวอร์ชันข้อความสัญญาที่คู่สัญญาตกลงกัน ใช้เลือกข้อความตอนพิมพ์ */
  termsVersion?: string;

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
  /** ผู้ขายที่ส่งของสำเร็จครบแล้ว รอผู้ดูแลระบบโอนเงินให้ */
  payoutReadyCount?: number;
  payoutPaidCount?: number;
  payoutSellerCount?: number;
}

/**
 * ใบเสนอราคาของคำสั่งซื้อ (ยูสเคส 3.1.14 View Quotation)
 *
 * แยกชนิดจาก Order เพราะเป็นคนละเอกสารกัน — ใบเสนอราคาบันทึก "ข้อมูลติดต่อของสองฝ่าย
 * ณ ตอนออกเอกสาร" ซึ่ง Order ไม่ได้เก็บไว้ (เบอร์/อีเมล/ที่อยู่ผู้ขาย)
 */
export interface QuotationItem {
  no: number;
  artworkName: string;
  sellerName?: string;
  /** งานศิลปะเป็นงานชิ้นเดียว ระบบล็อกไว้ที่ 1 เสมอ */
  quantity: number;
  price: number;
  amount: number;
  shippingCost: number;
  shippingCompanyName?: string;
  availabilityStatus: AvailabilityStatus;
}

export interface Quotation {
  orderId: string;
  /** วันที่ออกเอกสาร (เวลาที่เปิดดู) */
  issuedAt: string;
  orderDate: string;
  confirmDateTime?: string;

  sellerName: string;
  sellerAddress?: string;
  sellerTel?: string;
  sellerEmail?: string;

  buyerName: string;
  buyerAddress?: string;
  buyerTel?: string;
  buyerEmail?: string;
  /** เลขประจำตัวผู้เสียภาษี (บุคคลธรรมดาใช้เลขบัตรประชาชน) */
  buyerTaxId?: string;
  shippingAddress?: string;

  totalAmount: number;
  shippingCost: number;
  grandTotal: number;
  payableTotalAmount: number;
  payableShippingCost: number;
  payableGrandTotal: number;
  /** true = มีชิ้นที่ผู้ขายแจ้งไม่พร้อมจำหน่าย ยอดที่ต้องชำระจึงน้อยกว่ายอดเต็ม */
  partial: boolean;

  items: QuotationItem[];
}
