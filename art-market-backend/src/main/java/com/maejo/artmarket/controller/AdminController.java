package com.maejo.artmarket.controller;

import com.maejo.artmarket.dto.*;
import com.maejo.artmarket.service.AdminService;
import com.maejo.artmarket.service.AuthService;
import com.maejo.artmarket.service.CopyrightPaymentService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/**
 * AdminController — REST endpoint สำหรับฝั่ง Admin ทั้งหมด
 *
 * POST /api/admin/login               Admin login (แยกจาก User login)
 * GET  /api/admin/users               List User       (ยูสเคส 3.1.25)
 * GET  /api/admin/users/{id}          ดูข้อมูลผู้ใช้รายคน (ทุก field ยกเว้นรหัสผ่าน)
 * GET  /api/admin/sellers/pending     รายการรออนุมัติ
 * GET  /api/admin/sellers/{id}        ดูรายละเอียด Seller
 * PATCH /api/admin/sellers/{id}/verify Verify Seller  (ยูสเคส 3.1.26)
 * GET  /api/admin/payments            List Payment    (ยูสเคส 3.1.27)
 * GET  /api/admin/payments/{id}       ดูรายละเอียด Payment
 * PATCH /api/admin/payments/{id}/confirm Confirm Payment (ยูสเคส 3.1.28)
 * GET  /api/admin/copyright-payments            รายการชำระค่าลิขสิทธิ์
 * GET  /api/admin/copyright-payments/{id}       ดูรายละเอียด + สลิป
 * PATCH /api/admin/copyright-payments/{id}/confirm อนุมัติ/ปฏิเสธสลิปค่าลิขสิทธิ์
 *
 * ทุก endpoint (ยกเว้น /login) ต้อง login เป็น ADMIN และแนบ JWT ใน header
 */
@RestController
@RequestMapping("/api/admin")
@RequiredArgsConstructor
public class AdminController {

    private final AdminService adminService;
    private final AuthService  authService;
    private final CopyrightPaymentService copyrightPaymentService;

    // -----------------------------------------------------------------------
    // การชำระค่าลิขสิทธิ์ — แยก endpoint จาก /payments เพราะเป็นคนละตาราง
    //
    // หน้าเว็บของแอดมินเป็นหน้าเดียวกัน แต่ให้ frontend ยิงสองเส้นแล้วรวมเอง
    // ดีกว่ายัดสองชนิดลง DTO เดียว: การโอนค่าชิ้นงานมี order/รายการงาน/ค่าส่ง
    // ส่วนค่าลิขสิทธิ์มีแค่สัญญาฉบับเดียว ถ้ารวมกันครึ่งหนึ่งของ field จะเป็น null เสมอ
    // -----------------------------------------------------------------------

    /** GET /api/admin/copyright-payments — ไม่ส่งสลิปมาด้วย (ดูหมายเหตุใน DTO) */
    @GetMapping("/copyright-payments")
    public ResponseEntity<ApiResponse<List<CopyrightPaymentResponse>>> listCopyrightPayments() {
        return ResponseEntity.ok(copyrightPaymentService.listPayments());
    }

    /** GET /api/admin/copyright-payments/{id} — มีสลิปให้ตรวจ */
    @GetMapping("/copyright-payments/{id}")
    public ResponseEntity<ApiResponse<CopyrightPaymentResponse>> getCopyrightPaymentDetail(
            @PathVariable Integer id) {
        return ResponseEntity.ok(copyrightPaymentService.getPaymentDetail(id));
    }

    /** PATCH /api/admin/copyright-payments/{id}/confirm  Body: { "approved": true } */
    @PatchMapping("/copyright-payments/{id}/confirm")
    public ResponseEntity<ApiResponse<CopyrightPaymentResponse>> confirmCopyrightPayment(
            @PathVariable Integer id,
            @Valid @RequestBody ConfirmPaymentRequest request) {
        return ResponseEntity.ok(copyrightPaymentService.confirmPayment(id, request));
    }

    // -----------------------------------------------------------------------
    // Admin Login (ไม่ต้องการ token ก่อน)
    // -----------------------------------------------------------------------

    /**
     * POST /api/admin/login
     * Body: { "username": "admin", "password": "..." }
     * Response: { token, username, role: "ADMIN" }
     *
     * ใช้ AuthService.loginAdmin() แยกออกมา เพราะ Admin อยู่คนละ table กับ User
     * token ที่ได้จะมี role=ADMIN ใช้ต่อได้ทุก endpoint ใน /api/admin/**
     */
    @PostMapping("/login")
    public ResponseEntity<ApiResponse<AuthResponse>> adminLogin(
            @Valid @RequestBody AdminLoginRequest request) {
        return ResponseEntity.ok(authService.loginAdmin(request));
    }

    // -----------------------------------------------------------------------
    // ยูสเคส 3.1.25 List User
    // -----------------------------------------------------------------------

    /**
     * GET /api/admin/users
     * ดูรายการ User ทั้งหมดในระบบ (ทั้ง BUYER และ SELLER)
     * Response: [ { userId, username, email, fullName, phoneNumber, role }, ... ]
     */
    @GetMapping("/users")
    public ResponseEntity<ApiResponse<List<UserSummaryResponse>>> listUsers() {
        return ResponseEntity.ok(adminService.listUsers());
    }

    /**
     * GET /api/admin/users/{id}
     * ดูข้อมูลผู้ใช้รายคนแบบเต็ม (ทุก field ยกเว้นรหัสผ่าน) + ที่อยู่ + ตัวเลขสรุปกิจกรรม
     * Response: { userId, username, email, ..., addresses: [...], orderCount, artworkCount, ... }
     */
    @GetMapping("/users/{id}")
    public ResponseEntity<ApiResponse<UserDetailResponse>> getUserDetail(
            @PathVariable Integer id) {
        return ResponseEntity.ok(adminService.getUserDetail(id));
    }

    // -----------------------------------------------------------------------
    // ยูสเคส 3.1.26 Verify Seller
    // -----------------------------------------------------------------------

    /**
     * GET /api/admin/sellers/pending
     * ดูรายการ Seller ที่ verified=false รออนุมัติ (ใช้เป็นหน้า list ก่อนกด verify)
     */
    @GetMapping("/sellers/pending")
    public ResponseEntity<ApiResponse<List<SellerVerifyResponse>>> listPendingSellers() {
        return ResponseEntity.ok(adminService.listPendingSellers());
    }

    /**
     * GET /api/admin/sellers/{id}
     * ดูรายละเอียด Seller คนเดียว ก่อนตัดสินใจ approve/reject
     * Response: { sellerId, username, email, fullName, nationalNo, addresses: [...] }
     */
    @GetMapping("/sellers/{id}")
    public ResponseEntity<ApiResponse<SellerVerifyResponse>> getSellerDetail(
            @PathVariable Integer id) {
        return ResponseEntity.ok(adminService.getSellerDetail(id));
    }

    /**
     * PATCH /api/admin/sellers/{id}/verify
     * Body: { "approved": true }  → อนุมัติ
     * Body: { "approved": false } → ปฏิเสธ (ลบ Seller record + คืน role เป็น BUYER)
     *
     * ใช้ PATCH เพราะเปลี่ยนแค่ verified field เดียว ไม่ใช่ update ทั้ง resource
     */
    @PatchMapping("/sellers/{id}/verify")
    public ResponseEntity<ApiResponse<SellerVerifyResponse>> verifySeller(
            @PathVariable Integer id,
            @Valid @RequestBody VerifySellerRequest request) {
        return ResponseEntity.ok(adminService.verifySeller(id, request));
    }

    // -----------------------------------------------------------------------
    // ยูสเคส 3.1.27 List Payment
    // -----------------------------------------------------------------------

    /**
     * GET /api/admin/payments
     * ดูรายการ payment ที่อยู่ใน PENDING_CONFIRMATION (ผู้ซื้ออัปสลิปแล้ว รอ Admin ตรวจ)
     * Response: [ { paymentId, orderId, buyerId, grandTotal, shippingCost, transferStatus }, ... ]
     */
    @GetMapping("/payments")
    public ResponseEntity<ApiResponse<List<PaymentSummaryResponse>>> listPayments() {
        return ResponseEntity.ok(adminService.listPayments());
    }

    // -----------------------------------------------------------------------
    // ยูสเคส 3.1.28 Confirm Payment
    // -----------------------------------------------------------------------

    /**
     * GET /api/admin/payments/{id}
     * ดูรายละเอียด payment ก่อนตัดสินใจ (SRS Basic Flow ข้อ 4-5)
     * Response: { paymentId, orderId, slipTransfer, artworks: [...], grandTotal, ... }
     */
    @GetMapping("/payments/{id}")
    public ResponseEntity<ApiResponse<PaymentDetailResponse>> getPaymentDetail(
            @PathVariable Integer id) {
        return ResponseEntity.ok(adminService.getPaymentDetail(id));
    }

    /**
     * PATCH /api/admin/payments/{id}/confirm
     * Body: { "approved": true }  → COMPLETED + order → COMPLETED
     * Body: { "approved": false } → REJECTED
     */
    @PatchMapping("/payments/{id}/confirm")
    public ResponseEntity<ApiResponse<PaymentDetailResponse>> confirmPayment(
            @PathVariable Integer id,
            @Valid @RequestBody ConfirmPaymentRequest request) {
        return ResponseEntity.ok(adminService.confirmPayment(id, request));
    }
}
