package com.maejo.artmarket.dto;

import com.maejo.artmarket.enums.ShippingCompany;
import jakarta.validation.constraints.Positive;
import lombok.Data;

/**
 * DTO รับข้อมูลแก้ไขงานศิลปะ (ยูสเคส 3.1.18 Edit Art หน้า 40)
 * SRS ระบุ field เดียวกับ Add Art แต่ทุก field เป็น optional (partial update)
 * ส่งมาแค่ field ที่ต้องการเปลี่ยน field ที่ไม่ส่งจะคงค่าเดิมไว้
 *
 * หมายเหตุ: ไม่อนุญาตให้แก้ artworkStatus และ publishStatus ที่นี่
 *   - publishStatus เปลี่ยนได้ผ่าน Publish Art เท่านั้น (ยูสเคส 3.1.19)
 *   - artworkStatus ระบบเปลี่ยนให้อัตโนมัติตาม flow การสั่งซื้อ
 */
@Data
public class EditArtRequest {

    private String artworkName;
    private String artworkImage;
    private String artworkType;
    private String artworkStyle;
    private String artworkMediums;
    private String artworkMaterial;

    @Positive(message = "ขนาดงานศิลปะต้องมากกว่า 0")
    private Double artworkSize;

    private String description;

    @Positive(message = "ราคาต้องมากกว่า 0")
    private Double price;

    /**
     * เปิด/ปิดการขายลิขสิทธิ์ — ไม่ส่งมา = ไม่ได้ตั้งใจเปลี่ยน ยึดสถานะเดิมของชิ้นงาน
     *
     * ของเดิมไม่มี field นี้ ทำให้ปิดการขายลิขสิทธิ์ไม่ได้เลย เพราะ backend เช็ค
     * copyrightPrice != null อย่างเดียว จึงไม่มีทางเซ็ตกลับเป็น null ได้
     */
    private Boolean copyrightAvailable;

    /** สลับโหมดคำนวณอัตโนมัติ — ไม่ส่งมา = คงโหมดเดิมไว้ */
    private Boolean copyrightAutoPrice;

    /** ใช้เฉพาะตอนโหมดคำนวณอัตโนมัติปิดอยู่ */
    @Positive(message = "ราคาลิขสิทธิ์ต้องมากกว่า 0")
    private Double copyrightPrice;

    /* shippingCost ไม่รับจาก frontend — ระบบคำนวณให้ (ดูหมายเหตุใน AddArtRequest) */

    /** ขนส่งที่ผู้ขายเลือกใช้: FLASH / KERRY / THAILAND_POST / JT */
    private ShippingCompany shippingCompany;

    private String publishDate;

    @Positive(message = "น้ำหนักต้องมากกว่า 0")
    private Double weight;

    @Positive(message = "ความกว้างต้องมากกว่า 0")
    private Double width;

    @Positive(message = "ความหนาต้องมากกว่า 0")
    private Double length;

    @Positive(message = "ความยาวต้องมากกว่า 0")
    private Double height;
}
