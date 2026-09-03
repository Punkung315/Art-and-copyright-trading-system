package com.maejo.artmarket.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import lombok.Data;

/**
 * DTO สำหรับยูสเคส 3.1.16 Sign Agreement
 *
 * หลังผู้ขายตอบรับสัญญาและผู้ซื้อชำระค่าลิขสิทธิ์แล้ว ผู้ซื้อจึงลงนามได้
 *
 * เปลี่ยนจากเดิม: สิ่งที่บังคับคือ "ลายมือชื่อ" ไม่ใช่ "ไฟล์เอกสารที่สแกนกลับมา"
 *
 *   พ.ร.บ. ธุรกรรมทางอิเล็กทรอนิกส์ ม.9 เป็นกลางทางเทคโนโลยี ลายเซ็นที่วาดบนหน้าจอ
 *   กับที่เซ็นกระดาษแล้วสแกน มีผลเท่ากัน ขอแค่ระบุตัวผู้ลงนามได้และแสดงเจตนายอมรับ
 *   จึงไม่มีเหตุผลที่ต้องบังคับให้ผู้ใช้พิมพ์เอกสารออกมาเซ็นแล้วสแกนกลับ
 *   ซึ่งเป็นขั้นตอนที่ทำบนมือถือแทบไม่ได้
 *
 *   documentFile ยังรับอยู่แต่ไม่บังคับ — ใครอยากแนบเอกสารกระดาษที่เซ็นแล้ว
 *   เก็บไว้เป็นหลักฐานเพิ่มก็ยังทำได้ (ตรงกับเจตนาของ SRS ที่ให้เก็บเอกสารไว้ในระบบ)
 */
@Data
public class SignCopyrightTransferRequest {

    @NotBlank(message = "กรุณาลงลายมือชื่อเพื่อยืนยันการรับโอนลิขสิทธิ์")
    @Pattern(regexp = "^(data:image/(png|jpe?g);base64,.+|.+\\.(png|jpg|jpeg|PNG|JPG|JPEG))$",
             message = "ลายมือชื่อต้องเป็นไฟล์รูป .png หรือ .jpg เท่านั้น")
    private String signature;

    /**
     * ไฟล์เอกสารสัญญาที่ลงนามแล้ว — ไม่บังคับ
     *
     * ไม่ใส่ @NotBlank เพราะเป็นทางเลือก แต่ถ้าส่งมาต้องเป็นชนิดไฟล์ที่ถูกต้อง
     * (@Pattern ปล่อยผ่านค่า null ตามสเปกของ Bean Validation อยู่แล้ว)
     */
    @Pattern(regexp = "^(data:(image/(png|jpe?g)|application/pdf);base64,.+|.+\\.(pdf|png|jpg|jpeg|PDF|PNG|JPG|JPEG))$",
             message = "ไฟล์สัญญาต้องเป็น .pdf .png หรือ .jpg เท่านั้น")
    private String documentFile;
}
