package com.maejo.artmarket.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

/** DTO รับข้อมูล login ของ Admin (แยกออกจาก User login เพราะ Admin อยู่คนละตาราง) */
@Data
public class AdminLoginRequest {
    @NotBlank(message = "กรุณากรอกชื่อผู้ใช้")
    private String username;
    @NotBlank(message = "กรุณากรอกรหัสผ่าน")
    private String password;
}
