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
}
