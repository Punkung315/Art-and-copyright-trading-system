package com.maejo.artmarket.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
import lombok.Data;

/**
 * DTO รับข้อมูลสมัครเป็นผู้ขาย (ยูสเคส 3.1.5 Register Seller หน้า 26-27)
 * Actor คือ Buyer (ต้อง login ก่อนถึงจะสมัครเป็น Seller ได้)
 * ข้อมูลที่รับเพิ่มจาก Register Buyer: fullName, phoneNumber, Address
 */
@Data
public class RegisterSellerRequest {

    /**
     * fullName — เดิมบังคับภาษาอังกฤษ ทำให้ศิลปินไทยกรอกชื่อจริงของตัวเองไม่ได้
     * ทั้งที่ชื่อนี้ถูกนำไปใช้เป็นชื่อผู้โอนบนสัญญาโอนลิขสิทธิ์ ซึ่งต้องตรงกับบัตรประชาชน
     * จึงเปิดรับอักษรไทย โดยคงกฎ "ต้องมีเว้นวรรคระหว่างชื่อ-นามสกุล" ไว้ตาม SRS
     *
     * ⚠️ ต้องตรงกับ validateFullName() ใน frontend/src/lib/validation.ts
     */
    @NotBlank(message = "กรุณากรอกชื่อ-นามสกุล")
    @Pattern(regexp = "^[a-zA-Z\\u0E00-\\u0E7F][a-zA-Z\\u0E00-\\u0E7F.'\\-]*\\s+"
                    + "[a-zA-Z\\u0E00-\\u0E7F][a-zA-Z\\u0E00-\\u0E7F.'\\s\\-]*$",
             message = "ชื่อ-นามสกุลต้องเป็นภาษาไทยหรือภาษาอังกฤษ "
                     + "และมีช่องว่างคั่นระหว่างชื่อกับนามสกุล")
    private String fullName;

    /**
     * phoneNumber — SRS กำหนด:
     * 1. ต้องเป็นตัวเลข
     * 2. ยาวพอดี 10 หลัก
     * 3-4. ไม่มีช่องว่าง, ไม่ว่าง
     */
    @NotBlank(message = "กรุณากรอกเบอร์โทรศัพท์")
    @Pattern(regexp = "^[0-9]{10}$",
             message = "เบอร์โทรศัพท์ต้องเป็นตัวเลข 10 หลัก ไม่มีช่องว่าง")
    private String phoneNumber;

    /**
     * เลขบัตรประชาชน 13 หลัก
     * เดิม DTO ไม่มี field นี้ ทำให้ SellerVerifyResponse.nationalNo เป็น null เสมอ
     * ทั้งที่หน้า Verify Seller ของ Admin และใบสัญญาโอนลิขสิทธิ์ต้องใช้
     */
    @Pattern(regexp = "^[0-9]{13}$", message = "เลขบัตรประชาชนต้องเป็นตัวเลข 13 หลัก")
    private String nationalNo;

    /** ที่อยู่ — ตรงกับ Address entity (ยูสเคสระบุว่าต้องกรอกที่อยู่ตอนสมัครเป็น Seller) */
    @Valid
    @NotNull(message = "กรุณากรอกข้อมูลที่อยู่")
    private AddressRequest address;

    @Data
    public static class AddressRequest {
        private String houseNo;
        private String villageNo;
        private String thoroughfare;

        @NotBlank(message = "กรุณากรอกตำบล/แขวง")
        private String subdistrict;

        @NotBlank(message = "กรุณากรอกอำเภอ/เขต")
        private String district;

        @NotBlank(message = "กรุณากรอกจังหวัด")
        private String province;

        @NotBlank(message = "กรุณากรอกรหัสไปรษณีย์")
        @Pattern(regexp = "^[0-9]{5}$", message = "รหัสไปรษณีย์ต้องเป็นตัวเลข 5 หลัก")
        private String postalCode;
    }
}
