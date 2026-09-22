/**
 * ธนาคารที่เลือกเป็นบัญชีรับเงินได้
 * ⚠️ รหัสต้องตรงกับ enum ThaiBank ฝั่ง backend
 */
export const THAI_BANKS = [
  { code: "KBANK", name: "ธนาคารกสิกรไทย" },
  { code: "SCB", name: "ธนาคารไทยพาณิชย์" },
  { code: "BBL", name: "ธนาคารกรุงเทพ" },
  { code: "KTB", name: "ธนาคารกรุงไทย" },
  { code: "BAY", name: "ธนาคารกรุงศรีอยุธยา" },
  { code: "TTB", name: "ธนาคารทหารไทยธนชาต" },
  { code: "GSB", name: "ธนาคารออมสิน" },
  { code: "BAAC", name: "ธนาคารเพื่อการเกษตรและสหกรณ์การเกษตร (ธ.ก.ส.)" },
  { code: "GHB", name: "ธนาคารอาคารสงเคราะห์" },
  { code: "UOB", name: "ธนาคารยูโอบี" },
  { code: "CIMB", name: "ธนาคารซีไอเอ็มบี ไทย" },
  { code: "KKP", name: "ธนาคารเกียรตินาคินภัทร" },
  { code: "LHB", name: "ธนาคารแลนด์ แอนด์ เฮ้าส์" },
  { code: "TISCO", name: "ธนาคารทิสโก้" },
  { code: "ISBT", name: "ธนาคารอิสลามแห่งประเทศไทย" },
] as const;

export type ThaiBankCode = (typeof THAI_BANKS)[number]["code"];

/** แสดงเลขบัญชีแบบอ่านง่าย: 10 หลัก → xxx-x-xxxxx-x, อื่นๆ แสดงตามเดิม */
export function formatBankAccountNumber(digits?: string): string {
  if (!digits) return "—";
  if (/^[0-9]{10}$/.test(digits)) {
    return `${digits.slice(0, 3)}-${digits.slice(3, 4)}-${digits.slice(4, 9)}-${digits.slice(9)}`;
  }
  return digits;
}
