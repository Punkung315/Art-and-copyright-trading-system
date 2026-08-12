package com.maejo.artmarket.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import lombok.Data;

/**
 * DTO รับข้อมูล login (ยูสเคส 3.1.4 Login User หน้า 25-26)
 * SRS ระบุว่ากรอก username หรือ email ก็ได้ + password
 */
@Data
public class LoginRequest {

    /**
     * SRS บอกว่ากรอก "ชื่อผู้ใช้งาน (username) หรืออีเมล (email)"
     * ใช้ field ชื่อ usernameOrEmail รับทั้งสองแบบใน field เดียว
     */
    @NotBlank(message = "กรุณากรอกชื่อผู้ใช้หรืออีเมล")
    private String usernameOrEmail;

    @NotBlank(message = "กรุณากรอกรหัสผ่าน")
    @Pattern(regexp = "^[a-zA-Z0-9!#_.]{8,16}$",
             message = "รหัสผ่านต้องยาว 8-16 ตัวอักษร ใช้ได้เฉพาะ a-z A-Z 0-9 และ ! # _ .")
    private String password;
}
