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

    /** ช่วงขนาดผลงาน — สำหรับตัวกรอง "ขนาด" (เล็ก / กลาง / ใหญ่) วัดจากความกว้างของชิ้นงาน */
    private Double minSize;
    private Double maxSize;

    /**
     * สิ่งที่ผู้ขายเปิดขายของงานชิ้นนั้น — สำหรับตัวกรอง "สิ่งที่ขาย"
     *   null / ALL     = ไม่กรอง
     *   WITH_COPYRIGHT = เฉพาะงานที่ซื้อลิขสิทธิ์ได้ด้วย
     *   ORIGINAL_ONLY  = เฉพาะงานที่ขายแต่ตัวชิ้นงาน
     *
     * รับเป็น String ไม่ใช่ enum เพราะค่ามาจาก query string ของผู้ใช้โดยตรง
     * ถ้า bind เป็น enum แล้วมีค่าแปลก ๆ ส่งมา Spring จะตอบ 400 ทั้งคำขอ
     * ทั้งที่พฤติกรรมที่ถูกคือ "ไม่รู้จักค่านี้ก็แค่ไม่กรอง" เหมือนที่ sort ทำอยู่แล้ว
     */
    private String offer;

    /** ช่วงราคาลิขสิทธิ์ — ใช้เมื่อผู้ใช้สลับสไลเดอร์ไปกรองด้วยราคาลิขสิทธิ์แทนราคาชิ้นงาน */
    private Double minCopyrightPrice;
    private Double maxCopyrightPrice;

    /**
     * การเรียงลำดับ: newest (ค่าเริ่มต้น) | price_asc | price_desc | name
     *                | copyright_asc | copyright_desc
     *
     * แปลงเป็น Sort object ใน ArtworkService แทนการต่อสตริงเข้า ORDER BY
     * เพราะ ORDER BY ใน JPQL ใส่เป็นพารามิเตอร์ไม่ได้ และการต่อสตริงเองเสี่ยง SQL injection
     */
    private String sort;

    /** จำกัดจำนวนผลลัพธ์ — ใช้กับแถวแนะนำในหน้าแรก (null = ไม่จำกัด) */
    private Integer limit;
}
