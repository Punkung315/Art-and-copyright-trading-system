package com.maejo.artmarket.shipping;

import com.maejo.artmarket.enums.ShippingCompany;
import com.maejo.artmarket.enums.ShippingRoute;
import lombok.Builder;
import lombok.Data;

/**
 * ผลการคำนวณค่าจัดส่ง 1 ชิ้น
 *
 * เก็บรายละเอียดการคำนวณมาด้วย ไม่ใช่แค่ตัวเลขราคา เพราะ:
 *   - หน้าเว็บต้องอธิบายผู้ขาย/ผู้ซื้อได้ว่าราคานี้มาจากไหน
 *   - rateVersion ต้องบันทึกลง order_item ตอนคิดเงิน เพื่อให้ตรวจสอบย้อนหลังได้
 *     ว่าออเดอร์นั้นใช้ตารางราคาเวอร์ชันไหน แม้ภายหลังตารางจะถูกอัปเดตไปแล้ว
 */
@Data
@Builder
public class ShippingQuote {

    private ShippingCompany company;

    /** ค่าจัดส่งสุทธิ (รวมค่าธรรมเนียมพื้นที่แล้ว) หน่วยบาท */
    private Double cost;

    /** เวอร์ชันตารางราคาที่ใช้คำนวณ เช่น "FLASH-2569-Q1" */
    private String rateVersion;

    /** น้ำหนักที่ใช้คิดเงินจริง = max(น้ำหนักชั่ง, น้ำหนักปริมาตร) */
    private Double billableWeightKg;

    /** ผลบวกสามด้าน กว้าง+ยาว+สูง หน่วยเซนติเมตร */
    private Double dimensionSumCm;

    private ShippingRoute route;

    /** ค่าธรรมเนียมพื้นที่ห่างไกล/เกาะ ที่บวกเพิ่มจากราคาฐาน */
    private Double areaSurcharge;

    /** true = เป็นราคาประเมิน (ยังไม่รู้ปลายทาง) ไม่ใช่ราคาที่คิดเงินจริง */
    private boolean estimated;

    /** คำอธิบายสั้นๆ ไว้โชว์บนหน้าเว็บ */
    private String note;
}
