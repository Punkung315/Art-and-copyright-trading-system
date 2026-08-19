package com.maejo.artmarket.dto;

import com.maejo.artmarket.entity.OrderItem;
import com.maejo.artmarket.entity.Orders;
import com.maejo.artmarket.enums.AvailabilityStatus;
import com.maejo.artmarket.enums.OrderStatus;
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

        List<OrderItemDetail> items = order.getOrderItems().stream()
                .map(OrderItemDetail::from)
                .toList();

        return OrderDetailResponse.builder()
                .orderId(order.getOrderId())
                .orderStatus(order.getOrderStatus())
                .orderDate(order.getOrderDate())
                .confirmDateTime(order.getConfirmDateTime())
                .totalAmount(total)
                .items(items)
                .build();
    }
}
