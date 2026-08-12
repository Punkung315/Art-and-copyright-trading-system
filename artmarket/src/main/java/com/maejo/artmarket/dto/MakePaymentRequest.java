package com.maejo.artmarket.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import lombok.Data;

/**
 * DTO รับข้อมูลชำระเงิน (ยูสเคส 3.1.15 Make Payment หน้า 37)
 * SRS ระบุว่าผู้ใช้ต้อง "อัปโหลดรูปภาพหลักฐาน (slipTransfer)"
 *
 * totalPrice/shippingCost/grandTotal ไม่รับจาก frontend — ระบบคำนวณเองจากข้อมูล Order
 * เพื่อป้องกันผู้ใช้ปลอมแปลงยอดเงินที่ต้องจ่าย (ตรงกับ SRS: "ระบบจะทำการดึงข้อมูลราคาที่ต้องชำระ")
 */
@Data
public class MakePaymentRequest {

    @NotNull(message = "กรุณาระบุคำสั่งซื้อ")
    private Integer orderId;

    /**
     * path รูปหลักฐานการโอนเงินหลังอัปโหลดแล้ว
     * Alternate Flow 4.1 — "กรุณาแนบสลิปการโอนเงินเพื่อยืนยันใหม่อีกครั้ง"
     */
    @NotBlank(message = "กรุณาแนบสลิปการโอนเงินเพื่อยืนยันใหม่อีกครั้ง")
    @Pattern(regexp = "^.+\\.(png|jpg|jpeg|PNG|JPG|JPEG)$",
             message = "กรุณาแนบสลิปการโอนเงินเพื่อยืนยันใหม่อีกครั้ง")
    private String slipTransfer;
}
