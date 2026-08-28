package com.maejo.artmarket.enums;

import lombok.Getter;

/**
 * บริษัทขนส่งที่ระบบรองรับ ผู้ขายเลือกได้ 1 เจ้าต่อชิ้นงาน
 *
 * แต่ละเจ้าคิดราคาคนละสูตร (ดู ShippingRateService):
 *   FLASH          — น้ำหนัก x ลิมิตขนาด x เส้นทาง (โซนมีผลกับราคา)
 *   KERRY          — แบ่งกล่องเป็น S/M/L/XL ตามผลบวกสามด้าน เรทเดียวทั้งประเทศ
 *   THAILAND_POST  — EMS คิดตามน้ำหนักล้วน เรทเดียวทั้งประเทศ
 *   JT             — น้ำหนัก x โซน (กทม.+ปริมณฑล ถูกกว่าเฉพาะพัสดุเบา)
 */
@Getter
public enum ShippingCompany {

    FLASH("Flash Express", 280.0, 50.0),
    KERRY("Kerry Express", 150.0, 20.0),
    THAILAND_POST("ไปรษณีย์ไทย (EMS)", 300.0, 20.0),
    JT("J&T Express", 280.0, 50.0);

    private final String displayName;

    /** ผลบวกสามด้าน (กว้าง+ยาว+สูง) สูงสุดที่ขนส่งเจ้านี้รับ หน่วยเซนติเมตร */
    private final double maxDimensionSumCm;

    /** น้ำหนักสูงสุดที่รับต่อชิ้น หน่วยกิโลกรัม */
    private final double maxWeightKg;

    ShippingCompany(String displayName, double maxDimensionSumCm, double maxWeightKg) {
        this.displayName = displayName;
        this.maxDimensionSumCm = maxDimensionSumCm;
        this.maxWeightKg = maxWeightKg;
    }
}
