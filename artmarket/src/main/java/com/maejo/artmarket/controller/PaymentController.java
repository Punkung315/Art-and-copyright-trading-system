package com.maejo.artmarket.controller;

import com.maejo.artmarket.dto.ApiResponse;
import com.maejo.artmarket.dto.MakePaymentRequest;
import com.maejo.artmarket.dto.PaymentDetailResponse;
import com.maejo.artmarket.service.PaymentService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

/**
 * PaymentController — REST endpoint สำหรับยูสเคส 3.1.15 Make Payment (ฝั่ง Buyer)
 *
 * POST /api/payments   Make Payment — อัปโหลดสลิปพร้อมยืนยันคำสั่งซื้อ
 *
 * หมายเหตุ: endpoint ดูยอดเงินก่อนจ่าย (payment-summary) อยู่ที่ OrderController
 * เพราะ conceptually เป็นข้อมูลของ Order ไม่ใช่การกระทำ (action) เหมือน POST นี้
 */
@RestController
@RequestMapping("/api/payments")
@RequiredArgsConstructor
public class PaymentController {

    private final PaymentService paymentService;

    /**
     * ยูสเคส 3.1.15 Make Payment
     * POST /api/payments
     * Body: { "orderId": 3, "slipTransfer": "uploads/slip_123.jpg" }
     *
     * flow ที่แนะนำฝั่ง frontend:
     *   1. GET  /api/orders/{id}/payment-summary   → แสดงยอดให้ผู้ใช้ดูก่อน
     *   2. อัปโหลดไฟล์สลิปไปเก็บ (endpoint อัปโหลดไฟล์แยกต่างหาก — ยังไม่ได้ทำในเวอร์ชันนี้)
     *   3. POST /api/payments  ส่ง orderId + path ของสลิปที่อัปโหลดไว้แล้ว
     */
    @PostMapping
    public ResponseEntity<ApiResponse<PaymentDetailResponse>> makePayment(
            @AuthenticationPrincipal UserDetails userDetails,
            @Valid @RequestBody MakePaymentRequest request) {
        return ResponseEntity.ok(paymentService.makePayment(userDetails.getUsername(), request));
    }
}
