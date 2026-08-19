package com.maejo.artmarket.dto;

import com.maejo.artmarket.entity.User;
import com.maejo.artmarket.enums.Role;
import lombok.Builder;
import lombok.Data;

/**
 * DTO สำหรับ List User (ยูสเคส 3.1.25)
 * SRS ระบุ field: username, email, fullName, phoneNumber, role
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

    public static UserSummaryResponse from(User user) {
        return UserSummaryResponse.builder()
                .userId(user.getUserId())
                .username(user.getUsername())
                .email(user.getEmail())
                .fullName(user.getFullName())
                .phoneNumber(user.getPhoneNumber())
                .role(user.getRole())
                .build();
    }
}
