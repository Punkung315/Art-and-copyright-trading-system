package com.maejo.artmarket.dto;

import com.maejo.artmarket.enums.Role;
import lombok.Builder;
import lombok.Data;

/**
 * DTO ส่งกลับหลัง login สำเร็จ หรือ register สำเร็จแล้ว login ทันที
 * Frontend เอา token ไปเก็บและแนบใน header Authorization: Bearer <token> ทุกครั้ง
 */
@Data
@Builder
public class AuthResponse {
    private String token;
    private Integer userId;
    private String username;
    private String email;
    private Role role;

    /**
     * ชื่อ role แบบ String รวม ADMIN ด้วย ("BUYER" | "SELLER" | "ADMIN")
     *
     * ทำไมต้องมีเพิ่ม: enum Role มีแค่ BUYER/SELLER ตอน admin login เลยต้องส่ง role = null
     * ทำให้ frontend แยกไม่ออกว่า token ที่ได้เป็นของ admin หรือ user ธรรมดา
     * field นี้เป็นค่าเดียวกับ claim "role" ที่ฝังอยู่ใน JWT พอดี
     */
    private String roleName;

    private String fullName;
    private String profileImage;

    /**
     * true เมื่อ role=SELLER และ Admin อนุมัติแล้ว (seller.verified)
     * frontend ใช้ตัดสินว่าจะปล่อยเข้าหน้า /seller ได้หรือยัง
     */
    @Builder.Default
    private boolean sellerVerified = false;
}
