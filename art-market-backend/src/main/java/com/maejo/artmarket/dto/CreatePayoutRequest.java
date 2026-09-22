package com.maejo.artmarket.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

/**
 * ผู้ดูแลระบบบันทึกการโอนเงินให้ผู้ขาย
 * POST /api/admin/orders/{orderId}/payouts
 *
 * ไม่รับยอดเงินจากหน้าเว็บ — backend คำนวณเองจากรายการในคำสั่งซื้อ (ดู SellerPayoutInfo)
 */
@Data
public class CreatePayoutRequest {
    @NotNull(message = "กรุณาระบุผู้ขาย")
    private Integer sellerId;

    @NotBlank(message = "กรุณาแนบหลักฐานการโอนเงินให้ผู้ขาย")
    private String slipTransfer;
}
