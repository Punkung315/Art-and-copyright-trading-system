package com.maejo.artmarket.service;

import com.maejo.artmarket.dto.ApiResponse;
import com.maejo.artmarket.dto.BankAccountRequest;
import com.maejo.artmarket.dto.BankAccountResponse;
import com.maejo.artmarket.entity.Seller;
import com.maejo.artmarket.repository.SellerRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;

/**
 * บัญชีรับเงินของผู้ขาย
 *
 * ผู้ดูแลระบบโอนค่าผลงาน + ค่าจัดส่งให้ผู้ขายหลังจัดส่งสำเร็จ (AdminService.createPayout)
 * ต้องรู้บัญชีปลายทางก่อน จึงบังคับกรอกตั้งแต่สมัครเป็นผู้ขาย และแก้ไขได้ภายหลัง
 * การแก้ไขไม่กระทบหลักฐานการโอนที่ผ่านมา เพราะ SellerPayout เก็บสำเนาบัญชี ณ ตอนโอนไว้แล้ว
 */
@Service
@RequiredArgsConstructor
public class SellerBankAccountService {

    private final SellerRepository sellerRepository;

    @Transactional(readOnly = true)
    public ApiResponse<BankAccountResponse> getMine(String username) {
        Seller seller = sellerRepository.findByUser_Username(username).orElse(null);
        if (seller == null) return ApiResponse.error("ไม่พบข้อมูลผู้ขาย");
        BankAccountResponse r = BankAccountResponse.from(seller);
        return ApiResponse.ok(r == null ? "ยังไม่ได้ตั้งบัญชีรับเงิน" : "ดึงข้อมูลบัญชีรับเงินสำเร็จ", r);
    }

    @Transactional
    public ApiResponse<BankAccountResponse> updateMine(String username, BankAccountRequest req) {
        Seller seller = sellerRepository.findByUser_Username(username).orElse(null);
        if (seller == null) return ApiResponse.error("ไม่พบข้อมูลผู้ขาย");

        String err = apply(seller, req);
        if (err != null) return ApiResponse.error(err);

        sellerRepository.save(seller);
        return ApiResponse.ok("บันทึกบัญชีรับเงินสำเร็จ", BankAccountResponse.from(seller));
    }

    /**
     * ตรวจแล้วเขียนค่าลง Seller (ยังไม่ save) — ใช้ร่วมกับ AuthService.registerSeller
     * @return null = ผ่าน, ไม่งั้นเป็นข้อความ error ภาษาไทย
     */
    static String apply(Seller seller, BankAccountRequest req) {
        if (req == null) return "กรุณากรอกข้อมูลบัญชีธนาคารสำหรับรับเงิน";
        if (req.getBankCode() == null) return "กรุณาเลือกธนาคาร";

        String number = req.getAccountNumber() == null ? ""
                : req.getAccountNumber().replaceAll("[\\s-]", "");
        // เลขบัญชีธนาคารไทยยาว 10 หลักเป็นส่วนใหญ่ บางธนาคาร (ออมสิน/ธ.ก.ส.) ยาว 12 หลัก
        if (!number.matches("^[0-9]{10,12}$")) {
            return "เลขบัญชีต้องเป็นตัวเลข 10–12 หลัก";
        }

        String name = req.getAccountName() == null ? "" : req.getAccountName().trim().replaceAll("\\s+", " ");
        if (name.isEmpty()) return "กรุณากรอกชื่อบัญชี";
        if (name.length() > 150) return "ชื่อบัญชียาวเกินไป";

        boolean hasNewImage = req.getBankBookImage() != null && !req.getBankBookImage().isBlank();
        if (!hasNewImage && seller.getBankBookImage() == null) {
            return "กรุณาแนบรูปหน้าสมุดบัญชี";
        }
        if (hasNewImage) {
            String imgErr = ImageDataUrls.validate(req.getBankBookImage(), "รูปหน้าสมุดบัญชี");
            if (imgErr != null) return imgErr;
            seller.setBankBookImage(req.getBankBookImage());
        }

        seller.setBankCode(req.getBankCode());
        seller.setBankAccountNumber(number);
        seller.setBankAccountName(name);
        seller.setBankUpdatedAt(LocalDateTime.now());
        return null;
    }
}
