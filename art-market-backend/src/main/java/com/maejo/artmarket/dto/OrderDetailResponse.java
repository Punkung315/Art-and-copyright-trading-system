package com.maejo.artmarket.dto;

import com.maejo.artmarket.entity.OrderItem;
import com.maejo.artmarket.entity.Orders;
import com.maejo.artmarket.enums.AvailabilityStatus;
import com.maejo.artmarket.enums.OrderStatus;
import com.maejo.artmarket.enums.PaymentStatus;
import com.maejo.artmarket.enums.ShippingStatus;
import lombok.Builder;
import lombok.Data;

import java.time.LocalDateTime;
import java.util.List;

/**
 * DTO สำหรับ Confirm Order (3.1.11) และ View Order (3.1.13)
 * SRS ระบุ field: orderId, orderStatus, confirmDateTime, totalAmount, Artwork list
 * View Order เพิ่ม availabilityStatus / shippingStatus ต่อ item
 */
@Data
@Builder
public class OrderDetailResponse {
    private Integer orderId;
    private OrderStatus orderStatus;
    private LocalDateTime orderDate;
    private LocalDateTime confirmDateTime;
    private Double totalAmount;

    /**
     * ข้อมูลที่หน้า View Order / My Orders ของ frontend ต้องใช้แต่เดิม DTO ไม่ได้ส่งมาให้
     * ทำให้ต้องยิง API เพิ่มอีกหลายรอบต่อ 1 คำสั่งซื้อ (payment-summary + quotation)
     * เพียงเพื่อจะรู้ยอดสุทธิและสถานะการชำระเงิน
     */
    private Double shippingCost;
    private Double grandTotal;

    private Integer buyerId;
    private String  buyerName;
    private Integer sellerId;
    private String  sellerName;
    /**
     * รหัส "ผู้ใช้" (users.user_id) ไม่ใช่รหัสในตาราง buyer/seller/artwork
     *
     * จำเป็นเพราะฝั่ง frontend รู้จักตัวตนของคนที่ login อยู่ผ่าน userId เท่านั้น
     * ถ้าเทียบกับ sellerId/buyerId ตรงๆ จะไม่มีวันตรงกัน (คนละ id space)
     * ทำให้เช็ค "นี่คืองาน/สัญญาของฉันไหม" ผิดพลาดแบบเงียบๆ
     */
    private Integer buyerUserId;
    private Integer sellerUserId;

    /** null ถ้ายังไม่ได้ชำระเงิน */
    private Integer       paymentId;
    private PaymentStatus paymentStatus;
    private String        slipTransfer;

    private List<OrderItemDetail> items;

    @Data
    @Builder
    public static class OrderItemDetail {
        private Integer orderItemId;
        private Integer artworkId;
        private String  artworkName;
        private String  artworkImage;
        private Double  price;
        private AvailabilityStatus availabilityStatus;
        private ShippingStatus     shippingStatus;

        public static OrderItemDetail from(OrderItem item) {
            return OrderItemDetail.builder()
                    .orderItemId(item.getOrderItemId())
                    .artworkId(item.getArtwork().getArtworkId())
                    .artworkName(item.getArtwork().getArtworkName())
                    .artworkImage(item.getArtwork().getArtworkImage())
                    .price(item.getPrice())
                    .availabilityStatus(item.getAvailabilityStatus())
                    .shippingStatus(item.getShippingStatus())
                    .build();
        }
    }

    public static OrderDetailResponse from(Orders order) {
        double total = order.getOrderItems().stream()
                .mapToDouble(OrderItem::getPrice)
                .sum();

        double shipping = order.getOrderItems().stream()
                .map(OrderItem::getArtwork)
                .mapToDouble(a -> a.getShippingCost() != null ? a.getShippingCost() : 0.0)
                .sum();

        List<OrderItemDetail> items = order.getOrderItems().stream()
                .map(OrderItemDetail::from)
                .toList();

        // โมเดลปัจจุบันมี 1 order = 1 ผู้ขาย (ดูหมายเหตุใน CopyrightTransferService)
        // จึงหยิบผู้ขายจากชิ้นแรกมาเป็นตัวแทนของทั้งคำสั่งซื้อ
        var seller = order.getOrderItems().isEmpty()
                ? null
                : order.getOrderItems().get(0).getArtwork().getSeller();

        var payment = order.getPayment();

        return OrderDetailResponse.builder()
                .orderId(order.getOrderId())
                .orderStatus(order.getOrderStatus())
                .orderDate(order.getOrderDate())
                .confirmDateTime(order.getConfirmDateTime())
                .totalAmount(total)
                .shippingCost(shipping)
                .grandTotal(total + shipping)
                .buyerId(order.getBuyer().getBuyerId())
                .buyerName(order.getBuyer().getUser().getFullName())
                .buyerUserId(order.getBuyer().getUser().getUserId())
                .sellerUserId(seller != null ? seller.getUser().getUserId() : null)
                .sellerId(seller != null ? seller.getSellerId() : null)
                .sellerName(seller != null ? seller.getUser().getFullName() : null)
                .paymentId(payment != null ? payment.getPaymentId() : null)
                .paymentStatus(payment != null ? payment.getTransferStatus() : null)
                .slipTransfer(payment != null ? payment.getSlipTransfer() : null)
                .items(items)
                .build();
    }
}
