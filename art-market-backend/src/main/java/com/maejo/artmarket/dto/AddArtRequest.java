package com.maejo.artmarket.dto;

import com.fasterxml.jackson.annotation.JsonFormat;
import com.maejo.artmarket.enums.ShippingCompany;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import lombok.Data;

import java.time.LocalDate;

/**
 * DTO รับข้อมูลเพิ่มงานศิลปะ (ยูสเคส 3.1.16 Add Art หน้า 38)
 * SRS ระบุ field บังคับ: artworkName, artworkImage, artworkType, artworkStyle,
 * artworkMediums, artworkMaterial, description, price, publishDate และขนาด (width/height)
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

    @NotBlank(message = "กรุณากรอกคำอธิบายผลงาน")
    private String description;

    @NotNull(message = "กรุณาระบุราคา")
    @Positive(message = "ราคาต้องมากกว่า 0")
    private Double price;

    /**
     * วันที่ลงขาย รูปแบบ ISO "yyyy-MM-dd" (Jackson แปลงให้เป็น LocalDate เอง)
     * ถ้าส่งรูปแบบอื่นมาจะได้ 400 พร้อมข้อความบอกรูปแบบที่ถูก แทนที่จะบันทึกขยะลงไปเงียบๆ
     * แบบสมัยที่คอลัมน์นี้ยังเป็น varchar
     */
    @NotNull(message = "กรุณาระบุวันที่ลงขาย")
    @JsonFormat(shape = JsonFormat.Shape.STRING, pattern = "yyyy-MM-dd")
    private LocalDate publishDate;

    // Optional fields
    /**
     * เปิดให้ซื้อลิขสิทธิ์ไหม — ไม่ส่งมา = เปิด (ค่าเริ่มต้นของระบบ)
     * ใช้ Boolean ไม่ใช่ boolean เพราะต้องแยก "ไม่ได้ส่งมา" ออกจาก "ส่ง false มา"
     */
    private Boolean copyrightAvailable;

    /**
     * ให้ระบบคำนวณราคาลิขสิทธิ์จากราคาขายให้ไหม — ไม่ส่งมา = คำนวณให้ (ค่าเริ่มต้น)
     * ถ้าเป็น true ค่า copyrightPrice ที่ส่งมาจะถูกมองข้าม ระบบคิดเองทั้งหมด
     */
    private Boolean copyrightAutoPrice;

    /** ใช้เฉพาะตอน copyrightAutoPrice = false เท่านั้น */
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

    /**
     * ความกว้าง — บังคับกรอก เพราะเป็นทั้งตัวคำนวณค่าส่งและตัวกรอง "ช่วงขนาด" ในหน้าค้นหา
     *
     * เดิมมีคอลัมน์ artworkSize แยกไว้ให้ตัวกรองใช้โดยเฉพาะ แต่ฝั่งหน้าเว็บ
     * บังคับให้ artworkSize = width เสมออยู่แล้ว (มีคอมเมนต์กำกับไว้ในโค้ดเก่า)
     * = เก็บความกว้างไว้สองที่โดยตั้งใจให้มีค่าเท่ากันตลอด ซึ่งรอวันหลุดออกจากกัน
     * จึงตัด artworkSize ทิ้งแล้วให้ตัวกรองอ่าน width โดยตรง
     */
    @NotNull(message = "กรุณาระบุความกว้างของผลงาน")
    @Positive(message = "ความกว้างต้องมากกว่า 0")
    private Double width;

    @Positive(message = "ความหนาต้องมากกว่า 0")
    private Double length;

    @Positive(message = "ความยาวต้องมากกว่า 0")
    private Double height;
}
