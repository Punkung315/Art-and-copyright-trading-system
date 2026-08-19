package com.maejo.artmarket.dto;

import jakarta.validation.constraints.NotNull;
import lombok.Data;

/**
 * DTO รับการตัดสินใจของ Admin (ยูสเคส 3.1.28 Confirm Payment ข้อ 6)
 * SRS ระบุว่า Admin "อนุมัติ หรือ ปฏิเสธ" การโอนเงิน
 */
@Data
public class ConfirmPaymentRequest {
    @NotNull(message = "กรุณาระบุการตัดสินใจ (true=อนุมัติ, false=ปฏิเสธ)")
    private Boolean approved;
}
