type Domain = "order" | "availability" | "shipping" | "payment" | "seller" | "artwork" | "transfer";

type Entry = { label: string; className: string };

const GREEN = "bg-emerald-100 text-emerald-800";
const AMBER = "bg-amber-100 text-amber-800";
const SKY = "bg-sky-100 text-sky-800";
const INDIGO = "bg-indigo-100 text-indigo-800";
const ROSE = "bg-rose-100 text-rose-800";
const STONE = "bg-stone-100 text-stone-700";

const MAPS: Record<Domain, Record<string, Entry>> = {
  order: {
    pending_availability: { label: "รอผู้ขายยืนยัน", className: AMBER },
    awaiting_payment: { label: "รอชำระเงิน", className: SKY },
    payment_review: { label: "รอตรวจสอบการชำระเงิน", className: INDIGO },
    payment_rejected: { label: "ถูกปฏิเสธการโอนเงิน", className: ROSE },
    paid: { label: "ชำระเงินแล้ว", className: GREEN },
    shipped: { label: "จัดส่งแล้ว", className: SKY },
    delivered: { label: "จัดส่งสำเร็จ", className: GREEN },
    cancelled: { label: "ยกเลิก", className: ROSE },
  },
  availability: {
    waiting: { label: "รอยืนยันความพร้อม", className: AMBER },
    confirmed: { label: "ยืนยันความพร้อมแล้ว", className: GREEN },
    rejected: { label: "ไม่พร้อมจำหน่าย", className: ROSE },
  },
  shipping: {
    not_shipped: { label: "ยังไม่จัดส่ง", className: STONE },
    packed: { label: "แพ็คสินค้าแล้ว", className: SKY },
    shipped: { label: "จัดส่งแล้ว", className: SKY },
    delivered: { label: "จัดส่งสำเร็จ", className: GREEN },
  },
  payment: {
    unpaid: { label: "ยังไม่ชำระเงิน", className: STONE },
    submitted: { label: "รอตรวจสอบ", className: INDIGO },
    confirmed: { label: "ยืนยันการโอนเงินแล้ว", className: GREEN },
    rejected: { label: "ปฏิเสธการโอนเงิน", className: ROSE },
  },
  seller: {
    none: { label: "ผู้ซื้อ", className: STONE },
    pending: { label: "รออนุมัติ", className: AMBER },
    approved: { label: "อนุมัติแล้ว", className: GREEN },
    rejected: { label: "ไม่ได้รับอนุมัติ", className: ROSE },
  },
  artwork: {
    draft: { label: "ฉบับร่าง", className: STONE },
    published: { label: "เผยแพร่แล้ว", className: GREEN },
    sold: { label: "ขายแล้ว", className: STONE },
  },
  transfer: {
    requested: { label: "รอผู้ขายพิจารณา", className: AMBER },
    accepted: { label: "ผู้ขายยอมรับ", className: GREEN },
    rejected: { label: "ผู้ขายปฏิเสธ", className: ROSE },
    signed: { label: "ลงนามแล้ว", className: INDIGO },
    completed: { label: "โอนสิทธิ์สำเร็จ", className: GREEN },
  },
};

export function StatusBadge({ status, domain }: { status: string; domain: Domain }) {
  const entry = MAPS[domain][status] ?? { label: status, className: STONE };
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ${entry.className}`}>
      {entry.label}
    </span>
  );
}
