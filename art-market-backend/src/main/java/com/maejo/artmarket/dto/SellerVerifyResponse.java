package com.maejo.artmarket.dto;

import com.maejo.artmarket.entity.Address;
import com.maejo.artmarket.entity.Seller;
import lombok.Builder;
import lombok.Data;

import java.util.List;

/**
 * DTO สำหรับ Verify Seller (ยูสเคส 3.1.26)
 * SRS ระบุ field: username, email, fullName, phoneNumber, nationalNo + Address ครบ
 */
@Data
@Builder
public class SellerVerifyResponse {
    private Integer sellerId;
    private Integer userId;
    private String  username;
    private String  email;
    private String  fullName;
    private String  phoneNumber;
    private String  nationalNo;
    private boolean verified;

    // ที่อยู่ทั้งหมดของผู้สมัคร
    private List<AddressResponse> addresses;

    @Data
    @Builder
    public static class AddressResponse {
        private Integer addressId;
        private String houseNo;
        private String villageNo;
        private String thoroughfare;
        private String subdistrict;
        private String district;
        private String province;
        private String postalCode;
        /** true = ที่อยู่ต้นทางที่ใช้คิดค่าจัดส่ง (ผู้ขายมีได้รายการเดียว) */
        private boolean pickupAddress;

        public static AddressResponse from(Address a) {
            return AddressResponse.builder()
                    .addressId(a.getAddressId())
                    .houseNo(a.getHouseNo())
                    .villageNo(a.getVillageNo())
                    .thoroughfare(a.getThoroughfare())
                    .subdistrict(a.getSubdistrict())
                    .district(a.getDistrict())
                    .province(a.getProvince())
                    .postalCode(a.getPostalCode())
                    .pickupAddress(a.isPickupAddress())
                    .build();
        }
    }

    public static SellerVerifyResponse from(Seller seller) {
        List<AddressResponse> addresses = seller.getUser().getAddresses().stream()
                .map(AddressResponse::from)
                .toList();
        return SellerVerifyResponse.builder()
                .sellerId(seller.getSellerId())
                .userId(seller.getUser().getUserId())
                .username(seller.getUser().getUsername())
                .email(seller.getUser().getEmail())
                .fullName(seller.getUser().getFullName())
                .phoneNumber(seller.getUser().getPhoneNumber())
                .nationalNo(seller.getUser().getNationalNo())
                .verified(seller.isVerified())
                .addresses(addresses)
                .build();
    }
}
