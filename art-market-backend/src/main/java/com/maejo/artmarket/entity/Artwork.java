package com.maejo.artmarket.entity;

import com.maejo.artmarket.enums.ArtworkStatus;
import com.maejo.artmarket.enums.PublishStatus;
import com.maejo.artmarket.enums.ShippingCompany;
import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDate;

@Entity
@Table(name = "artwork")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Artwork {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer artworkId;
    @Column(nullable = false)
    private String artworkName;
    // รูปงานศิลปะเก็บเป็น data URL (base64) ได้ ซึ่งยาวเกิน VARCHAR(255) มาก
    // ถ้าไม่ระบุ columnDefinition Hibernate จะสร้างเป็น varchar(255) แล้ว insert พังทันที
    @Column(columnDefinition = "LONGTEXT")
    private String artworkImage;

    /**
     * ภาพตัวอย่างมีลายน้ำ (jpeg ย่อขนาด) — รูปที่ส่งให้ทุกคนที่ไม่ใช่เจ้าของงาน
     * สร้างตอนบันทึก/เปลี่ยนรูป และเติมให้งานเก่าตอนเปิดระบบ (ดู WatermarkBackfill)
     * เก็บไว้แทนการสร้างทุกครั้งที่มีคนเปิดหน้าค้นหา ซึ่งจะต้องวาดรูปใหม่หลายสิบรูปต่อคำขอ
     */
    @Column(columnDefinition = "LONGTEXT")
    private String watermarkedImage;
    private String artworkType;
    private String artworkStyle;
    private String artworkMediums;
    private String artworkMaterial;

    @Column(length = 1000)
    private String description;

    @Column(nullable = false)
    private Double price;
    /**
     * ราคาลิขสิทธิ์ — null = ไม่เปิดให้ซื้อลิขสิทธิ์ของงานชิ้นนี้
     * (ไม่มีคอลัมน์ copyrightAvailable แยก เพราะ null สื่อความหมายนั้นอยู่แล้ว)
     */
    private Double copyrightPrice;

    /**
     * true = ให้ระบบคำนวณราคาลิขสิทธิ์ให้อัตโนมัติจากราคาขาย (ดู ArtworkService)
     * false = ผู้ขายกรอกราคาเอง
     *
     * ต้องเก็บเป็น flag ใน DB ไม่ใช่แค่สถานะบนหน้าเว็บ เพราะเวลาผู้ขายแก้ "ราคาขาย"
     * ทีหลัง ระบบต้องรู้ว่าจะต้องคิดราคาลิขสิทธิ์ใหม่ตามไปด้วยไหม
     * ถ้าไม่เก็บไว้ ราคาลิขสิทธิ์จะค้างอยู่ที่ค่าเดิมเงียบๆ แบบเดียวกับ shippingCost
     */
    @Column(name = "copyright_auto_price", nullable = false,
            columnDefinition = "BOOLEAN NOT NULL DEFAULT TRUE")
    private boolean copyrightAutoPrice = true;

    /**
     * ค่าจัดส่ง "ประเมิน" เท่านั้น — ระบบคำนวณให้จากน้ำหนัก/ขนาด/ขนส่งที่ผู้ขายเลือก
     * ไว้โชว์บนหน้ารายละเอียดงานตอนที่ยังไม่รู้ที่อยู่ปลายทางของผู้ซื้อ
     *
     * ห้ามใช้ตัวนี้คิดเงิน — ค่าส่งจริงอยู่ที่ order_item.shipping_cost ซึ่งล็อกไว้
     * ตอนยืนยันคำสั่งซื้อเมื่อรู้ปลายทางแล้ว เหตุผลเดียวกับที่ order_item.price
     * แยกจาก artwork.price คือผู้ขายแก้ค่านี้ทีหลังได้ ออเดอร์เก่าต้องไม่กระทบ
     *
     * ชื่อคอลัมน์มีคำว่า _estimate ต่อท้ายโดยตั้งใจ ของเดิมชื่อ shipping_cost เฉยๆ
     * ซึ่งเหมือนกับ order_item.shipping_cost ที่เป็นยอดคิดเงินจริงเป๊ะ
     * อ่านโค้ดแล้วแยกไม่ออกว่ากำลังหยิบตัวไหนอยู่ จึงเคยมีบั๊กอ่านผิดตัวมาแล้ว
     */
    @Column(name = "shipping_cost_estimate")
    private Double shippingCostEstimate;

    /** ขนส่งที่ผู้ขายเลือกใช้ส่งชิ้นงานนี้ เลือกได้เจ้าเดียว */
    @Enumerated(EnumType.STRING)
    private ShippingCompany shippingCompany;

    /** น้ำหนักชิ้นงานพร้อมแพ็ค หน่วยกิโลกรัม — ใช้คำนวณค่าส่ง */
    private Double weight;
    private Double width;
    private Double length;
    private Double height;

    /**
     * วันที่ลงขาย — เปลี่ยนจาก String เป็น LocalDate แล้ว
     *
     * ของเดิมเก็บเป็น varchar ทำให้เรียงลำดับตามวันที่ไม่ได้ (เรียงแบบ string
     * "2569-1-5" มาก่อน "2569-10-1") ArtworkService จึงต้องหลบไปเรียงด้วย artworkId
     * แทน ซึ่งให้ผลผิดทันทีที่มีการแก้วันลงขายย้อนหลัง
     * และ varchar ยังรับค่าอะไรก็ได้ เช่น "เร็วๆ นี้" โดยไม่มีใครรู้จนกว่าจะพัง
     */
    @Column(nullable = false)
    private LocalDate publishDate;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private ArtworkStatus artworkStatus;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private PublishStatus publishStatus;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "seller_id", nullable = false)
    private Seller seller;
}
