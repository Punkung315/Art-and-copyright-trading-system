package com.maejo.artmarket.service;

import com.maejo.artmarket.dto.ApiResponse;
import com.maejo.artmarket.dto.OrderDetailResponse;
import com.maejo.artmarket.dto.QuotationResponse;
import com.maejo.artmarket.entity.Address;
import com.maejo.artmarket.entity.Seller;
import com.maejo.artmarket.entity.Buyer;
import com.maejo.artmarket.entity.Orders;
import com.maejo.artmarket.entity.OrderItem;
import com.maejo.artmarket.enums.AvailabilityStatus;
import com.maejo.artmarket.enums.ShippingStatus;
import com.maejo.artmarket.repository.BuyerRepository;
import com.maejo.artmarket.repository.OrdersRepository;
import com.maejo.artmarket.repository.SellerRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

/**
 * OrderService — Business Logic ของยูสเคส 3.1.13 View Order (ฝั่ง Buyer)
 *
 * SRS ระบุ Basic Flow: รับ userId จาก parameter → ค้นหาคำสั่งซื้อทั้งหมดของผู้ใช้ → แสดงผล
 * รวมทั้งดูรายละเอียดคำสั่งซื้อทีละรายการ (สำหรับหน้า detail)
 */
@Service
@RequiredArgsConstructor
public class OrderService {

    private final OrdersRepository ordersRepository;
    private final BuyerRepository  buyerRepository;
    private final SellerRepository sellerRepository;

    // =========================================================================
    // ยูสเคส 3.1.13 View Order — ดูรายการคำสั่งซื้อทั้งหมดของตัวเอง
    // Alternate Flow 3.1.1: "ไม่พบรายการคำสั่งซื้อ"
    // =========================================================================

    @Transactional(readOnly = true)
    public ApiResponse<List<OrderDetailResponse>> listMyOrders(String username) {

        Buyer buyer = buyerRepository.findByUser_Username(username).orElse(null);
        if (buyer == null) {
            return ApiResponse.error("ไม่พบข้อมูลผู้ซื้อ");
        }

        List<Orders> orders = ordersRepository.findByBuyer_BuyerId(buyer.getBuyerId());

        // Alternate Flow 3.1.1 — ยังไม่เคยสั่งซื้อ = list ว่าง ไม่ใช่ error
        return ApiResponse.ok(
                orders.isEmpty() ? "ไม่พบรายการคำสั่งซื้อ" : "พบคำสั่งซื้อ " + orders.size() + " รายการ",
                orders.stream().map(OrderDetailResponse::from).toList());
    }

    /**
     * ดูรายละเอียดคำสั่งซื้อเดียว — ใช้ตอนเปิดหน้า detail จากรายการ
     *
     * เปิดให้ดูได้ 2 ฝ่าย:
     *   1. ผู้ซื้อเจ้าของคำสั่งซื้อ
     *   2. ผู้ขายที่มีผลงานอยู่ในคำสั่งซื้อนี้
     *
     * ⚠️ ของเดิมเช็คเฉพาะผู้ซื้อ ทำให้ผู้ขายกดเปิดคำสั่งซื้อจากหน้า "คำสั่งซื้อของร้านฉัน"
     * แล้วเจอ "ไม่พบรายการคำสั่งซื้อ" ตลอด — ทั้งที่เป็นคำสั่งซื้อที่มีงานของเขาเองอยู่
     * (frontend กลืน error แล้วแสดงเป็นหน้าว่าง จึงดูเหมือนไม่มีข้อมูล ไม่ใช่ไม่มีสิทธิ์)
     */
    @Transactional(readOnly = true)
    public ApiResponse<OrderDetailResponse> getOrderDetail(String username, Integer orderId) {

        Optional<Orders> orderOpt = ordersRepository.findById(orderId);
        if (orderOpt.isEmpty()) {
            return ApiResponse.error("ไม่พบรายการคำสั่งซื้อ");
        }

        Orders order = orderOpt.get();

        Buyer buyer = buyerRepository.findByUser_Username(username).orElse(null);
        boolean isOwnerBuyer = buyer != null
                && order.getBuyer().getBuyerId().equals(buyer.getBuyerId());

        Seller seller = sellerRepository.findByUser_Username(username).orElse(null);
        boolean isSellerInOrder = seller != null && order.getOrderItems().stream()
                .anyMatch(i -> i.getArtwork().getSeller().getSellerId().equals(seller.getSellerId()));

        if (!isOwnerBuyer && !isSellerInOrder) {
            return ApiResponse.error("ไม่มีสิทธิ์ดูคำสั่งซื้อนี้");
        }

        // ผู้ขายเห็นหลักฐานการโอนเงินเฉพาะของตัวเอง ผู้ซื้อไม่เห็นส่วนนี้
        return ApiResponse.ok("ดึงข้อมูลคำสั่งซื้อสำเร็จ", isSellerInOrder && !isOwnerBuyer
                ? OrderDetailResponse.from(order, seller.getSellerId())
                : OrderDetailResponse.from(order));
    }

    // =========================================================================
    // ผู้ซื้อยืนยันว่าได้รับสินค้าแล้ว (จัดส่งแล้ว → จัดส่งสำเร็จ) ทีละชิ้น
    //
    // ยืนยันรายชิ้นเพราะคำสั่งซื้อหนึ่งใบมีงานจากหลายร้าน แต่ละร้านส่งถึงไม่พร้อมกัน
    // ถ้าผู้ซื้อไม่กด ระบบจะยืนยันให้เองเมื่อครบกำหนด (DeliveryAutoConfirmService)
    // =========================================================================

    @Transactional
    public ApiResponse<OrderDetailResponse> confirmDelivered(String username, Integer orderId, Integer orderItemId) {

        Buyer buyer = buyerRepository.findByUser_Username(username).orElse(null);
        if (buyer == null) {
            return ApiResponse.error("ไม่พบข้อมูลผู้ซื้อ");
        }

        Optional<Orders> orderOpt = ordersRepository.findById(orderId);
        if (orderOpt.isEmpty()) {
            return ApiResponse.error("ไม่พบรายการคำสั่งซื้อ");
        }
        Orders order = orderOpt.get();

        // ผู้ขายเปิดดูคำสั่งซื้อได้ แต่ยืนยันการรับของแทนผู้ซื้อไม่ได้
        if (!order.getBuyer().getBuyerId().equals(buyer.getBuyerId())) {
            return ApiResponse.error("ไม่มีสิทธิ์ยืนยันการรับสินค้าของคำสั่งซื้อนี้");
        }

        OrderItem item = order.getOrderItems().stream()
                .filter(i -> i.getOrderItemId().equals(orderItemId))
                .findFirst().orElse(null);
        if (item == null) {
            return ApiResponse.error("ไม่พบรายการสินค้านี้ในคำสั่งซื้อ");
        }

        if (item.getShippingStatus() == ShippingStatus.DELIVERED) {
            return ApiResponse.error("รายการนี้ยืนยันการได้รับสินค้าไปแล้ว");
        }
        if (item.getShippingStatus() != ShippingStatus.SHIPPED) {
            return ApiResponse.error("ยืนยันการได้รับสินค้าได้หลังผู้ขายจัดส่งสินค้าแล้วเท่านั้น");
        }

        item.setShippingStatus(ShippingStatus.DELIVERED);
        item.setDeliveredAt(LocalDateTime.now());
        item.setDeliveryConfirmedBy(DeliveryAutoConfirmService.CONFIRMED_BY_BUYER);
        ordersRepository.save(order);

        return ApiResponse.ok("ยืนยันการได้รับสินค้าสำเร็จ", OrderDetailResponse.from(order));
    }

    // =========================================================================
    // ยูสเคส 3.1.14 View Quotation (Use case Referenced: View Order)
    // Alternate Flow 4.1.1: "ไม่พบคำสั่งซื้อ"
    // =========================================================================

    @Transactional(readOnly = true)
    public ApiResponse<QuotationResponse> getQuotation(String username, Integer orderId) {

        Buyer buyer = buyerRepository.findByUser_Username(username).orElse(null);
        if (buyer == null) {
            return ApiResponse.error("ไม่พบข้อมูลผู้ซื้อ");
        }

        Optional<Orders> orderOpt = ordersRepository.findById(orderId);

        // Alternate Flow 4.1.1
        if (orderOpt.isEmpty()) {
            return ApiResponse.error("ไม่พบคำสั่งซื้อ");
        }

        Orders order = orderOpt.get();

        if (!order.getBuyer().getBuyerId().equals(buyer.getBuyerId())) {
            return ApiResponse.error("ไม่มีสิทธิ์ดูใบเสนอราคานี้");
        }

        if (order.getOrderItems().isEmpty()) {
            return ApiResponse.error("คำสั่งซื้อไม่มีรายการสินค้า");
        }

        // ใช้ seller ของชิ้นงานแรกเป็นตัวแทน (ดูหมายเหตุข้อจำกัดของโมเดลใน QuotationResponse)
        Seller seller = order.getOrderItems().get(0).getArtwork().getSeller();

        List<OrderItem> orderItems = order.getOrderItems();

        // ยอดของทั้งใบ
        double totalAmount  = orderItems.stream().mapToDouble(OrderItem::getPrice).sum();
        double shippingCost = orderItems.stream().mapToDouble(QuotationResponse::shippingOf).sum();

        // ยอดที่ต้องชำระจริง — เฉพาะชิ้นที่ผู้ขายยืนยันว่าพร้อมขาย
        // ตรรกะเดียวกับ OrderDetailResponse เพื่อให้ใบเสนอราคากับหน้าชำระเงินบอกยอดตรงกัน
        List<OrderItem> payableItems = orderItems.stream()
                .filter(i -> i.getAvailabilityStatus() == AvailabilityStatus.AVAILABLE)
                .toList();
        double payableTotal    = payableItems.stream().mapToDouble(OrderItem::getPrice).sum();
        double payableShipping = payableItems.stream().mapToDouble(QuotationResponse::shippingOf).sum();

        // ที่อยู่ผู้ซื้อ — ใช้ที่อยู่แรกในสมุดที่อยู่ (ถ้ามี)
        Address buyerAddr = buyer.getUser().getAddresses().isEmpty()
                ? null : buyer.getUser().getAddresses().get(0);

        // ที่อยู่ผู้ขาย — เอาที่อยู่ต้นทางส่งของก่อน เพราะนั่นคือที่ที่งานถูกส่งออกมาจริง
        // ถ้าไม่ได้ตั้งไว้ค่อยตกมาที่ที่อยู่แรกในสมุด
        Address sellerAddr = seller.getUser().getAddresses().stream()
                .filter(Address::isPickupAddress)
                .findFirst()
                .orElseGet(() -> seller.getUser().getAddresses().isEmpty()
                        ? null : seller.getUser().getAddresses().get(0));

        List<QuotationResponse.QuotationItem> items = new java.util.ArrayList<>();
        for (int i = 0; i < orderItems.size(); i++) {
            items.add(QuotationResponse.QuotationItem.from(orderItems.get(i), i + 1));
        }

        QuotationResponse quotation = QuotationResponse.builder()
                .orderId(order.getOrderId())
                .dateTimeNow(java.time.LocalDateTime.now())
                .orderDate(order.getOrderDate())
                .confirmDateTime(order.getConfirmDateTime())
                .sellerName(seller.getUser().getFullName())
                .sellerAddress(QuotationResponse.formatAddress(sellerAddr))
                .sellerTel(seller.getUser().getPhoneNumber())
                .sellerEmail(seller.getUser().getEmail())
                .buyerName(buyer.getUser().getFullName())
                .buyerAddress(QuotationResponse.formatAddress(buyerAddr))
                .buyerTel(buyer.getUser().getPhoneNumber())
                .buyerEmail(buyer.getUser().getEmail())
                .buyerTaxId(buyer.getUser().getNationalNo())
                .shippingAddress(order.getShippingAddress() != null
                        ? order.getShippingAddress().toDisplayString() : null)
                .totalAmount(totalAmount)
                .shippingCost(shippingCost)
                .grandTotal(totalAmount + shippingCost)
                .payableTotalAmount(payableTotal)
                .payableShippingCost(payableShipping)
                .payableGrandTotal(payableTotal + payableShipping)
                /*
                 * partial = "มีชิ้นที่ผู้ขายแจ้งว่าไม่พร้อมจำหน่าย" เท่านั้น
                 * ห้ามนิยามว่า payableItems.size() != orderItems.size() เพราะตอนที่ผู้ขาย
                 * ยังไม่ตอบ ทุกชิ้นเป็น PENDING_CONFIRMATION → payable = 0 ทั้งใบ
                 * ใบเสนอราคาจะกลายเป็นยอด 0 บาท ทั้งที่ยังไม่มีใครปฏิเสธอะไรเลย
                 */
                .partial(orderItems.stream()
                        .anyMatch(i -> i.getAvailabilityStatus() == AvailabilityStatus.UNAVAILABLE))
                .items(items)
                .build();

        return ApiResponse.ok("ดึงข้อมูลใบเสนอราคาสำเร็จ", quotation);
    }
}
