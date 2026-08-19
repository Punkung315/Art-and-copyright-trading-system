package com.maejo.artmarket.dto;

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

    @Positive(message = "ราคาลิขสิทธิ์ต้องมากกว่า 0")
    private Double copyrightPrice;

    @Positive(message = "ค่าขนส่งต้องมากกว่า 0")
    private Double shippingCost;

    private String publishDate;
    private Double weight;
    private Double width;
    private Double length;
    private Double height;
}
