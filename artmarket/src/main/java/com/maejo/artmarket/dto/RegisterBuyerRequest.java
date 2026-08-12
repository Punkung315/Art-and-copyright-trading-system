package com.maejo.artmarket.dto;

import jakarta.validation.constraints.*;
import lombok.Data;

/**
 * DTO รับข้อมูลสมัครสมาชิกผู้ซื้อ (ยูสเคส 3.1.3 Register Buyer หน้า 23-24)
 * Validation rules ตรงตาม "ความต้องการของระบบ" ที่ SRS กำหนดทุกข้อ
 */
@Data
public class RegisterBuyerRequest {

    /**
     * Username — SRS กำหนด:
     * 1. ภาษาอังกฤษหรือตัวเลขเท่านั้น
     * 2. ยาว 8-20 ตัวอักษร
     * 3. ไม่มีเว้นวรรค (regexp ไม่มี \s อยู่แล้ว)
     * 4. ต้องไม่เป็นค่าว่าง
     */
    @NotBlank(message = "กรุณากรอกชื่อผู้ใช้")
    @Pattern(regexp = "^[a-zA-Z0-9]{8,20}$",
             message = "ชื่อผู้ใช้ต้องเป็นภาษาอังกฤษหรือตัวเลข ความยาว 8-20 ตัวอักษร ไม่มีช่องว่าง")
    private String username;

    /**
     * Email — SRS กำหนด:
     * 1. ตัวอักษร a-z, A-Z หรือตัวเลข 0-9 (ก่อน @)
     * 2. ยาว 8-20 ตัวอักษร (รวม @domain)
     * 3-4. ไม่มีช่องว่าง, ไม่ว่าง
     * หมายเหตุ: ใช้ @Email เพิ่มเติมเพื่อตรวจรูปแบบ email มาตรฐาน
     */
    @NotBlank(message = "กรุณากรอกอีเมล")
    @Email(message = "รูปแบบอีเมลไม่ถูกต้อง")
    @Size(min = 8, max = 50, message = "อีเมลต้องมีความยาว 8-50 ตัวอักษร")
    private String email;

    /**
     * Password — SRS กำหนด:
     * 1. ตัวอักษรภาษาอังกฤษ, ตัวเลข หรืออักขระพิเศษ [ !#_. ]
     * 2. ยาว 8-16 ตัวอักษร
     * 3-4. ไม่มีช่องว่าง, ไม่ว่าง
     */
    @NotBlank(message = "กรุณากรอกรหัสผ่าน")
    @Pattern(regexp = "^[a-zA-Z0-9!#_.]{8,16}$",
             message = "รหัสผ่านต้องยาว 8-16 ตัวอักษร ใช้ได้เฉพาะ a-z A-Z 0-9 และ ! # _ .")
    private String password;
}
