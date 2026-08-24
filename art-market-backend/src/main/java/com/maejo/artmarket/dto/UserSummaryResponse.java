package com.maejo.artmarket.dto;

import com.maejo.artmarket.entity.User;
import com.maejo.artmarket.enums.Role;
import lombok.Builder;
import lombok.Data;

import java.time.LocalDateTime;

/**
 * DTO สำหรับ List User (ยูสเคส 3.1.25)
 * SRS ระบุ field: username, email, fullName, phoneNumber, role
 *
 * ตั้งใจให้ "เบา" — ไม่มี profileImage (LONGTEXT base64) และไม่มี addresses
 * เพราะรายการนี้ดึงผู้ใช้ทั้งระบบมาพร้อมกัน ถ้าแนบรูปมาด้วยจะหนักโดยไม่จำเป็น
 * ข้อมูลเต็มอยู่ที่ GET /api/admin/users/{id} → UserDetailResponse
 */
@Data
@Builder
public class UserSummaryResponse {
    private Integer userId;
    private String  username;
    private String  email;
    private String  fullName;
    private String  phoneNumber;
    private Role    role;

    /**
     * สถานะผู้ขาย — เดิม DTO ไม่มี field นี้ frontend จึงต้องยิง
     * /admin/sellers/pending อีกรอบแล้วเทียบ userId เอาเองเพื่อเดาว่าใคร "รออนุมัติ"
     * ส่งมาตรงๆ ตั้งแต่แรกชัดเจนกว่า และลดจำนวน request ลงหนึ่งครั้ง
     *
     * null = ผู้ใช้รายนี้ไม่ได้สมัครเป็นผู้ขาย
     */
    private Integer sellerId;
    private Boolean sellerVerified;

    /** วันที่สมัครสมาชิก — เดิมไม่ส่งมา frontend จึงใส่ "เวลาปัจจุบัน" มั่วไปก่อน */
    private LocalDateTime createdAt;

    public static UserSummaryResponse from(User user) {
        return UserSummaryResponse.builder()
                .userId(user.getUserId())
                .username(user.getUsername())
                .email(user.getEmail())
                .fullName(user.getFullName())
                .phoneNumber(user.getPhoneNumber())
                .role(user.getRole())
                .sellerId(user.getSeller() != null ? user.getSeller().getSellerId() : null)
                .sellerVerified(user.getSeller() != null ? user.getSeller().isVerified() : null)
                .createdAt(user.getCreatedAt())
                .build();
    }
}
