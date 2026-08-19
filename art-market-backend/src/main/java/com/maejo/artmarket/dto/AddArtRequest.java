package com.maejo.artmarket.dto;

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

    @Positive(message = "ค่าขนส่งต้องมากกว่า 0")
    private Double shippingCost;

    private Double weight;
    private Double width;
    private Double length;
    private Double height;
}
