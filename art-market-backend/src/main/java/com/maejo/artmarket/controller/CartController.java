package com.maejo.artmarket.controller;

import com.maejo.artmarket.dto.*;
import com.maejo.artmarket.service.CartService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

/**
 * CartController — REST endpoint สำหรับตะกร้าสินค้าและการยืนยันคำสั่งซื้อ (ฝั่ง Buyer)
 *
 * POST   /api/cart               Add Cart      (ยูสเคส 3.1.8)
 * GET    /api/cart                List Cart     (ยูสเคส 3.1.9)
 * DELETE /api/cart/{cartItemId}  Remove Item   (ยูสเคส 3.1.10)
 * POST   /api/cart/confirm       Confirm Order (ยูสเคส 3.1.11)
 *
 * ทุก endpoint ต้อง login เป็น BUYER (ตั้งค่าใน SecurityConfig)
 */
@RestController
@RequestMapping("/api/cart")
@RequiredArgsConstructor
public class CartController {

    private final CartService cartService;

    /**
     * ยูสเคส 3.1.8 Add Cart
     * POST /api/cart
     * Body: { "artworkId": 5 }
     */
    @PostMapping
    public ResponseEntity<ApiResponse<CartItemResponse>> addCart(
            @AuthenticationPrincipal UserDetails userDetails,
            @Valid @RequestBody AddCartRequest request) {
        return ResponseEntity.ok(cartService.addCart(userDetails.getUsername(), request));
    }

    /**
     * ยูสเคส 3.1.9 List Cart
     * GET /api/cart
     * Response: { items: [...], totalPrice: 1500.0 }
     */
    @GetMapping
    public ResponseEntity<ApiResponse<CartListResponse>> listCart(
            @AuthenticationPrincipal UserDetails userDetails) {
        return ResponseEntity.ok(cartService.listCart(userDetails.getUsername()));
    }

    /**
     * ยูสเคส 3.1.10 Remove Item
     * DELETE /api/cart/{cartItemId}
     */
    @DeleteMapping("/{cartItemId}")
    public ResponseEntity<ApiResponse<Void>> removeItem(
            @AuthenticationPrincipal UserDetails userDetails,
            @PathVariable Integer cartItemId) {
        return ResponseEntity.ok(cartService.removeItem(userDetails.getUsername(), cartItemId));
    }

    /**
     * ยูสเคส 3.1.11 Confirm Order
     * POST /api/cart/confirm
     * ยืนยันสินค้าทั้งหมดที่อยู่ในตะกร้าตอนนี้เป็น Order เดียว
     * ต้องส่ง addressId มาด้วยเสมอ เพราะค่าจัดส่งคำนวณจากจังหวัดปลายทาง
     * หลังยืนยันแล้วตะกร้าจะว่าง และงานแต่ละชิ้นจะเปลี่ยนเป็น RESERVED รอผู้ขาย Confirm Availability
     */
    @PostMapping("/confirm")
    public ResponseEntity<ApiResponse<OrderDetailResponse>> confirmOrder(
            @AuthenticationPrincipal UserDetails userDetails,
            @Valid @RequestBody ConfirmOrderRequest request) {
        return ResponseEntity.ok(cartService.confirmOrder(userDetails.getUsername(), request));
    }
}
