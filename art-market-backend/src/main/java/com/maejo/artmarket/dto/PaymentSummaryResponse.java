package com.maejo.artmarket.dto;

import com.maejo.artmarket.entity.Payment;
import com.maejo.artmarket.enums.OrderStatus;
import com.maejo.artmarket.enums.PaymentStatus;
import lombok.Builder;
import lombok.Data;

import java.time.LocalDateTime;

/**
 * DTO สำหรับ List Payment (ยูสเคส 3.1.27)
 * SRS ระบุ field: orderId, buyerId, sellerId, totalPrice
 * เพิ่ม paymentId และ paymentStatus เพื่อให้ Admin กด Confirm ได้
 */
@Data
@Builder
public class PaymentSummaryResponse {
    private Integer       paymentId;
    private Integer       orderId;
    private Integer       buyerId;
    private String        buyerName;
    private Integer       buyerUserId;

    /**
     * ชื่อผู้ขาย — เดิม DTO ตัวนี้ไม่มี ทำให้หน้า List Payment ของ Admin
     * แสดงเป็น "ผู้ซื้อ X → ผู้ขาย" โดยช่องชื่อผู้ขายว่างเปล่า
     * (PaymentDetailResponse มีข้อมูลนี้ผ่าน artworks แต่ endpoint รายการใช้ DTO ตัวนี้)
     */
    private String        sellerName;
    private Integer       sellerId;
    private Integer       sellerUserId;
    private Double        grandTotal;
    private Double        shippingCost;

    /**
     * ยอดค่าชิ้นงาน (ไม่รวมค่าจัดส่ง) — เดิม frontend คำนวณเอาเองจาก
     * grandTotal - shippingCost ซึ่งพังทันทีถ้าสูตรคิดเงินเปลี่ยน
     * ส่งมาจาก backend ที่เป็นเจ้าของสูตรจะตรงกว่า
     */
    private Double        totalPrice;

    private PaymentStatus paymentStatus;

    /** ข้อมูลคำสั่งซื้อที่ผูกอยู่ — ใช้แสดงในตารางรายการและตารางสรุปของ Admin */
    private LocalDateTime orderDate;
    private OrderStatus   orderStatus;
    private Integer       itemCount;

    public static PaymentSummaryResponse from(Payment p) {
        // 1 คำสั่งซื้อ = 1 ผู้ขาย ในโมเดลปัจจุบัน จึงหยิบผู้ขายจากชิ้นแรกมาเป็นตัวแทน
        var items = p.getOrder().getOrderItems();
        var seller = items.isEmpty() ? null : items.get(0).getArtwork().getSeller();

        return PaymentSummaryResponse.builder()
                .paymentId(p.getPaymentId())
                .orderId(p.getOrder().getOrderId())
                .buyerId(p.getOrder().getBuyer().getBuyerId())
                .buyerName(p.getOrder().getBuyer().getUser().getFullName())
                .buyerUserId(p.getOrder().getBuyer().getUser().getUserId())
                .grandTotal(p.getGrandTotal())
                .shippingCost(p.getShippingCost())
                .totalPrice(items.stream().mapToDouble(i -> i.getPrice() != null ? i.getPrice() : 0).sum())
                .paymentStatus(p.getPaymentStatus())
                .orderDate(p.getOrder().getOrderDate())
                .orderStatus(p.getOrder().getOrderStatus())
                .itemCount(items.size())
                .sellerName(seller != null ? seller.getUser().getFullName() : null)
                .sellerId(seller != null ? seller.getSellerId() : null)
                .sellerUserId(seller != null ? seller.getUser().getUserId() : null)
                .build();
    }
}
