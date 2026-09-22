package com.maejo.artmarket.controller;

import com.maejo.artmarket.dto.ApiResponse;
import com.maejo.artmarket.dto.OrderDetailResponse;
import com.maejo.artmarket.dto.PaymentPreviewResponse;
import com.maejo.artmarket.dto.QuotationResponse;
import com.maejo.artmarket.service.OrderService;
import com.maejo.artmarket.service.PaymentService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/**
 * OrderController — REST endpoint สำหรับยูสเคส View Order (ฝั่ง Buyer)
 * และ endpoint ดูยอดชำระเงินก่อนจ่าย (ที่เกี่ยวข้องกับ Make Payment)
 *
 * GET /api/orders                        View Order — รายการทั้งหมด (ยูสเคส 3.1.13)
 * GET /api/orders/{id}                   View Order — รายละเอียดรายการเดียว
 * GET /api/orders/{id}/payment-summary   ดูยอดที่ต้องจ่าย ก่อนเรียก POST /api/orders/{id}/payment
 * PATCH /api/orders/{id}/items/{itemId}/delivered  ผู้ซื้อยืนยันว่าได้รับสินค้าแล้ว
 *
 * endpoint ชำระเงินจริง (POST) อยู่ใน PaymentController เพื่อแยกความรับผิดชอบ
 */
@RestController
@RequestMapping("/api/orders")
@RequiredArgsConstructor
public class OrderController {

    private final OrderService   orderService;
    private final PaymentService paymentService;

    /**
     * ยูสเคส 3.1.13 View Order — ดูคำสั่งซื้อทั้งหมดของตัวเอง
     * GET /api/orders
     */
    @GetMapping
    public ResponseEntity<ApiResponse<List<OrderDetailResponse>>> listMyOrders(
            @AuthenticationPrincipal UserDetails userDetails) {
        return ResponseEntity.ok(orderService.listMyOrders(userDetails.getUsername()));
    }

    /**
     * ยูสเคส 3.1.13 View Order — ดูรายละเอียดคำสั่งซื้อเดียว
     * GET /api/orders/{id}
     */
    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<OrderDetailResponse>> getOrderDetail(
            @AuthenticationPrincipal UserDetails userDetails,
            @PathVariable Integer id) {
        return ResponseEntity.ok(orderService.getOrderDetail(userDetails.getUsername(), id));
    }

    /**
     * ดูยอดเงินที่ต้องชำระก่อนอัปโหลดสลิป (ส่วนหนึ่งของยูสเคส 3.1.15 Make Payment ข้อ 2)
     * GET /api/orders/{id}/payment-summary
     * Response: { orderId, totalPrice, shippingCost, grandTotal }
     */
    @GetMapping("/{id}/payment-summary")
    public ResponseEntity<ApiResponse<PaymentPreviewResponse>> getPaymentSummary(
            @AuthenticationPrincipal UserDetails userDetails,
            @PathVariable Integer id) {
        return ResponseEntity.ok(paymentService.previewPayment(userDetails.getUsername(), id));
    }

    /**
     * ยูสเคส 3.1.14 View Quotation
     * GET /api/orders/{id}/quotation
     * Response: { orderId, dateTimeNow, sellerName, sellerAddress, sellerTel, sellerEmail,
     *             buyerName, buyerAddress, totalAmount, items: [...] }
     */
    @GetMapping("/{id}/quotation")
    public ResponseEntity<ApiResponse<QuotationResponse>> getQuotation(
            @AuthenticationPrincipal UserDetails userDetails,
            @PathVariable Integer id) {
        return ResponseEntity.ok(orderService.getQuotation(userDetails.getUsername(), id));
    }

    /**
     * ผู้ซื้อยืนยันว่าได้รับสินค้าแล้ว (จัดส่งแล้ว → จัดส่งสำเร็จ) ทีละชิ้น
     * PATCH /api/orders/{id}/items/{itemId}/delivered
     */
    @PatchMapping("/{id}/items/{itemId}/delivered")
    public ResponseEntity<ApiResponse<OrderDetailResponse>> confirmDelivered(
            @AuthenticationPrincipal UserDetails userDetails,
            @PathVariable Integer id,
            @PathVariable Integer itemId) {
        return ResponseEntity.ok(orderService.confirmDelivered(userDetails.getUsername(), id, itemId));
    }
}
