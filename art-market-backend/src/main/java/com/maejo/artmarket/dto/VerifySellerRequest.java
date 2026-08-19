package com.maejo.artmarket.dto;

import jakarta.validation.constraints.NotNull;
import lombok.Data;

/**
 * DTO รับการตัดสินใจของ Admin (ยูสเคส 3.1.26 Verify Seller ข้อ 3)
 * SRS ระบุว่า Admin "ยืนยัน (approve) หรือปฏิเสธ (reject)" ผู้สมัคร
 */
@Data
public class VerifySellerRequest {
    @NotNull(message = "กรุณาระบุการตัดสินใจ (true=อนุมัติ, false=ปฏิเสธ)")
    private Boolean approved;
}
