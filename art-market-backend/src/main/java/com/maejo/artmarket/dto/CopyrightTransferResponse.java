package com.maejo.artmarket.dto;

import com.maejo.artmarket.entity.CopyrightTransfer;
import com.maejo.artmarket.enums.CopyrightTransferStatus;
import lombok.Builder;
import lombok.Data;

import java.time.LocalDateTime;
import java.util.List;

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

    /**
     * ข้อมูลเพิ่มเติมที่ frontend ต้องใช้แสดงหน้าสัญญา/ใบพิมพ์
     * เดิม DTO ไม่มี field เหล่านี้เลย ทำให้หน้า /copyright/[id] ไม่มีข้อมูลงานศิลปะจะแสดง
     */
    private Integer buyerId;
    private Integer sellerId;
    /**
     * รหัส "ผู้ใช้" (users.user_id) ไม่ใช่รหัสในตาราง buyer/seller/artwork
     *
     * จำเป็นเพราะฝั่ง frontend รู้จักตัวตนของคนที่ login อยู่ผ่าน userId เท่านั้น
     * ถ้าเทียบกับ sellerId/buyerId ตรงๆ จะไม่มีวันตรงกัน (คนละ id space)
     * ทำให้เช็ค "นี่คืองาน/สัญญาของฉันไหม" ผิดพลาดแบบเงียบๆ
     */
    private Integer buyerUserId;
    private Integer sellerUserId;
    private String  documentFile;
    private String  sellerSignature;
    private Double  copyrightPrice;
    private List<ArtworkSummaryResponse> artworks;
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
                .buyerId(ct.getBuyer().getBuyerId())
                .buyerUserId(ct.getBuyer().getUser().getUserId())
                .sellerUserId(ct.getSeller().getUser().getUserId())
                .sellerId(ct.getSeller().getSellerId())
                .documentFile(ct.getDocumentFile())
                .sellerSignature(ct.getSellerSignature())
                .copyrightPrice(ct.getOrder().getOrderItems().stream()
                        .map(i -> i.getArtwork().getCopyrightPrice() != null
                                ? i.getArtwork().getCopyrightPrice()
                                : 0.0)
                        .reduce(0.0, Double::sum))
                .artworks(ct.getOrder().getOrderItems().stream()
                        .map(i -> ArtworkSummaryResponse.from(i.getArtwork()))
                        .toList())
                .transferStatus(ct.getTransferStatus())
                .transferDate(ct.getTransferDate())
                .sellerResponseDetail(ct.getSellerResponseDetail())
                .build();
    }
}
