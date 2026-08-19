package com.maejo.artmarket.dto;

import com.maejo.artmarket.entity.CopyrightTransfer;
import com.maejo.artmarket.enums.CopyrightTransferStatus;
import lombok.Builder;
import lombok.Data;

import java.time.LocalDateTime;

/** DTO ส่งกลับหลัง Send/Receive Copyright Transfer หรือตอนดูรายละเอียดสัญญา */
@Data
@Builder
public class CopyrightTransferResponse {
    private Integer copyrightId;
    private Integer orderId;
    private String  buyerName;
    private String  sellerName;

    // ข้อมูลสัญญาที่ผู้ซื้อกรอก
    private String fullName;
    private String houseNo;
    private String villageNo;
    private String thoroughfare;
    private String subdistrict;
    private String district;
    private String province;
    private String postalCode;
    private String nationalNo;

    private CopyrightTransferStatus transferStatus;
    private LocalDateTime transferDate;
    private String sellerResponseDetail; // null ถ้าผู้ขายยังไม่ตอบ

    public static CopyrightTransferResponse from(CopyrightTransfer ct) {
        return CopyrightTransferResponse.builder()
                .copyrightId(ct.getCopyrightId())
                .orderId(ct.getOrder().getOrderId())
                .buyerName(ct.getBuyer().getUser().getFullName())
                .sellerName(ct.getSeller().getUser().getFullName())
                .fullName(ct.getFullName())
                .houseNo(ct.getHouseNo())
                .villageNo(ct.getVillageNo())
                .thoroughfare(ct.getThoroughfare())
                .subdistrict(ct.getSubdistrict())
                .district(ct.getDistrict())
                .province(ct.getProvince())
                .postalCode(ct.getPostalCode())
                .nationalNo(ct.getNationalNo())
                .transferStatus(ct.getTransferStatus())
                .transferDate(ct.getTransferDate())
                .sellerResponseDetail(ct.getSellerResponseDetail())
                .build();
    }
}
