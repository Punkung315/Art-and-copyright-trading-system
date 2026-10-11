package com.maejo.artmarket.dto;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import lombok.Data;

/**
 * DTO รับการตอบกลับของผู้ขาย (ยูสเคส 3.1.22 Receive Copyright Transfer หน้า 43-44)
 *
 * SRS ระบุว่าผู้ขาย "ตอบรับหรือปฏิเสธ...พร้อมทำการบอกเหตุผลกลับไปหาผู้ซื้อ (detail)"
 * แต่เหตุผลมีความหมายจริงเฉพาะตอน "ปฏิเสธ" เท่านั้น — ผู้ซื้อต้องรู้ว่าทำไมถึงไม่ได้
 * และควรแก้อะไรถ้าจะยื่นใหม่ ส่วนการตอบรับนั้นตัวการลงนามคือคำตอบอยู่แล้ว
 * การบังคับให้พิมพ์เหตุผลตอนตอบรับได้ผลเป็นข้อความขอไปทีอย่าง "ตกลง" ซึ่งไม่ช่วยใคร
 *
 * detail จึงบังคับเฉพาะตอนปฏิเสธ (ตรวจในเซอร์วิสด้วยเหตุผลเดียวกับ signature ด้านล่าง)
 */
@Data
public class ReceiveCopyrightTransferRequest {

    @NotNull(message = "กรุณาระบุการตัดสินใจ (true=ตอบรับ, false=ปฏิเสธ)")
    private Boolean approved;

    /**
     * เหตุผลที่ตอบกลับ — บังคับเมื่อ approved = false (ตรวจในเซอร์วิส ไม่ใช่ที่นี่)
     *
     * เหตุผลเดียวกับ signature: bean validation ไม่รู้จักเงื่อนไข
     * "บังคับเฉพาะเมื่ออีก field เป็นค่าหนึ่ง" ถ้าใส่ @NotBlank ตรงนี้
     * จะกลายเป็นบังคับทั้งสองกรณีเหมือนเดิม
     */
    private String detail;

    /**
     * ลายมือชื่อของผู้โอน — บังคับเมื่อ approved = true (ตรวจในเซอร์วิส ไม่ใช่ที่นี่)
     *
     * ที่ไม่ใส่ @NotBlank เพราะกรณีปฏิเสธไม่ต้องเซ็น
     * bean validation ไม่รู้จักเงื่อนไข "บังคับเฉพาะเมื่ออีก field เป็นค่าหนึ่ง"
     * ถ้าใส่ @NotBlank ตรงนี้จะทำให้ปฏิเสธคำขอไม่ได้เลย
     */
    @Pattern(regexp = "^(data:image/(png|jpe?g);base64,.+|.+\\.(png|jpg|jpeg|PNG|JPG|JPEG))$",
             message = "ลายมือชื่อต้องเป็นไฟล์รูป .png หรือ .jpg เท่านั้น")
    private String signature;
}
