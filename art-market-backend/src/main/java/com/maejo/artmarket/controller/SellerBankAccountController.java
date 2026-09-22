package com.maejo.artmarket.controller;

import com.maejo.artmarket.dto.ApiResponse;
import com.maejo.artmarket.dto.BankAccountRequest;
import com.maejo.artmarket.dto.BankAccountResponse;
import com.maejo.artmarket.service.SellerBankAccountService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

/**
 * บัญชีรับเงินของผู้ขาย (ต้อง login เป็น SELLER — อยู่ใต้กฎ /api/seller/** ใน SecurityConfig)
 *
 * GET /api/seller/bank-account   ดูบัญชีของตัวเอง (data = null ถ้ายังไม่ได้ตั้ง)
 * PUT /api/seller/bank-account   ตั้ง/แก้ไขบัญชี
 *     Body: { bankCode: "KBANK", accountNumber: "123-4-56789-0", accountName: "...", bankBookImage: "data:image/png;base64,..." }
 */
@RestController
@RequestMapping("/api/seller/bank-account")
@RequiredArgsConstructor
public class SellerBankAccountController {

    private final SellerBankAccountService service;

    @GetMapping
    public ResponseEntity<ApiResponse<BankAccountResponse>> getMine(
            @AuthenticationPrincipal UserDetails userDetails) {
        return ResponseEntity.ok(service.getMine(userDetails.getUsername()));
    }

    @PutMapping
    public ResponseEntity<ApiResponse<BankAccountResponse>> updateMine(
            @AuthenticationPrincipal UserDetails userDetails,
            @Valid @RequestBody BankAccountRequest request) {
        return ResponseEntity.ok(service.updateMine(userDetails.getUsername(), request));
    }
}
