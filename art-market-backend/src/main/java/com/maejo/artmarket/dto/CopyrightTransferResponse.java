package com.maejo.artmarket.dto;

import com.maejo.artmarket.entity.CopyrightPayment;
import com.maejo.artmarket.entity.CopyrightTransfer;
import com.maejo.artmarket.enums.CopyrightTransferStatus;
import com.maejo.artmarket.enums.PaymentStatus;
import lombok.Builder;
import lombok.Data;

import java.time.LocalDateTime;
import java.util.List;

/** DTO ส่งกลับหลัง Send/Receive Copyright Transfer หรือตอนดูรายละเอียดสัญญา */
@Data
@Builder
public class CopyrightTransferResponse {
    private Integer copyrightId;

    /** งานศิลปะที่ขอโอนลิขสิทธิ์ — ตัวอ้างอิงหลักของสัญญา */
    private Integer artworkId;
    private String  artworkName;

    /** null ได้ ถ้าผู้ซื้อขอเฉพาะลิขสิทธิ์โดยไม่ได้ซื้อชิ้นงานต้นฉบับ */
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

    /** รายละเอียดข้อตกลงที่ผู้ซื้อระบุตอนยื่นคำขอ — คนละตัวกับ sellerResponseDetail */
    private String agreement;

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

    /** วันที่แต่ละฝ่ายลงนาม — null = ยังไม่ได้เซ็น */
    private LocalDateTime sellerSignedDate;
    private LocalDateTime buyerSignedDate;

    /** เวอร์ชันข้อความสัญญาที่คู่สัญญาตกลงกัน ใช้เลือกข้อความตอนพิมพ์ */
    private String termsVersion;
    private List<ArtworkSummaryResponse> artworks;
    private LocalDateTime transferDate;
    private String sellerResponseDetail; // null ถ้าผู้ขายยังไม่ตอบ

    /**
     * สถานะการชำระค่าลิขสิทธิ์ — null = ผู้ซื้อยังไม่เคยอัปสลิป
     *
     * ต้องส่งมาด้วยเพราะหน้าสัญญาเป็นที่เดียวที่ผู้ซื้อเห็นว่าต้องทำอะไรต่อ
     * ถ้าไม่มีข้อมูลนี้ ปุ่ม "ลงนามสัญญา" จะโผล่ตั้งแต่ผู้ขายตอบรับ
     * แล้วผู้ใช้จะกดแล้วเจอ error จาก backend โดยไม่รู้ว่าต้องไปจ่ายเงินก่อน
     */
    private PaymentStatus copyrightPaymentStatus;

    /** ยอดที่ล็อกไว้ตอนจ่าย — null ถ้ายังไม่เคยจ่าย (ใช้ copyrightPrice แทน) */
    private Double copyrightPaidAmount;

    /** true เมื่อแอดมินยืนยันสลิปแล้ว = ผู้ซื้อกดลงนามได้ */
    private Boolean copyrightPaid;

    public static CopyrightTransferResponse from(CopyrightTransfer ct) {
        return from(ct, null);
    }

    public static CopyrightTransferResponse from(CopyrightTransfer ct, CopyrightPayment payment) {
        return baseFrom(ct)
                .copyrightPaymentStatus(payment != null ? payment.getTransferStatus() : null)
                .copyrightPaidAmount(payment != null ? payment.getAmount() : null)
                .copyrightPaid(payment != null && payment.getTransferStatus() == PaymentStatus.COMPLETED)
                .build();
    }

    private static CopyrightTransferResponseBuilder baseFrom(CopyrightTransfer ct) {
        return CopyrightTransferResponse.builder()
                .copyrightId(ct.getCopyrightId())
                .orderId(ct.getOrder() != null ? ct.getOrder().getOrderId() : null)
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
                .agreement(ct.getAgreement())
                .artworkId(ct.getArtwork().getArtworkId())
                .artworkName(ct.getArtwork().getArtworkName())
                .buyerId(ct.getBuyer().getBuyerId())
                .buyerUserId(ct.getBuyer().getUser().getUserId())
                .sellerUserId(ct.getSeller().getUser().getUserId())
                .sellerId(ct.getSeller().getSellerId())
                .documentFile(ct.getDocumentFile())
                .sellerSignature(ct.getSellerSignature())
                .sellerSignedDate(ct.getSellerSignedDate())
                .buyerSignedDate(ct.getBuyerSignedDate())
                .termsVersion(ct.getTermsVersion())
                // ราคาที่ตกลงกัน ล็อกไว้ตอนยื่นคำขอ — ห้าม fallback ไป artwork.copyrightPrice
                //
                // เดิมอ่านสดจาก artwork ทำให้ผู้ขายแก้ราคาหลังเซ็นสัญญาแล้ว
                // ใบสัญญาที่พิมพ์ย้อนหลังเปลี่ยนตัวเลขตามไปด้วย
                // สัญญาเก่าที่ยังไม่มี agreed_price ใช้ราคาปัจจุบันไปก่อน (ดู migration)
                .copyrightPrice(ct.getAgreedPrice() != null
                        ? ct.getAgreedPrice()
                        : (ct.getArtwork().getCopyrightPrice() != null
                                ? ct.getArtwork().getCopyrightPrice()
                                : 0.0))
                .artworks(List.of(ArtworkSummaryResponse.from(ct.getArtwork())))
                .transferStatus(ct.getTransferStatus())
                .transferDate(ct.getTransferDate())
                .sellerResponseDetail(ct.getSellerResponseDetail());
    }
}
