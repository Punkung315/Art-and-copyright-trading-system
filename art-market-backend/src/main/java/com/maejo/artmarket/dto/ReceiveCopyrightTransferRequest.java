package com.maejo.artmarket.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
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
