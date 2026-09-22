package com.maejo.artmarket.dto;

import com.maejo.artmarket.entity.Seller;
import com.maejo.artmarket.enums.ThaiBank;
import lombok.Builder;
import lombok.Data;

import java.time.LocalDateTime;

/**
 * บัญชีรับเงินของผู้ขาย — ส่งให้เฉพาะเจ้าของบัญชีเอง และผู้ดูแลระบบเท่านั้น
 * ห้ามใส่ใน DTO ที่ผู้ซื้อหรือคนทั่วไปเห็น (เช่น ProfileResponse / ArtworkDetailResponse)
 */
@Data
@Builder
public class BankAccountResponse {
    private ThaiBank      bankCode;
    private String        bankName;
    private String        accountNumber;
    private String        accountName;
    private String        bankBookImage;
    private LocalDateTime updatedAt;

    /** null ถ้าผู้ขายยังไม่ได้ตั้งบัญชี */
    public static BankAccountResponse from(Seller s) {
        if (s == null || !s.hasBankAccount()) return null;
        return BankAccountResponse.builder()
                .bankCode(s.getBankCode())
                .bankName(s.getBankCode().getDisplayName())
                .accountNumber(s.getBankAccountNumber())
                .accountName(s.getBankAccountName())
                .bankBookImage(s.getBankBookImage())
                .updatedAt(s.getBankUpdatedAt())
                .build();
    }
}
