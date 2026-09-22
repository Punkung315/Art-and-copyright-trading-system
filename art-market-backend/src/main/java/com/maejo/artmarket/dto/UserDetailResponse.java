package com.maejo.artmarket.dto;

import com.maejo.artmarket.entity.User;
import com.maejo.artmarket.enums.Role;
import lombok.Builder;
import lombok.Data;

import java.time.LocalDateTime;
import java.util.List;

/**
 * DTO สำหรับหน้า "ดูข้อมูลผู้ใช้งาน" ของ Admin — GET /api/admin/users/{id}
 *
 * ส่งข้อมูลของผู้ใช้ครบทุกอย่าง "ยกเว้นรหัสผ่าน"
 * password ไม่ได้อยู่ใน DTO นี้โดยตั้งใจ และต้องไม่ถูกเพิ่มเข้ามาไม่ว่ากรณีใด —
 * ถึงจะเป็น BCrypt hash ก็ไม่ควรหลุดออกจาก backend เพราะเอาไป brute-force offline ได้
 *
 * ต่างจาก UserSummaryResponse ตรงที่มี profileImage, nationalNo, ที่อยู่ทั้งหมด
 * และตัวเลขสรุปกิจกรรมในระบบ ซึ่งหนักเกินกว่าจะใส่ในรายการรวม
 */
@Data
@Builder
public class UserDetailResponse {

    private Integer       userId;
    private String        username;
    private String        email;
    private String        fullName;
    private String        phoneNumber;
    private String        nationalNo;
    private String        profileImage;
    private Role          role;
    private LocalDateTime createdAt;

    /** null = ไม่ได้สมัครเป็นผู้ขาย */
    private Integer sellerId;
    private Boolean sellerVerified;

    /** null = ไม่ได้เป็นผู้ซื้อ (ตามโมเดลปัจจุบันทุกคนเป็นผู้ซื้อ จึงมักไม่ null) */
    private Integer buyerId;

    private List<SellerVerifyResponse.AddressResponse> addresses;

    /** บัญชีรับเงินของผู้ขาย (null = ไม่ใช่ผู้ขาย หรือยังไม่ได้ตั้ง) — endpoint นี้แอดมินเท่านั้น */
    private BankAccountResponse bankAccount;

    /** ตัวเลขสรุปกิจกรรม ใช้ให้ Admin เห็นภาพก่อนตัดสินใจอนุมัติ/ปฏิเสธ */
    private Integer orderCount;
    private Integer artworkCount;
    private Integer copyrightSentCount;
    private Integer copyrightReceivedCount;

    public static UserDetailResponse from(User user) {
        var seller = user.getSeller();
        var buyer  = user.getBuyer();

        return UserDetailResponse.builder()
                .userId(user.getUserId())
                .username(user.getUsername())
                .email(user.getEmail())
                .fullName(user.getFullName())
                .phoneNumber(user.getPhoneNumber())
                .nationalNo(user.getNationalNo())
                .profileImage(user.getProfileImage())
                .role(user.getRole())
                .createdAt(user.getCreatedAt())
                .sellerId(seller != null ? seller.getSellerId() : null)
                .sellerVerified(seller != null ? seller.isVerified() : null)
                .buyerId(buyer != null ? buyer.getBuyerId() : null)
                .addresses(user.getAddresses().stream()
                        .map(SellerVerifyResponse.AddressResponse::from)
                        .toList())
                .bankAccount(BankAccountResponse.from(seller))
                .orderCount(buyer != null ? buyer.getOrders().size() : 0)
                .artworkCount(seller != null ? seller.getArtworks().size() : 0)
                .copyrightSentCount(buyer != null ? buyer.getCopyrightTransfers().size() : 0)
                .copyrightReceivedCount(seller != null ? seller.getCopyrightTransfers().size() : 0)
                .build();
    }
}
