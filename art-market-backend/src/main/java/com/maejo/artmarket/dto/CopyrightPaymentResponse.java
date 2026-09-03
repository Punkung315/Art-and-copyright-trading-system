package com.maejo.artmarket.dto;

import com.maejo.artmarket.entity.CopyrightPayment;
import com.maejo.artmarket.enums.CopyrightTransferStatus;
import com.maejo.artmarket.enums.PaymentStatus;
import lombok.Builder;
import lombok.Data;

import java.time.LocalDateTime;

/**
 * DTO ของการชำระเงินค่าลิขสิทธิ์ ใช้ทั้งฝั่งผู้ซื้อและหน้าตรวจสลิปของแอดมิน
 *
 * มีสองโรงงาน:
 *   summary(cp) — ไม่ใส่ slipTransfer ใช้กับ "รายการ" ของแอดมิน
 *   detail(cp)  — ใส่สลิปด้วย ใช้กับหน้ารายละเอียดทีละรายการ
 *
 * ที่ต้องแยกเพราะสลิปเก็บเป็น data URL (base64) ขนาดหลักร้อย KB ต่อรูป
 * ถ้ารายการ 50 แถวส่งสลิปมาด้วยทุกแถว payload จะขึ้นหลักสิบเมกะไบต์
 * ทั้งที่หน้ารายการไม่ได้เอาไปแสดงเลย
 */
@Data
@Builder
public class CopyrightPaymentResponse {

    private Integer copyrightPaymentId;
    private Integer copyrightId;

    /** ยอดที่ล็อกไว้ตอนผู้ซื้อกดจ่าย (ไม่ใช่ราคาลิขสิทธิ์ปัจจุบันของงาน) */
    private Double amount;

    private PaymentStatus transferStatus;
    private LocalDateTime paymentDate;

    /** null ในโหมด summary — ดูหมายเหตุด้านบน */
    private String slipTransfer;

    // ---- ข้อมูลประกอบสำหรับหน้าแอดมิน ----
    private Integer artworkId;
    private String  artworkName;
    private String  buyerName;
    private Integer buyerUserId;
    private String  buyerEmail;
    private String  buyerPhone;
    private String  sellerName;
    private Integer sellerUserId;

    /** สถานะของสัญญาที่การชำระเงินนี้ผูกอยู่ — แอดมินต้องเห็นว่าลงนามไปแล้วหรือยัง */
    private CopyrightTransferStatus copyrightTransferStatus;

    public static CopyrightPaymentResponse summary(CopyrightPayment cp) {
        return base(cp).build();
    }

    public static CopyrightPaymentResponse detail(CopyrightPayment cp) {
        return base(cp).slipTransfer(cp.getSlipTransfer()).build();
    }

    private static CopyrightPaymentResponseBuilder base(CopyrightPayment cp) {
        var ct = cp.getCopyrightTransfer();
        var buyerUser = ct.getBuyer().getUser();
        var sellerUser = ct.getSeller().getUser();

        return CopyrightPaymentResponse.builder()
                .copyrightPaymentId(cp.getCopyrightPaymentId())
                .copyrightId(ct.getCopyrightId())
                .amount(cp.getAmount())
                .transferStatus(cp.getTransferStatus())
                .paymentDate(cp.getPaymentDate())
                .artworkId(ct.getArtwork().getArtworkId())
                .artworkName(ct.getArtwork().getArtworkName())
                .buyerName(buyerUser.getFullName())
                .buyerUserId(buyerUser.getUserId())
                .buyerEmail(buyerUser.getEmail())
                .buyerPhone(buyerUser.getPhoneNumber())
                .sellerName(sellerUser.getFullName())
                .sellerUserId(sellerUser.getUserId())
                .copyrightTransferStatus(ct.getTransferStatus());
    }
}
