package com.maejo.artmarket.controller;

import com.maejo.artmarket.dto.*;
import com.maejo.artmarket.service.AuthService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

/**
 * AuthController — REST endpoint สำหรับยูสเคส Register Buyer / Login / Register Seller
 *
 * POST /api/auth/register         Register Buyer (ยูสเคส 3.1.3) — ไม่ต้อง login
 * POST /api/auth/login            Login User     (ยูสเคส 3.1.4) — ไม่ต้อง login
 * POST /api/auth/register-seller  Register Seller (ยูสเคส 3.1.5) — ต้อง login เป็น BUYER
 */
@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
public class AuthController {

    private final AuthService authService;

    /**
     * ยูสเคส 3.1.3 Register Buyer
     *
     * POST /api/auth/register
     * Body: { "username": "...", "email": "...", "password": "..." }
     *
     * Response 201: { success: true, message: "สมัครสมาชิกสำเร็จ", data: { token, ... } }
     * Response 200: { success: false, message: "ข้อมูลผู้ใช้ซ้ำ..." }
     * Response 400: validation error จาก @Valid
     */
    @PostMapping("/register")
    public ResponseEntity<ApiResponse<AuthResponse>> registerBuyer(
            @Valid @RequestBody RegisterBuyerRequest request) {

        ApiResponse<AuthResponse> response = authService.registerBuyer(request);
        // ถ้าสำเร็จใช้ 201 Created, ถ้าซ้ำใช้ 200 (success=false)
        HttpStatus status = response.isSuccess() ? HttpStatus.CREATED : HttpStatus.OK;
        return ResponseEntity.status(status).body(response);
    }

    /**
     * ยูสเคส 3.1.4 Login User
     *
     * POST /api/auth/login
     * Body: { "usernameOrEmail": "...", "password": "..." }
     *
     * Response 200: { success: true, data: { token, userId, username, email, role } }
     * Response 200: { success: false, message: "ไม่พบข้อมูลผู้ใช้" }
     */
    @PostMapping("/login")
    public ResponseEntity<ApiResponse<AuthResponse>> login(
            @Valid @RequestBody LoginRequest request) {

        ApiResponse<AuthResponse> response = authService.login(request);
        return ResponseEntity.ok(response);
    }

    /**
     * ยูสเคส 3.1.5 Register Seller
     *
     * POST /api/auth/register-seller
     * Header: Authorization: Bearer <token>  (ต้อง login เป็น BUYER ก่อน)
     * Body: { "fullName": "...", "phoneNumber": "...", "address": { ... } }
     *
     * Response 200: { success: true, message: "สมัครเป็นผู้ขายสำเร็จ รอการตรวจสอบ..." }
     *
     * @AuthenticationPrincipal ดึง UserDetails ที่ JwtAuthFilter set ไว้ใน SecurityContext
     */
    @PostMapping("/register-seller")
    public ResponseEntity<ApiResponse<AuthResponse>> registerSeller(
            @AuthenticationPrincipal UserDetails userDetails,
            @Valid @RequestBody RegisterSellerRequest request) {

        ApiResponse<AuthResponse> response = authService.registerSeller(
                userDetails.getUsername(), request);
        return ResponseEntity.ok(response);
    }
}
