package com.maejo.artmarket.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

/**
 * DTO รับการตอบกลับของผู้ขาย (ยูสเคส 3.1.22 Receive Copyright Transfer หน้า 43-44)
 * SRS ระบุว่าผู้ขาย "ตอบรับหรือปฏิเสธ...พร้อมทำการบอกเหตุผลกลับไปหาผู้ซื้อ (detail)"
 * detail จึงบังคับกรอกทั้งสองกรณี (ตอบรับก็บอกเหตุผล/เงื่อนไข ปฏิเสธก็บอกเหตุผล)
 */
@Data
public class ReceiveCopyrightTransferRequest {

    @NotNull(message = "กรุณาระบุการตัดสินใจ (true=ตอบรับ, false=ปฏิเสธ)")
    private Boolean approved;

    @NotBlank(message = "กรุณากรอกรายละเอียดการต่อรอง")
    private String detail;
}
