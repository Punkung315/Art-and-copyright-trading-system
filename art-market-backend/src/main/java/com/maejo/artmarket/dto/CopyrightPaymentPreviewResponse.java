package com.maejo.artmarket.dto;

import com.maejo.artmarket.enums.CopyrightTransferStatus;
import com.maejo.artmarket.enums.PaymentStatus;
import lombok.Builder;
import lombok.Data;

/**
 * ยอดที่ต้องชำระค่าลิขสิทธิ์ พร้อมสถานะปัจจุบัน — ใช้เปิดหน้าชำระเงินของผู้ซื้อ
 *
 * ส่ง canPay/reason มาจาก backend แทนที่จะให้ frontend คิดเงื่อนไขเอง
 * เพราะกฎว่า "จ่ายได้ตอนไหน" มีหลายข้อ (ผู้ขายต้องตอบรับก่อน, ห้ามจ่ายซ้ำ,
 * ถ้าสลิปโดนปฏิเสธต้องจ่ายใหม่ได้) ถ้าเขียนไว้สองที่มันจะไม่ตรงกันเมื่อกฎเปลี่ยน
 * — และฝั่งที่ผิดจะเป็นหน้าเว็บที่ผู้ใช้เห็น
 */
@Data
@Builder
public class CopyrightPaymentPreviewResponse {

    private Integer copyrightId;
    private Integer artworkId;
    private String  artworkName;
    private String  sellerName;

    /** ยอดที่ต้องโอน — ถ้าเคยจ่ายแล้วคือยอดที่ล็อกไว้ ถ้ายังไม่จ่ายคือราคาลิขสิทธิ์ปัจจุบัน */
    private Double amount;

    private CopyrightTransferStatus copyrightTransferStatus;

    /** null = ยังไม่เคยอัปสลิป */
    private PaymentStatus paymentStatus;

    private Boolean canPay;

    /** เหตุผลที่จ่ายไม่ได้ (null เมื่อ canPay = true) — เอาไปแสดงบนหน้าเว็บได้เลย */
    private String reason;

    private String slipTransfer;
}
