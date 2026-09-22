// Validation rules copied from SRS section 3.1.x "ความต้องการของระบบ (Requirement)"
//
// หมายเหตุ: SRS ฉบับแรกกำหนดว่าชื่อผู้ใช้และชื่อ-นามสกุลต้องเป็น "ภาษาอังกฤษ"
// แต่หน้าเว็บทั้งระบบเป็นภาษาไทย การบังคับให้กรอกชื่อจริงเป็นอังกฤษทำให้ผู้ใช้ไทย
// กรอกชื่อตัวเองไม่ได้ และชื่อบนสัญญาโอนลิขสิทธิ์จะไม่ตรงกับบัตรประชาชน
// จึงขยายให้รับภาษาไทยด้วย (฀-๿ คือช่วงอักษรไทยทั้งหมดใน Unicode
// รวมสระ วรรณยุกต์ และเลขไทย)
//
// ⚠️ กฎชุดนี้ต้องตรงกับ @Pattern ฝั่ง backend เสมอ
//    (EditProfileRequest, RegisterBuyerRequest, RegisterSellerRequest)
//    ถ้าแก้ที่นี่ที่เดียว หน้าเว็บจะปล่อยผ่านแล้วไปโดน backend ปฏิเสธแทน

/** อักษรที่นับว่าเป็น "ตัวอักษรของชื่อ" — ไทยหรืออังกฤษ */
const LETTER = "A-Za-z฀-๿";

/** ชื่อผู้ใช้: อักษรไทย/อังกฤษ ตัวเลข และ _ . - โดยห้ามเว้นวรรค */
const USERNAME_RE = new RegExp(`^[${LETTER}0-9_.-]+$`);

/**
 * ชื่อ-นามสกุล: ต้องมีช่องว่างคั่นอย่างน้อยหนึ่งช่อง (คงกฎเดิมของ SRS ไว้)
 * อนุญาต . ' - เพื่อรองรับชื่ออย่าง "ณ อยุธยา" "John F. Kennedy" "O'Brien"
 */
const FULLNAME_RE = new RegExp(
  `^[${LETTER}][${LETTER}.'-]*\\s+[${LETTER}][${LETTER}.'\\s-]*$`
);

export function validateUsername(value: string): string | null {
  if (!value) return "กรุณากรอกชื่อผู้ใช้";
  if (!USERNAME_RE.test(value)) {
    return "ชื่อผู้ใช้ใช้ได้เฉพาะตัวอักษรไทย/อังกฤษ ตัวเลข และ _ . - โดยห้ามเว้นวรรค";
  }
  /*
   * ขยายจาก 8-20 เป็น 8-50 เพราะชื่อไทยนับสระและวรรณยุกต์เป็นตัวอักษรด้วย
   * "กฤตสตูดิโอ" มองด้วยตาเห็นไม่กี่ตัวแต่ .length นับได้ 10 เพดาน 20 จึงแคบเกินไป
   */
  if (value.length < 8 || value.length > 50) return "ชื่อผู้ใช้ต้องมีความยาว 8-50 ตัวอักษร";
  return null;
}

export function validateEmail(value: string): string | null {
  if (!value) return "กรุณากรอกอีเมล";
  if (/\s/.test(value)) return "อีเมลต้องไม่มีช่องว่าง";
  if (!/^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/.test(value)) {
    return "รูปแบบอีเมลไม่ถูกต้อง";
  }
  return null;
}

export function validatePassword(value: string): string | null {
  if (!value) return "กรุณากรอกรหัสผ่าน";
  if (!/^[A-Za-z0-9!#_.]+$/.test(value)) {
    return "รหัสผ่านต้องเป็นตัวอักษรภาษาอังกฤษ ตัวเลข หรืออักขระพิเศษ [ ! # _ . ] เท่านั้น";
  }
  if (value.length < 8 || value.length > 16) return "รหัสผ่านต้องมีความยาว 8-16 ตัวอักษร";
  return null;
}

export function validateFullName(value: string): string | null {
  if (!value || !value.trim()) return "กรุณากรอกชื่อ-นามสกุล";
  if (!FULLNAME_RE.test(value.trim())) {
    return "ชื่อ-นามสกุลต้องเป็นภาษาไทยหรือภาษาอังกฤษ และมีช่องว่างคั่นระหว่างชื่อกับนามสกุล";
  }
  return null;
}

export function validatePhone(value: string): string | null {
  if (!value) return "กรุณากรอกเบอร์โทรศัพท์";
  if (!/^[0-9]{10}$/.test(value)) return "เบอร์โทรศัพท์ต้องเป็นตัวเลข 10 หลัก";
  return null;
}

export function validatePostalCode(value: string): string | null {
  if (!value) return "กรุณากรอกรหัสไปรษณีย์";
  if (!/^[0-9]{5}$/.test(value)) return "รหัสไปรษณีย์ต้องเป็นตัวเลข 5 หลัก";
  return null;
}

export function validateNationalNo(value: string): string | null {
  if (!value) return "กรุณากรอกเลขบัตรประชาชน";
  if (!/^[0-9]{13}$/.test(value)) return "เลขบัตรประชาชนต้องเป็นตัวเลข 13 หลัก";
  return null;
}

export function validateNotEmpty(value: string, label: string): string | null {
  if (!value || !value.trim()) return `กรุณากรอก${label}`;
  return null;
}

export function validateImageFile(file: File | null): string | null {
  if (!file) return "กรุณาแนบไฟล์รูปภาพ";
  if (!["image/png", "image/jpeg"].includes(file.type)) {
    return "ประเภทไฟล์ไม่ถูกต้อง ต้องเป็นไฟล์ png หรือ jpg เท่านั้น";
  }
  return null;
}

/**
 * เลขบัญชีธนาคาร — ต้องตรงกับ SellerBankAccountService.apply ฝั่ง backend
 * ตัดขีดและช่องว่างก่อนนับ (คนมักคัดลอกมาในรูป 123-4-56789-0)
 * ส่วนใหญ่ยาว 10 หลัก แต่ออมสิน/ธ.ก.ส. ยาว 12 หลัก
 */
export function normalizeBankAccountNumber(value: string): string {
  return value.replace(/[\s-]/g, "");
}

export function validateBankAccountNumber(value: string): string | null {
  const digits = normalizeBankAccountNumber(value);
  if (!digits) return "กรุณากรอกเลขบัญชี";
  if (!/^[0-9]{10,12}$/.test(digits)) return "เลขบัญชีต้องเป็นตัวเลข 10–12 หลัก";
  return null;
}
