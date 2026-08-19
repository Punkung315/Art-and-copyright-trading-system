// Validation rules copied from SRS section 3.1.x "ความต้องการของระบบ (Requirement)"

export function validateUsername(value: string): string | null {
  if (!value) return "กรุณากรอกชื่อผู้ใช้";
  if (!/^[A-Za-z0-9]+$/.test(value)) return "ชื่อผู้ใช้ต้องเป็นภาษาอังกฤษหรือตัวเลขเท่านั้น";
  if (value.length < 8 || value.length > 20) return "ชื่อผู้ใช้ต้องมีความยาว 8-20 ตัวอักษร";
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
  if (!value) return "กรุณากรอกชื่อ-นามสกุล";
  if (!/^[A-Za-z]+\s[A-Za-z\s]+$/.test(value.trim())) {
    return "ชื่อ-นามสกุลต้องเป็นภาษาอังกฤษและมีช่องว่างคั่นระหว่างชื่อ-นามสกุล";
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
