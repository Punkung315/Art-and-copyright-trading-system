package com.maejo.artmarket.dto;

import com.maejo.artmarket.entity.OrderItem;
import com.maejo.artmarket.entity.Payment;
import com.maejo.artmarket.enums.AvailabilityStatus;
import com.maejo.artmarket.enums.OrderStatus;
import com.maejo.artmarket.enums.PaymentStatus;
import com.maejo.artmarket.enums.ShippingStatus;
import lombok.Builder;
import lombok.Data;

import java.time.LocalDateTime;
import java.util.List;

/**
 * DTO สำหรับ Confirm Payment (ยูสเคส 3.1.28) และหน้า "ดูข้อมูลการโอนเงิน" ของ Admin
 * SRS ระบุ field ครบ: orderId, buyerId, sellerId, Artwork list, price, grandTotal,
 *   shippingCost, slipTransfer, shippingStatus
 *
 * ส่งข้อมูลของรายการโอนเงินครบทุกอย่าง เพราะ Admin ต้องตรวจสลิปเทียบกับยอดจริง
 * ก่อนกดยืนยัน — ถ้าต้องเปิดหลายหน้าเพื่อประกอบข้อมูลเองมีโอกาสตัดสินใจผิด
 */
@Data
@Builder
public class PaymentDetailResponse {
    private Integer       paymentId;
    private Integer       orderId;
    private Integer       buyerId;
    private String        buyerName;
    private Integer       buyerUserId;

    /** ข้อมูลติดต่อผู้ซื้อ — Admin ต้องใช้ตอนสลิปมีปัญหาแล้วต้องติดต่อกลับ */
    private String        buyerEmail;
    private String        buyerPhone;

    /**
     * ผู้ขายปลายทางของเงินก้อนนี้ — เดิม DTO ตัวนี้ไม่มีเลย
     * frontend ต้องเดาจาก artworks[0].sellerName ซึ่งว่างทันทีถ้ารายการงานหลุดมาไม่ครบ
     */
    private String        sellerName;
    private Integer       sellerId;
    private Integer       sellerUserId;

    private Double        totalPrice;
    private Double        grandTotal;
    private Double        shippingCost;
    private String        slipTransfer;
    private PaymentStatus paymentStatus;

    /** ข้อมูลคำสั่งซื้อที่ผูกอยู่ */
    private LocalDateTime orderDate;
    private LocalDateTime confirmDateTime;
    private OrderStatus   orderStatus;

    /** รายการงานศิลปะในคำสั่งซื้อ (ข้อมูลชิ้นงานล้วนๆ) */
    private List<ArtworkSummaryResponse> artworks;

    /**
     * รายการในคำสั่งซื้อพร้อมราคา ณ ตอนสั่งซื้อ และสถานะรายชิ้น
     *
     * ราคาปัจจุบันของ artwork ผู้ขายแก้ทีหลังได้ ถ้า Admin ดูจาก artworks อย่างเดียว
     * ยอดที่เห็นอาจไม่ตรงกับยอดที่ผู้ซื้อโอนมาจริง — ต้องอ่านราคาจาก order_item เท่านั้น
     */
    private List<OrderItemLine> items;

    @Data
    @Builder
    public static class OrderItemLine {
        private Integer            orderItemId;
        private Integer            artworkId;
        private String             artworkName;
        private Double             price;
        private AvailabilityStatus availabilityStatus;
        private ShippingStatus     shippingStatus;

        public static OrderItemLine from(OrderItem i) {
            return OrderItemLine.builder()
                    .orderItemId(i.getOrderItemId())
                    .artworkId(i.getArtwork().getArtworkId())
                    .artworkName(i.getArtwork().getArtworkName())
                    .price(i.getPrice())
                    .availabilityStatus(i.getAvailabilityStatus())
                    .shippingStatus(i.getShippingStatus())
                    .build();
        }
    }

    public static PaymentDetailResponse from(Payment p) {
        var order = p.getOrder();
        var orderItems = order.getOrderItems();
        // 1 คำสั่งซื้อ = 1 ผู้ขาย ในโมเดลปัจจุบัน จึงหยิบผู้ขายจากชิ้นแรกมาเป็นตัวแทน
        var seller = orderItems.isEmpty() ? null : orderItems.get(0).getArtwork().getSeller();
        var buyerUser = order.getBuyer().getUser();

        return PaymentDetailResponse.builder()
                .paymentId(p.getPaymentId())
                .orderId(order.getOrderId())
                .buyerId(order.getBuyer().getBuyerId())
                .buyerName(buyerUser.getFullName())
                .buyerUserId(buyerUser.getUserId())
                .buyerEmail(buyerUser.getEmail())
                .buyerPhone(buyerUser.getPhoneNumber())
                .sellerName(seller != null ? seller.getUser().getFullName() : null)
                .sellerId(seller != null ? seller.getSellerId() : null)
                .sellerUserId(seller != null ? seller.getUser().getUserId() : null)
                .totalPrice(orderItems.stream()
                        .mapToDouble(i -> i.getPrice() != null ? i.getPrice() : 0).sum())
                .grandTotal(p.getGrandTotal())
                .shippingCost(p.getShippingCost())
                .slipTransfer(p.getSlipTransfer())
                .paymentStatus(p.getPaymentStatus())
                .orderDate(order.getOrderDate())
                .confirmDateTime(order.getConfirmDateTime())
                .orderStatus(order.getOrderStatus())
                .artworks(orderItems.stream()
                        .map(item -> ArtworkSummaryResponse.from(item.getArtwork()))
                        .toList())
                .items(orderItems.stream().map(OrderItemLine::from).toList())
                .build();
    }
}
