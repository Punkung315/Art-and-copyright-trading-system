package com.maejo.artmarket.dto;

import com.maejo.artmarket.entity.Payment;
import com.maejo.artmarket.enums.PaymentStatus;
import lombok.Builder;
import lombok.Data;

import java.util.List;

/**
 * DTO สำหรับ Confirm Payment (ยูสเคส 3.1.28)
 * SRS ระบุ field ครบ: orderId, buyerId, sellerId, Artwork list, price, grandTotal,
 *   shippingCost, slipTransfer, shippingStatus
 */
@Data
@Builder
public class PaymentDetailResponse {
    private Integer       paymentId;
    private Integer       orderId;
    private Integer       buyerId;
    private String        buyerName;
    private Integer       buyerUserId;
    private Double        grandTotal;
    private Double        shippingCost;
    private String        slipTransfer;
    private PaymentStatus transferStatus;

    // รายการงานศิลปะในคำสั่งซื้อ
    private List<ArtworkSummaryResponse> artworks;

    public static PaymentDetailResponse from(Payment p) {
        List<ArtworkSummaryResponse> artworks = p.getOrder().getOrderItems().stream()
                .map(item -> ArtworkSummaryResponse.from(item.getArtwork()))
                .toList();
        return PaymentDetailResponse.builder()
                .paymentId(p.getPaymentId())
                .orderId(p.getOrder().getOrderId())
                .buyerId(p.getOrder().getBuyer().getBuyerId())
                .buyerName(p.getOrder().getBuyer().getUser().getFullName())
                .buyerUserId(p.getOrder().getBuyer().getUser().getUserId())
                .grandTotal(p.getGrandTotal())
                .shippingCost(p.getShippingCost())
                .slipTransfer(p.getSlipTransfer())
                .transferStatus(p.getTransferStatus())
                .artworks(artworks)
                .build();
    }
}
