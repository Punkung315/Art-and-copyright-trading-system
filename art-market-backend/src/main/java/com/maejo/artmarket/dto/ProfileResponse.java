package com.maejo.artmarket.dto;

import com.maejo.artmarket.entity.User;
import com.maejo.artmarket.enums.Role;
import lombok.Builder;
import lombok.Data;

import java.util.List;

/**
 * DTO สำหรับ View Profile (ยูสเคส 3.1.6 หน้า 28)
 * SRS ระบุว่าแสดง: username, email, phoneNumber และรายการ Artwork (ถ้าเป็น Seller)
 *
 * แยกเป็น 2 กรณี:
 *   - ดูโปรไฟล์ตัวเอง → เห็น email, phoneNumber
 *   - ดูโปรไฟล์คนอื่น → ซ่อน email (privacy) เห็นแค่ username, fullName, profileImage, ผลงาน
 *
 * ใช้ field เดียวกัน แต่ Service จะ set email/phone เป็น null เมื่อดูโปรไฟล์คนอื่น
 */
@Data
@Builder
public class ProfileResponse {

    private Integer userId;
    private String username;
    private String fullName;
    private String email;          // null ถ้าดูโปรไฟล์คนอื่น
    private String phoneNumber;    // null ถ้าดูโปรไฟล์คนอื่น
    private String profileImage;
    private String nationalNo;     // null ถ้าดูโปรไฟล์คนอื่น
    private Role role;

    /**
     * สถานะการเป็นผู้ขาย ใช้แทนแนวคิด sellerStatus ของฝั่ง frontend
     *   "none"     — ยังไม่ได้สมัครเป็นผู้ขาย (ไม่มี record Seller)
     *   "pending"  — สมัครแล้ว รอ Admin อนุมัติ (verified = false)
     *   "approved" — Admin อนุมัติแล้ว (verified = true)
     *
     * ก่อนหน้านี้ไม่มี field นี้เลย frontend จึงไม่มีทางรู้ว่าผู้ขายผ่านการอนุมัติหรือยัง
     */
    private String sellerStatus;
    private Integer sellerId;

    /** ที่อยู่ของผู้ใช้ — ใช้เติมฟอร์มสัญญาโอนลิขสิทธิ์และใบเสนอราคาอัตโนมัติ */
    private List<SellerVerifyResponse.AddressResponse> addresses;

    /** รายการผลงาน — แสดงเฉพาะเมื่อ user เป็น Seller (SRS: "รายการงานศิลปะ") */
    private List<ArtworkSummaryResponse> artworks;

    public static ProfileResponse from(User user, List<ArtworkSummaryResponse> artworks, boolean isSelf) {
        String sellerStatus = "none";
        Integer sellerId = null;
        if (user.getSeller() != null) {
            sellerStatus = user.getSeller().isVerified() ? "approved" : "pending";
            sellerId = user.getSeller().getSellerId();
        }

        List<SellerVerifyResponse.AddressResponse> addresses = isSelf && user.getAddresses() != null
                ? user.getAddresses().stream()
                      .map(SellerVerifyResponse.AddressResponse::from)
                      .toList()
                : List.of();

        return ProfileResponse.builder()
                .userId(user.getUserId())
                .username(user.getUsername())
                .fullName(user.getFullName())
                .email(isSelf ? user.getEmail() : null)
                .phoneNumber(isSelf ? user.getPhoneNumber() : null)
                .nationalNo(isSelf ? user.getNationalNo() : null)
                .profileImage(user.getProfileImage())
                .role(user.getRole())
                .sellerStatus(sellerStatus)
                .sellerId(sellerId)
                .addresses(addresses)
                .artworks(artworks)
                .build();
    }
}
