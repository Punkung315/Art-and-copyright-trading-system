package com.maejo.artmarket.dto;

import com.maejo.artmarket.enums.ThaiBank;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.Data;

/**
 * บัญชีธนาคารสำหรับรับเงินของผู้ขาย
 * ใช้ทั้งตอนสมัครเป็นผู้ขาย และตอนแก้ไขที่ PUT /api/seller/bank-account
 *
 * เลขบัญชีตรวจละเอียดที่ SellerBankAccountService (ตัดขีด/ช่องว่างก่อนแล้วค่อยนับหลัก)
 * เพราะผู้ใช้มักคัดลอกมาในรูป "123-4-56789-0"
 */
@Data
public class BankAccountRequest {

    @NotNull(message = "กรุณาเลือกธนาคาร")
    private ThaiBank bankCode;

    @NotBlank(message = "กรุณากรอกเลขบัญชี")
    @Size(max = 30, message = "เลขบัญชียาวเกินไป")
    private String accountNumber;

    @NotBlank(message = "กรุณากรอกชื่อบัญชี")
    @Size(max = 150, message = "ชื่อบัญชียาวเกินไป")
    private String accountName;

    /** data URL ของรูปหน้าสมุดบัญชี — ไม่ส่งมาได้ถ้าเคยแนบแล้วและไม่ต้องการเปลี่ยน */
    private String bankBookImage;
}
