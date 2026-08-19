package com.maejo.artmarket.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

/**
 * ตาราง Cart Item — ไม่มีอยู่ใน Data Dictionary เดิมของ SRS (10 ตาราง)
 *
 * หมายเหตุ (ช่องโหว่ของ SRS): ยูสเคส Add Cart (3.1.8), List Cart (3.1.9),
 * Remove Item (3.1.10) พูดถึง "Cart Item" ชัดเจนพร้อม field ที่ต้องมี:
 * artworkID (FK), addDate, priceAtAdd — แต่ Data Dictionary ที่แนบมาไม่มีตารางนี้เลย
 * จึงต้องเพิ่มตารางนี้เองเพื่อให้ flow ตะกร้าสินค้าทำงานได้จริง
 * แนะนำให้ Pun อัปเดต Data Dictionary ในเอกสาร SRS เพิ่มตาราง Cart Item ให้ตรงกับโค้ดด้วย
 *
 * priceAtAdd เก็บราคา ณ ตอนใส่ตะกร้า (เผื่อ seller แก้ราคาทีหลัง ราคาที่เห็นในตะกร้าจะไม่เปลี่ยนกะทันหัน)
 */
@Entity
@Table(name = "cart_item")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CartItem {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer cartItemId;

    @Column(nullable = false, updatable = false)
    private LocalDateTime addDate;

    @Column(nullable = false)
    private Double priceAtAdd;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "artwork_id", nullable = false)
    private Artwork artwork;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "buyer_id", nullable = false)
    private Buyer buyer;

    @PrePersist
    protected void onCreate() {
        this.addDate = LocalDateTime.now();
    }
}
