package com.maejo.artmarket.dto;

import com.maejo.artmarket.entity.Payment;
import com.maejo.artmarket.enums.PaymentStatus;
import lombok.Builder;
import lombok.Data;

/**
 * DTO สำหรับ List Payment (ยูสเคส 3.1.27)
 * SRS ระบุ field: orderId, buyerId, sellerId, totalPrice
 * เพิ่ม paymentId และ transferStatus เพื่อให้ Admin กด Confirm ได้
 */
@Data
@Builder
public class PaymentSummaryResponse {
    private Integer       paymentId;
    private Integer       orderId;
    private Integer       buyerId;
    private String        buyerName;
    private Double        grandTotal;
    private Double        shippingCost;
    private PaymentStatus transferStatus;

    public static PaymentSummaryResponse from(Payment p) {
        return PaymentSummaryResponse.builder()
                .paymentId(p.getPaymentId())
                .orderId(p.getOrder().getOrderId())
                .buyerId(p.getOrder().getBuyer().getBuyerId())
                .buyerName(p.getOrder().getBuyer().getUser().getFullName())
                .grandTotal(p.getGrandTotal())
                .shippingCost(p.getShippingCost())
                .transferStatus(p.getTransferStatus())
                .build();
    }
}
