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
 * DTO สำหรับ List Order ฝั่งผู้ขาย (ยูสเคส 3.1.23 หน้า 45)
 * SRS ระบุ field: orderID, orderDate, totalAmount, orderStatus
 *
 * หมายเหตุการออกแบบ: คำสั่งซื้อ (Order) หนึ่งรายการอาจมีงานศิลปะจากหลายผู้ขายปนกันได้
 * (ผู้ซื้อใส่ตะกร้าจากร้านต่างกันแล้ว Confirm Order รวมเป็น order เดียว)
 * totalAmount ที่แสดงให้ผู้ขายเห็นจึงคำนวณเฉพาะ "ส่วนของผู้ขายคนนี้เท่านั้น" ไม่ใช่ยอดรวมทั้ง order
 * เพื่อไม่ให้ผู้ขายเห็นยอดขายของร้านอื่นที่ปนอยู่ใน order เดียวกัน
 */
@Data
@Builder
public class SellerOrderResponse {
    private Integer orderId;
    private LocalDateTime orderDate;
    private OrderStatus orderStatus;
    private Double totalAmount;      // เฉพาะส่วนของผู้ขายคนนี้

    /** ข้อมูลผู้ซื้อและสถานะการชำระเงิน — หน้า /seller/orders ต้องใช้แสดงตาราง */
    private Integer buyerId;
    private String  buyerName;
    private Integer buyerUserId;
    private PaymentStatus paymentStatus;   // null = ผู้ซื้อยังไม่ได้อัปสลิป
    private List<SellerOrderItemDetail> items;

    @Data
    @Builder
    public static class SellerOrderItemDetail {
        private Integer orderItemId;
        private Integer artworkId;
        private String  artworkName;
        private String  artworkImage;
        private Double  price;
        private AvailabilityStatus availabilityStatus;
        private ShippingStatus     shippingStatus;

        public static SellerOrderItemDetail from(OrderItem item) {
            return SellerOrderItemDetail.builder()
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

    /** สร้าง response จาก Order พร้อมกรองเฉพาะ item ที่เป็นของผู้ขายคนนี้ */
    public static SellerOrderResponse from(Orders order, Integer sellerId) {
        List<OrderItem> sellerItems = order.getOrderItems().stream()
                .filter(oi -> oi.getArtwork().getSeller().getSellerId().equals(sellerId))
                .toList();

        double totalAmount = sellerItems.stream().mapToDouble(OrderItem::getPrice).sum();

        var payment = order.getPayment();

        return SellerOrderResponse.builder()
                .orderId(order.getOrderId())
                .buyerId(order.getBuyer().getBuyerId())
                .buyerName(order.getBuyer().getUser().getFullName())
                .buyerUserId(order.getBuyer().getUser().getUserId())
                .paymentStatus(payment != null ? payment.getPaymentStatus() : null)
                .orderDate(order.getOrderDate())
                .orderStatus(order.getOrderStatus())
                .totalAmount(totalAmount)
                .items(sellerItems.stream().map(SellerOrderItemDetail::from).toList())
                .build();
    }
}
