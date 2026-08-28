package com.maejo.artmarket.entity;

import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "address")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Address {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer addressId;
    private String houseNo;
    private String villageNo;
    private String thoroughfare;

    @Column(nullable = false)
    private String subdistrict;

    @Column(nullable = false)
    private String district;

    @Column(nullable = false)
    private String province;

    @Column(nullable = false)
    private String postalCode;

    /**
     * ที่อยู่ต้นทางสำหรับส่งของ — ผู้ขายเลือกได้ 1 รายการ
     *
     * จังหวัดของที่อยู่นี้เป็นตัวตัดสินเส้นทางค่าจัดส่ง (ดู CartService.quoteFor)
     * แยกจาก "ที่อยู่แรกในสมุด" โดยตั้งใจ เพราะบ้านกับที่ที่ส่งของออกไม่จำเป็นต้องที่เดียวกัน
     * เช่น ศิลปินอยู่กรุงเทพฯ แต่ส่งงานจากสตูดิโอที่เชียงใหม่ — คนละเรทค่าส่งกันเลย
     *
     * เก็บเป็น flag บนตาราง address ไม่ใช่ FK บน seller
     * เพราะผู้ใช้ลบที่อยู่ได้ตลอด ถ้าเป็น FK การลบจะพัง constraint ตอน flush
     * แต่ถ้าเป็น flag มันหายไปพร้อมแถวที่ถูกลบเอง ไม่ต้องไปตามเคลียร์
     *
     * ต้องระบุ name = "is_pickup" ให้ตรงกับชื่อคอลัมน์ที่ใช้ในไฟล์ SQL ทุกไฟล์
     * ถ้าปล่อยให้ Hibernate ตั้งเอง มันจะแปลง pickupAddress เป็น pickup_address
     * แล้วกลายเป็นสองคอลัมน์คนละอันกับที่ seed/migration เขียนถึง
     *
     * columnDefinition กำหนด DEFAULT FALSE ไว้ด้วย ไม่งั้นคอลัมน์ที่ Hibernate สร้าง
     * จะเป็น NOT NULL ที่ไม่มีค่า default แล้ว INSERT จาก SQL ที่ไม่ได้ระบุคอลัมน์นี้
     * จะพังด้วย error 1364 "Field doesn't have a default value"
     */
    @Column(name = "is_pickup", nullable = false,
            columnDefinition = "BOOLEAN NOT NULL DEFAULT FALSE")
    private boolean pickupAddress = false;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;
}
