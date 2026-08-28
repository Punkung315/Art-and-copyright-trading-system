package com.maejo.artmarket.entity;

import com.maejo.artmarket.enums.ArtworkStatus;
import com.maejo.artmarket.enums.PublishStatus;
import com.maejo.artmarket.enums.ShippingCompany;
import jakarta.persistence.*;
import lombok.*;

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
    private String artworkType;
    private String artworkStyle;
    private String artworkMediums;
    private String artworkMaterial;
    private Double artworkSize;

    @Column(length = 1000)
    private String description;

    @Column(nullable = false)
    private Double price;
    private Double copyrightPrice;

    /**
     * ค่าจัดส่ง "ประเมิน" เท่านั้น — ระบบคำนวณให้จากน้ำหนัก/ขนาด/ขนส่งที่ผู้ขายเลือก
     * ไว้โชว์บนหน้ารายละเอียดงานตอนที่ยังไม่รู้ที่อยู่ปลายทางของผู้ซื้อ
     *
     * ห้ามใช้ตัวนี้คิดเงิน — ค่าส่งจริงอยู่ที่ order_item.shipping_cost ซึ่งล็อกไว้
     * ตอนยืนยันคำสั่งซื้อเมื่อรู้ปลายทางแล้ว เหตุผลเดียวกับที่ order_item.price
     * แยกจาก artwork.price คือผู้ขายแก้ค่านี้ทีหลังได้ ออเดอร์เก่าต้องไม่กระทบ
     */
    private Double shippingCost;

    /** ขนส่งที่ผู้ขายเลือกใช้ส่งชิ้นงานนี้ เลือกได้เจ้าเดียว */
    @Enumerated(EnumType.STRING)
    private ShippingCompany shippingCompany;

    /** น้ำหนักชิ้นงานพร้อมแพ็ค หน่วยกิโลกรัม — ใช้คำนวณค่าส่ง */
    private Double weight;
    private Double width;
    private Double length;
    private Double height;

    @Column(nullable = false)
    private String publishDate;

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
