package com.maejo.artmarket.controller;

import com.maejo.artmarket.dto.*;
import com.maejo.artmarket.service.SellerOrderService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/**
 * SellerOrderController — REST endpoint สำหรับยูสเคสฝั่งผู้ขายที่เกี่ยวกับคำสั่งซื้อ:
 *
 * GET   /api/seller/orders                          List Order (ยูสเคส 3.1.23)
 * PATCH /api/seller/order-items/{id}/availability   Confirm Availability For Art (3.1.21)
 * PATCH /api/seller/order-items/{id}/shipping       Update Order (3.1.24)
 *
 * ทุก endpoint ต้อง login เป็น SELLER
 */
@RestController
@RequestMapping("/api/seller")
@RequiredArgsConstructor
public class SellerOrderController {

    private final SellerOrderService sellerOrderService;

    /**
     * ยูสเคส 3.1.23 List Order — ดูคำสั่งซื้อทั้งหมดที่มีงานของตัวเอง
     * GET /api/seller/orders
     */
    @GetMapping("/orders")
    public ResponseEntity<ApiResponse<List<SellerOrderResponse>>> listMyOrders(
            @AuthenticationPrincipal UserDetails userDetails) {
        return ResponseEntity.ok(sellerOrderService.listMyOrders(userDetails.getUsername()));
    }

    /**
     * ยูสเคส 3.1.21 Confirm Availability For Art
     * PATCH /api/seller/order-items/{id}/availability
     * Body: { "available": true }  → พร้อมขาย
     * Body: { "available": false } → ไม่พร้อมขาย (คืนงานเป็น AVAILABLE ให้คนอื่นซื้อได้)
     */
    @PatchMapping("/order-items/{id}/availability")
    public ResponseEntity<ApiResponse<SellerOrderResponse.SellerOrderItemDetail>> confirmAvailability(
            @AuthenticationPrincipal UserDetails userDetails,
            @PathVariable Integer id,
            @Valid @RequestBody ConfirmAvailabilityRequest request) {
        return ResponseEntity.ok(
                sellerOrderService.confirmAvailability(userDetails.getUsername(), id, request));
    }

    /**
     * ยูสเคส 3.1.24 Update Order — อัปเดตสถานะการจัดส่ง
     * PATCH /api/seller/order-items/{id}/shipping
     * Body: { "shippingStatus": "SHIPPED" }  หรือ "PREPARING" / "DELIVERED"
     */
    @PatchMapping("/order-items/{id}/shipping")
    public ResponseEntity<ApiResponse<SellerOrderResponse.SellerOrderItemDetail>> updateShippingStatus(
            @AuthenticationPrincipal UserDetails userDetails,
            @PathVariable Integer id,
            @Valid @RequestBody UpdateShippingStatusRequest request) {
        return ResponseEntity.ok(
                sellerOrderService.updateShippingStatus(userDetails.getUsername(), id, request));
    }
}
