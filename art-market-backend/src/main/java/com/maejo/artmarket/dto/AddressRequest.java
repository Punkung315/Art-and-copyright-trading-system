package com.maejo.artmarket.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import lombok.Data;

/**
 * DTO รับข้อมูลที่อยู่หนึ่งรายการ — ใช้กับ POST/PUT /api/users/me/addresses
 *
 * ต่างจากที่อยู่ในฟอร์มอื่นตรงที่ "บังคับกรอก" เพราะการกดเพิ่ม/แก้ที่อยู่
 * คือการตั้งใจบันทึกที่อยู่หนึ่งรายการโดยตรง ไม่ใช่ช่องเสริมในฟอร์มอื่น
 * (subdistrict/district/province/postalCode เป็น NOT NULL ในตาราง address อยู่แล้ว)
 */
@Data
public class AddressRequest {

    /** ไม่บังคับ — ที่อยู่บางแห่งไม่มีบ้านเลขที่ (เช่น อาคารสำนักงาน) */
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
