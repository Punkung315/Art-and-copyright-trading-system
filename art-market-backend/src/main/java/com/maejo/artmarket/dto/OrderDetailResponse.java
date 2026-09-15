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

    /**
     * ยอดที่ต้องชำระจริง — นับเฉพาะชิ้นที่ผู้ขายยืนยันว่าพร้อมขาย (AVAILABLE)
     *
     * แยกจาก totalAmount/grandTotal ที่เป็นยอดของทั้งคำสั่งซื้อ เพราะถ้าผู้ขายรายหนึ่ง
     * แจ้งไม่พร้อมจำหน่าย ผู้ซื้อยังจ่ายเฉพาะชิ้นที่เหลือได้ แต่ต้องไม่ถูกเก็บเงินค่าชิ้นที่ไม่ได้ของ
     * (ต้องเป็น backend ที่คำนวณ เพราะค่าจัดส่งรายชิ้นอยู่ที่ artwork ซึ่ง DTO ไม่ได้ส่งออกไป)
     */
    private Double payableTotalAmount;
    private Double payableShippingCost;
    private Double payableGrandTotal;

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

    /** ที่อยู่ปลายทางแบบบรรทัดเดียว ไว้โชว์บนหน้าคำสั่งซื้อของทั้งผู้ซื้อและผู้ขาย */
    private String shippingAddress;

    /** จังหวัดปลายทาง — เป็นตัวกำหนดโซนค่าจัดส่ง จึงแยกออกมาให้เห็นชัด */
    private String shippingProvince;

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

        /**
         * ผู้ขายของ "ชิ้นนี้" — คำสั่งซื้อหนึ่งใบมีงานจากผู้ขายหลายคนได้
         *
         * ถ้าไม่ส่งมาระดับรายชิ้น หน้าเว็บจะแยกไม่ออกว่าชิ้นไหนเป็นของผู้ขายคนที่เปิดดูอยู่
         * แล้วผู้ขายจะเห็นงานของผู้ขายรายอื่นที่บังเอิญอยู่ในตะกร้าเดียวกันไปด้วย
         */
        private Integer sellerId;
        private Integer sellerUserId;
        private String  sellerName;

        /** ค่าจัดส่งของชิ้นนี้ ล็อกไว้ตอนยืนยันคำสั่งซื้อ */
        private Double  shippingCost;
        private String  shippingCompanyName;

        public static OrderItemDetail from(OrderItem item) {
            var seller = item.getArtwork().getSeller();
            var company = item.getShippingCompany() != null
                    ? item.getShippingCompany()
                    : item.getArtwork().getShippingCompany();
            return OrderItemDetail.builder()
                    .shippingCost(shippingOf(item))
                    .shippingCompanyName(company != null ? company.getDisplayName() : null)
                    .orderItemId(item.getOrderItemId())
                    .artworkId(item.getArtwork().getArtworkId())
                    .artworkName(item.getArtwork().getArtworkName())
                    .artworkImage(item.getArtwork().getArtworkImage())
                    .price(item.getPrice())
                    .availabilityStatus(item.getAvailabilityStatus())
                    .shippingStatus(item.getShippingStatus())
                    .sellerId(seller != null ? seller.getSellerId() : null)
                    .sellerUserId(seller != null ? seller.getUser().getUserId() : null)
                    .sellerName(seller != null ? seller.getUser().getFullName() : null)
                    .build();
        }
    }

    /**
     * ค่าจัดส่งของ 1 ชิ้น อ่านจาก order_item ที่ล็อกไว้ตอนยืนยันคำสั่งซื้อ
     *
     * ห้ามอ่านจาก artwork.shippingCost — นั่นเป็นราคาประเมินที่ผู้ขายแก้ได้ตลอด
     * ถ้าอ่านสด ยอดของคำสั่งซื้อที่ผู้ซื้อโอนเงินไปแล้วจะเปลี่ยนตามผู้ขายไปด้วย
     *
     * fallback ไปที่ artwork ให้เฉพาะออเดอร์เก่าที่สร้างก่อนมีคอลัมน์นี้เท่านั้น
     */
    private static double shippingOf(OrderItem item) {
        if (item.getShippingCost() != null) return item.getShippingCost();
        var artwork = item.getArtwork();
        return artwork != null && artwork.getShippingCostEstimate() != null
                ? artwork.getShippingCostEstimate() : 0.0;
    }

    public static OrderDetailResponse from(Orders order) {
        double total = order.getOrderItems().stream()
                .mapToDouble(OrderItem::getPrice)
                .sum();

        double shipping = order.getOrderItems().stream()
                .mapToDouble(OrderDetailResponse::shippingOf)
                .sum();

        // ยอดที่ต้องจ่ายจริง = เฉพาะชิ้นที่ผู้ขายยืนยันว่าพร้อมขาย
        var payableItems = order.getOrderItems().stream()
                .filter(i -> i.getAvailabilityStatus() == AvailabilityStatus.AVAILABLE)
                .toList();

        double payableTotal = payableItems.stream()
                .mapToDouble(OrderItem::getPrice)
                .sum();

        double payableShipping = payableItems.stream()
                .mapToDouble(OrderDetailResponse::shippingOf)
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
                .payableTotalAmount(payableTotal)
                .payableShippingCost(payableShipping)
                .payableGrandTotal(payableTotal + payableShipping)
                .shippingAddress(order.getShippingAddress() != null
                        ? order.getShippingAddress().toDisplayString() : null)
                .shippingProvince(order.getShippingAddress() != null
                        ? order.getShippingAddress().getProvince() : null)
                .buyerId(order.getBuyer().getBuyerId())
                .buyerName(order.getBuyer().getUser().getFullName())
                .buyerUserId(order.getBuyer().getUser().getUserId())
                .sellerUserId(seller != null ? seller.getUser().getUserId() : null)
                .sellerId(seller != null ? seller.getSellerId() : null)
                .sellerName(seller != null ? seller.getUser().getFullName() : null)
                .paymentId(payment != null ? payment.getPaymentId() : null)
                .paymentStatus(payment != null ? payment.getPaymentStatus() : null)
                .slipTransfer(payment != null ? payment.getSlipTransfer() : null)
                .items(items)
                .build();
    }
}
