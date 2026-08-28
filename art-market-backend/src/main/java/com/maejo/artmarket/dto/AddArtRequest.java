package com.maejo.artmarket.dto;

import com.maejo.artmarket.enums.ShippingCompany;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import lombok.Data;

/**
 * DTO รับข้อมูลเพิ่มงานศิลปะ (ยูสเคส 3.1.16 Add Art หน้า 38)
 * SRS ระบุ field บังคับ: artworkName, artworkImage, artworkType, artworkStyle,
 * artworkMediums, artworkMaterial, artworkSize, description, price, publishDate
 * งานที่เพิ่งเพิ่มจะถูก set publishStatus=DRAFT, artworkStatus=AVAILABLE อัตโนมัติ
 */
@Data
public class AddArtRequest {

    @NotBlank(message = "กรุณากรอกชื่อผลงาน")
    private String artworkName;

    @NotBlank(message = "กรุณาอัปโหลดรูปผลงาน")
    private String artworkImage;

    @NotBlank(message = "กรุณาระบุประเภทงานศิลปะ")
    private String artworkType;

    @NotBlank(message = "กรุณาระบุสไตล์งานศิลปะ")
    private String artworkStyle;

    @NotBlank(message = "กรุณาระบุเทคนิคงานศิลปะ")
    private String artworkMediums;

    @NotBlank(message = "กรุณาระบุวัสดุงานศิลปะ")
    private String artworkMaterial;

    @NotNull(message = "กรุณาระบุขนาดงานศิลปะ")
    @Positive(message = "ขนาดงานศิลปะต้องมากกว่า 0")
    private Double artworkSize;

    @NotBlank(message = "กรุณากรอกคำอธิบายผลงาน")
    private String description;

    @NotNull(message = "กรุณาระบุราคา")
    @Positive(message = "ราคาต้องมากกว่า 0")
    private Double price;

    @NotBlank(message = "กรุณาระบุวันที่ลงขาย")
    private String publishDate;

    // Optional fields
    @Positive(message = "ราคาลิขสิทธิ์ต้องมากกว่า 0")
    private Double copyrightPrice;

    /*
     * ไม่รับ shippingCost จาก frontend — ระบบคำนวณให้เองจากน้ำหนัก ขนาด และขนส่งที่เลือก
     * (ดู ShippingRateService) ถ้าปล่อยให้ผู้ขายพิมพ์เอง ตัวเลขที่โชว์หน้าเว็บจะไม่ตรง
     * กับค่าส่งจริงที่คำนวณตอนยืนยันคำสั่งซื้อ
     */

    /** ขนส่งที่ผู้ขายเลือกใช้: FLASH / KERRY / THAILAND_POST / JT */
    private ShippingCompany shippingCompany;

    @Positive(message = "น้ำหนักต้องมากกว่า 0")
    private Double weight;

    @Positive(message = "ความกว้างต้องมากกว่า 0")
    private Double width;

    @Positive(message = "ความหนาต้องมากกว่า 0")
    private Double length;

    @Positive(message = "ความยาวต้องมากกว่า 0")
    private Double height;
}
