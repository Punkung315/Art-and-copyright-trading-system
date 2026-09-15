package com.maejo.artmarket.entity;

import jakarta.persistence.*;
import lombok.*;
import java.util.ArrayList;
import java.util.List;

/**
 * ผู้ขาย — ใช้คีย์ร่วมกับ users เช่นเดียวกับ Buyer (ดูเหตุผลเต็มใน Buyer.java)
 *
 * seller.seller_id เป็นทั้ง PK และ FK ชี้ไป users.user_id
 *
 * ต่างจาก Buyer ตรงที่ตารางนี้มีข้อมูลของตัวเองจริง (verified) จึงยังต้องมีอยู่
 * ส่วน Buyer เก็บไว้เพราะเป็นเจ้าของความสัมพันธ์ orders/copyrightTransfers
 * และ SRS ระบุคลาสนี้ไว้ ถ้าจะตัดต้องแก้เอกสารตามด้วย
 */
@Entity
@Table(name = "seller")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Seller {

    @Id
    private Integer sellerId;

    @MapsId
    @OneToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "seller_id")
    private User user;

    /**
     * ผู้ดูแลระบบอนุมัติแล้วหรือยัง
     *
     * นี่คือแหล่งความจริงเรื่อง "เป็นผู้ขายที่ขายได้จริงหรือยัง"
     * ส่วน users.role = SELLER บอกได้แค่ว่า "สมัครแล้ว" เท่านั้น
     */
    @Column(nullable = false)
    @Builder.Default
    private boolean verified = false;

    @OneToMany(mappedBy = "seller", cascade = CascadeType.ALL, orphanRemoval = true)
    @Builder.Default
    private List<Artwork> artworks = new ArrayList<>();

    @OneToMany(mappedBy = "seller", cascade = CascadeType.ALL, orphanRemoval = true)
    @Builder.Default
    private List<CopyrightTransfer> copyrightTransfers = new ArrayList<>();
}
