package com.maejo.artmarket.service;

import com.maejo.artmarket.dto.ApiResponse;
import com.maejo.artmarket.dto.OrderDetailResponse;
import com.maejo.artmarket.dto.QuotationResponse;
import com.maejo.artmarket.entity.Address;
import com.maejo.artmarket.entity.Seller;
import com.maejo.artmarket.entity.Buyer;
import com.maejo.artmarket.entity.Orders;
import com.maejo.artmarket.repository.BuyerRepository;
import com.maejo.artmarket.repository.OrdersRepository;
import com.maejo.artmarket.repository.SellerRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

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

        return ApiResponse.ok("ดึงข้อมูลคำสั่งซื้อสำเร็จ", OrderDetailResponse.from(order));
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

        double totalAmount = order.getOrderItems().stream()
                .mapToDouble(com.maejo.artmarket.entity.OrderItem::getPrice)
                .sum();

        // ที่อยู่ผู้ซื้อ/ผู้ขาย — ใช้ที่อยู่แรกที่มีในระบบของแต่ละฝ่าย (ถ้ามี)
        Address buyerAddr  = buyer.getUser().getAddresses().isEmpty()  ? null : buyer.getUser().getAddresses().get(0);
        Address sellerAddr = seller.getUser().getAddresses().isEmpty() ? null : seller.getUser().getAddresses().get(0);

        QuotationResponse quotation = QuotationResponse.builder()
                .orderId(order.getOrderId())
                .dateTimeNow(java.time.LocalDateTime.now())
                .sellerName(seller.getUser().getFullName())
                .sellerAddress(QuotationResponse.formatAddress(sellerAddr))
                .sellerTel(seller.getUser().getPhoneNumber())
                .sellerEmail(seller.getUser().getEmail())
                .buyerName(buyer.getUser().getFullName())
                .buyerAddress(QuotationResponse.formatAddress(buyerAddr))
                .totalAmount(totalAmount)
                .items(order.getOrderItems().stream()
                        .map(QuotationResponse.QuotationItem::from)
                        .toList())
                .build();

        return ApiResponse.ok("ดึงข้อมูลใบเสนอราคาสำเร็จ", quotation);
    }
}
