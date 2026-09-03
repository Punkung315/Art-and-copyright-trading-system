package com.maejo.artmarket.controller;

import com.maejo.artmarket.dto.*;
import com.maejo.artmarket.service.CopyrightPaymentService;
import com.maejo.artmarket.service.CopyrightTransferService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/**
 * CopyrightTransferController — REST endpoint สำหรับสัญญาโอนลิขสิทธิ์
 *
 * ฝั่งผู้ซื้อ (BUYER):
 *   POST /api/copyright-transfers            Send Copyright Transfer (3.1.12)
 *   GET  /api/copyright-transfers/sent        ดูสัญญาที่ตัวเองส่งไป
 *
 * ฝั่งผู้ขาย (SELLER):
 *   GET   /api/copyright-transfers/received          ดูสัญญาที่ถูกส่งมาให้ตัวเอง
 *   PATCH /api/copyright-transfers/{id}/respond       Receive Copyright Transfer (3.1.22)
 */
@RestController
@RequestMapping("/api/copyright-transfers")
@RequiredArgsConstructor
public class CopyrightTransferController {

    private final CopyrightTransferService copyrightTransferService;
    private final CopyrightPaymentService  copyrightPaymentService;

    /**
     * ยอดที่ต้องชำระค่าลิขสิทธิ์ + สถานะปัจจุบัน — BUYER เท่านั้น
     * GET /api/copyright-transfers/{id}/payment
     */
    @GetMapping("/{id}/payment")
    public ResponseEntity<ApiResponse<CopyrightPaymentPreviewResponse>> previewCopyrightPayment(
            @AuthenticationPrincipal UserDetails userDetails,
            @PathVariable Integer id) {
        return ResponseEntity.ok(
                copyrightPaymentService.previewPayment(userDetails.getUsername(), id));
    }

    /**
     * อัปโหลดสลิปค่าลิขสิทธิ์ — BUYER เท่านั้น
     * POST /api/copyright-transfers/{id}/payment
     * Body: { "slipTransfer": "data:image/png;base64,..." }
     *
     * ใช้ได้เมื่อผู้ขายตอบรับแล้ว (transferStatus = SIGNED) และยังไม่เคยจ่ายสำเร็จ
     */
    @PostMapping("/{id}/payment")
    public ResponseEntity<ApiResponse<CopyrightPaymentResponse>> makeCopyrightPayment(
            @AuthenticationPrincipal UserDetails userDetails,
            @PathVariable Integer id,
            @Valid @RequestBody MakeCopyrightPaymentRequest request) {
        return ResponseEntity.ok(
                copyrightPaymentService.makePayment(userDetails.getUsername(), id, request));
    }

    /**
     * ยูสเคส 3.1.12 Send Copyright Transfer — BUYER เท่านั้น
     * POST /api/copyright-transfers
     * Body: { orderId, fullName, houseNo, villageNo, thoroughfare,
     *         subdistrict, district, province, postalCode, nationalNo }
     */
    @PostMapping
    public ResponseEntity<ApiResponse<CopyrightTransferResponse>> sendCopyrightTransfer(
            @AuthenticationPrincipal UserDetails userDetails,
            @Valid @RequestBody SendCopyrightTransferRequest request) {
        return ResponseEntity.ok(
                copyrightTransferService.sendCopyrightTransfer(userDetails.getUsername(), request));
    }

    /** ดูสัญญาที่ตัวเองส่งไป — BUYER เท่านั้น */
    @GetMapping("/sent")
    public ResponseEntity<ApiResponse<List<CopyrightTransferResponse>>> listMySentTransfers(
            @AuthenticationPrincipal UserDetails userDetails) {
        return ResponseEntity.ok(copyrightTransferService.listMySentTransfers(userDetails.getUsername()));
    }

    /** ดูสัญญาที่ถูกส่งมาให้ตัวเอง — SELLER เท่านั้น */
    @GetMapping("/received")
    public ResponseEntity<ApiResponse<List<CopyrightTransferResponse>>> listReceivedTransfers(
            @AuthenticationPrincipal UserDetails userDetails) {
        return ResponseEntity.ok(copyrightTransferService.listReceivedTransfers(userDetails.getUsername()));
    }

    /**
     * ยูสเคส 3.1.22 Receive Copyright Transfer — SELLER เท่านั้น
     * PATCH /api/copyright-transfers/{id}/respond
     * Body: { "approved": true, "detail": "ยินดีโอนลิขสิทธิ์ตามเงื่อนไขที่เสนอมา" }
     * Body: { "approved": false, "detail": "ราคาที่เสนอมายังไม่ตรงตามที่ต้องการ" }
     */
    /**
     * ยูสเคส 3.1.16 Sign Agreement — BUYER เท่านั้น
     * PATCH /api/copyright-transfers/{id}/sign
     * Body: { "documentFile": "uploads/contract_signed_12.pdf" }
     *
     * ใช้ได้เมื่อผู้ขายตอบรับแล้ว (transferStatus = SIGNED) เท่านั้น
     */
    @PatchMapping("/{id}/sign")
    public ResponseEntity<ApiResponse<CopyrightTransferResponse>> signAgreement(
            @AuthenticationPrincipal UserDetails userDetails,
            @PathVariable Integer id,
            @Valid @RequestBody SignCopyrightTransferRequest request) {
        return ResponseEntity.ok(
                copyrightTransferService.signAgreement(userDetails.getUsername(), id, request));
    }

    @PatchMapping("/{id}/respond")
    public ResponseEntity<ApiResponse<CopyrightTransferResponse>> receiveCopyrightTransfer(
            @AuthenticationPrincipal UserDetails userDetails,
            @PathVariable Integer id,
            @Valid @RequestBody ReceiveCopyrightTransferRequest request) {
        return ResponseEntity.ok(
                copyrightTransferService.receiveCopyrightTransfer(userDetails.getUsername(), id, request));
    }
}
