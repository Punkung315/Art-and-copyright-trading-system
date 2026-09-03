package com.maejo.artmarket.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import lombok.Data;

/**
 * DTO รับสลิปการชำระเงินค่าลิขสิทธิ์
 *
 * ไม่รับยอดเงินจาก frontend — ระบบอ่านจาก artwork.copyrightPrice เอง
 * ป้องกันผู้ซื้อแก้ยอดที่ต้องจ่ายเอง (หลักเดียวกับ MakePaymentRequest)
 */
@Data
public class MakeCopyrightPaymentRequest {

    @NotBlank(message = "กรุณาแนบสลิปการโอนเงินเพื่อยืนยันใหม่อีกครั้ง")
    // รับได้ทั้งชื่อไฟล์และ data URL เหมือนสลิปของการซื้อชิ้นงาน
    @Pattern(regexp = "^(data:image/(png|jpe?g);base64,.+|.+\\.(png|jpg|jpeg|PNG|JPG|JPEG))$",
             message = "กรุณาแนบสลิปการโอนเงินเพื่อยืนยันใหม่อีกครั้ง")
    private String slipTransfer;
}
