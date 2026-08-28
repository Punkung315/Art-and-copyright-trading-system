package com.maejo.artmarket.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Embeddable;
import lombok.*;

/**
 * ที่อยู่ปลายทางของคำสั่งซื้อ เก็บเป็น "สำเนา" ไม่ใช่ FK ไปตาราง address
 *
 * ทำไมไม่ใช้ @ManyToOne Address:
 *   ผู้ใช้ลบที่อยู่ในสมุดที่อยู่ตัวเองได้ตลอดเวลา (UserService.deleteAddress ใช้
 *   orphanRemoval) ถ้าออเดอร์อ้าง FK ไว้ การลบจะพัง FK constraint ตอน flush
 *   ซึ่งเป็น error ที่หลุด try/catch เหมือนบั๊กตอนปฏิเสธผู้ขายที่เคยเจอมาแล้ว
 *
 *   และต่อให้แก้ FK ได้ ก็ยังผิดอยู่ดี — ผู้ใช้ "แก้ไข" ที่อยู่เดิมได้ด้วย
 *   ถ้าออเดอร์ชี้ไปที่แถวเดิม ที่อยู่ที่เคยส่งของไปแล้วจะเปลี่ยนย้อนหลัง
 *   ใบสั่งซื้อต้องบันทึกว่า "ตอนนั้นส่งไปที่ไหน" ไม่ใช่ "ตอนนี้เขาอยู่ที่ไหน"
 */
@Embeddable
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ShippingAddress {

    @Column(name = "ship_house_no")
    private String houseNo;

    @Column(name = "ship_village_no")
    private String villageNo;

    @Column(name = "ship_thoroughfare")
    private String thoroughfare;

    @Column(name = "ship_subdistrict")
    private String subdistrict;

    @Column(name = "ship_district")
    private String district;

    /** ใช้ตัดสินโซนค่าจัดส่ง ต้องมีค่าเสมอเมื่อคำสั่งซื้อถูกยืนยันแล้ว */
    @Column(name = "ship_province")
    private String province;

    @Column(name = "ship_postal_code")
    private String postalCode;

    public static ShippingAddress from(Address address) {
        return ShippingAddress.builder()
                .houseNo(address.getHouseNo())
                .villageNo(address.getVillageNo())
                .thoroughfare(address.getThoroughfare())
                .subdistrict(address.getSubdistrict())
                .district(address.getDistrict())
                .province(address.getProvince())
                .postalCode(address.getPostalCode())
                .build();
    }

    /** ที่อยู่แบบบรรทัดเดียวไว้โชว์บนหน้าเว็บและใบสั่งซื้อ */
    public String toDisplayString() {
        StringBuilder sb = new StringBuilder();
        appendIfPresent(sb, houseNo);
        appendIfPresent(sb, villageNo != null && !villageNo.isBlank() ? "หมู่ " + villageNo : null);
        appendIfPresent(sb, thoroughfare);
        appendIfPresent(sb, subdistrict);
        appendIfPresent(sb, district);
        appendIfPresent(sb, province);
        appendIfPresent(sb, postalCode);
        return sb.toString();
    }

    private void appendIfPresent(StringBuilder sb, String part) {
        if (part == null || part.isBlank()) return;
        if (!sb.isEmpty()) sb.append(" ");
        sb.append(part.trim());
    }
}
