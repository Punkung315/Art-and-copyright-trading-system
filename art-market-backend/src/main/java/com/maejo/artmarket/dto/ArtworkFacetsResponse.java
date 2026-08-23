package com.maejo.artmarket.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;

import java.util.List;

/**
 * DTO ส่งรายการตัวเลือกของตัวกรองในหน้า Search พร้อมจำนวนผลงานในแต่ละตัวเลือก
 *
 * ทำไมต้องมี: ถ้า hardcode รายการ "ประเภท / สไตล์ / เทคนิค" ไว้ในโค้ด frontend
 * พอผู้ขายเพิ่มงานประเภทใหม่ ตัวกรองจะไม่มีตัวเลือกนั้นให้เลือก
 * endpoint นี้อ่านค่าจริงที่มีอยู่ในฐานข้อมูลมาให้ ตัวกรองจึงอัปเดตตามข้อมูลเสมอ
 *
 * นับเฉพาะงานที่ publishStatus = PUBLISHED เท่านั้น
 */
@Data
@Builder
public class ArtworkFacetsResponse {

    private List<FacetValue> types;
    private List<FacetValue> styles;
    private List<FacetValue> mediums;

    /** ราคาต่ำสุด/สูงสุดที่มีอยู่จริง — ใช้ตั้งค่าเริ่มต้นของ slider ช่วงราคา */
    private Double minPrice;
    private Double maxPrice;

    @Data
    @Builder
    @AllArgsConstructor
    public static class FacetValue {
        private String value;
        private long count;
    }
}
