package com.maejo.artmarket.dto;

import lombok.Builder;
import lombok.Data;

/**
 * DTO แสดงยอดเงินที่ต้องชำระ ก่อนผู้ซื้ออัปโหลดสลิป (SRS Basic Flow ข้อ 2 ของ Make Payment:
 * "ผู้ใช้กรอกรายละเอียดและวิธีการชำระเงิน" — ต้องเห็นยอดก่อนถึงจะกรอก/อัปโหลดได้)
 */
@Data
@Builder
public class PaymentPreviewResponse {
    private Integer orderId;
    private Double  totalPrice;     // ราคารวมชิ้นงาน (ไม่รวมค่าส่ง)
    private Double  shippingCost;   // ค่าจัดส่งรวมทุกชิ้นในคำสั่งซื้อ
    private Double  grandTotal;     // ยอดรวมสุทธิ = totalPrice + shippingCost
}
