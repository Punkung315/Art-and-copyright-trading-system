package com.maejo.artmarket.entity;

import com.maejo.artmarket.enums.AvailabilityStatus;
import com.maejo.artmarket.enums.ShippingCompany;
import com.maejo.artmarket.enums.ShippingStatus;
import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "order_item")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class OrderItem {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer orderItemId;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private AvailabilityStatus availabilityStatus;

    @Enumerated(EnumType.STRING)
    private ShippingStatus shippingStatus;

    @Column(nullable = false)
    private Double price;

    /**
     * ค่าจัดส่งจริงที่คิดเงิน ล็อกไว้ตอนยืนยันคำสั่งซื้อเมื่อรู้ที่อยู่ปลายทางแล้ว
     * ไม่อ่านสดจาก artwork.shipping_cost ตอนคิดเงิน เพราะค่านั้นเป็นแค่ราคาประเมิน
     * และผู้ขายแก้ได้ตลอด — ถ้าอ่านสด ยอดของออเดอร์ที่จ่ายไปแล้วจะเปลี่ยนตามไปด้วย
     */
    private Double shippingCost;

    /** ขนส่งที่ใช้จริงกับชิ้นนี้ สำเนาไว้เผื่อผู้ขายเปลี่ยนขนส่งของชิ้นงานทีหลัง */
    @Enumerated(EnumType.STRING)
    private ShippingCompany shippingCompany;

    /**
     * เวอร์ชันตารางราคาที่ใช้คำนวณ เช่น "FLASH-2569-Q1"
     * มีไว้ตรวจสอบย้อนหลังว่ายอดค่าส่งของออเดอร์นี้มาจากตารางชุดไหน
     */
    private String shippingRateVersion;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "artwork_id", nullable = false)
    private Artwork artwork;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "order_id", nullable = false)
    private Orders order;
}
