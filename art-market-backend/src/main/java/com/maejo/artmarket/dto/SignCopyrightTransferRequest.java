package com.maejo.artmarket.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import lombok.Data;

/**
 * DTO สำหรับยูสเคส 3.1.16 Sign Agreement
 *
 * หลังผู้ขายตอบรับสัญญา (transferStatus = SIGNED) ผู้ซื้อจะดาวน์โหลดเอกสาร
 * ไปเซ็นแล้วอัปโหลดกลับเข้ามา ระบบจึงปิดสัญญาเป็น COMPLETED
 *
 * เดิม entity CopyrightTransfer มี field documentFile อยู่แล้ว
 * แต่ไม่มี endpoint ไหนเขียนค่าลงไปเลย ทำให้ยูสเคสนี้ค้างอยู่ครึ่งทาง
 */
@Data
public class SignCopyrightTransferRequest {

    @NotBlank(message = "กรุณาแนบไฟล์สัญญาที่ลงนามแล้ว")
    @Pattern(regexp = "^(data:(image/(png|jpe?g)|application/pdf);base64,.+|.+\\.(pdf|png|jpg|jpeg|PDF|PNG|JPG|JPEG))$",
             message = "ไฟล์สัญญาต้องเป็น .pdf .png หรือ .jpg เท่านั้น")
    private String documentFile;
}
