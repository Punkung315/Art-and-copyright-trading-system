package com.maejo.artmarket.dto;

import lombok.Data;

/**
 * DTO รับ parameter การค้นหาจาก frontend (ยูสเคส Search Art หน้า 22)
 * SRS ระบุว่าค้นหาได้ด้วย artworkName หรือ artworkType เป็นต้น
 * ใช้เป็น @ModelAttribute ใน Controller (รับผ่าน query string: ?keyword=...&artworkType=...)
 */
@Data
public class ArtworkSearchRequest {

    /** ค้นหาด้วยชื่อ (artworkName) — ตรงกับ Basic Flow ข้อ 2 ใน SRS */
    private String keyword;

    /** กรองด้วยประเภท (artworkType) — ตรงกับตัวอย่างที่ SRS ระบุ */
    private String artworkType;

    /** กรองด้วยสไตล์ (artworkStyle) */
    private String artworkStyle;

    /** กรองด้วยราคาขั้นต่ำ (เพิ่มเติมจาก SRS เพื่อประสบการณ์ผู้ใช้ที่ดีขึ้น) */
    private Double minPrice;

    /** กรองด้วยราคาขั้นสูง */
    private Double maxPrice;

    /** กรองด้วยเทคนิค (artworkMediums) เช่น สีน้ำมัน / สีอะคริลิก — สำหรับตัวกรองในหน้า Search */
    private String artworkMediums;

    /** ช่วงขนาดผลงาน — สำหรับตัวกรอง "ขนาด" (เล็ก / กลาง / ใหญ่) */
    private Double minSize;
    private Double maxSize;

    /**
     * การเรียงลำดับ: newest (ค่าเริ่มต้น) | price_asc | price_desc | name
     *
     * แปลงเป็น Sort object ใน ArtworkService แทนการต่อสตริงเข้า ORDER BY
     * เพราะ ORDER BY ใน JPQL ใส่เป็นพารามิเตอร์ไม่ได้ และการต่อสตริงเองเสี่ยง SQL injection
     */
    private String sort;

    /** จำกัดจำนวนผลลัพธ์ — ใช้กับแถวแนะนำในหน้าแรก (null = ไม่จำกัด) */
    private Integer limit;
}
