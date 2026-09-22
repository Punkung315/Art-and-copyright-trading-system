package com.maejo.artmarket.entity;

import com.maejo.artmarket.enums.ThaiBank;
import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;
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

    // ---------------------------------------------------------------------
    // บัญชีรับเงิน — ผู้ดูแลระบบใช้โอนค่าผลงานให้ผู้ขายหลังจัดส่งสำเร็จ
    // nullable ทั้งหมดเพราะผู้ขายที่สมัครก่อนมีฟีเจอร์นี้ยังไม่มีข้อมูล
    // (ระบบบังคับให้กรอกก่อนเผยแพร่ผลงาน และก่อนแอดมินโอนเงินให้)
    // ---------------------------------------------------------------------

    @Enumerated(EnumType.STRING)
    @Column(length = 10)
    private ThaiBank bankCode;

    /** เลขบัญชี เก็บเฉพาะตัวเลข (ตัดขีด/ช่องว่างออกแล้ว) */
    @Column(length = 20)
    private String bankAccountNumber;

    /** ชื่อบัญชีตามหน้าสมุด — แอดมินเทียบกับชื่อผู้ขายก่อนโอน */
    @Column(length = 150)
    private String bankAccountName;

    /** รูปหน้าสมุดบัญชี (data URL) ไว้ยืนยันว่าบัญชีเป็นของผู้ขายจริง */
    @Column(columnDefinition = "LONGTEXT")
    private String bankBookImage;

    private LocalDateTime bankUpdatedAt;

    public boolean hasBankAccount() {
        return bankCode != null && bankAccountNumber != null && bankAccountName != null;
    }

    @OneToMany(mappedBy = "seller", cascade = CascadeType.ALL, orphanRemoval = true)
    @Builder.Default
    private List<Artwork> artworks = new ArrayList<>();

    @OneToMany(mappedBy = "seller", cascade = CascadeType.ALL, orphanRemoval = true)
    @Builder.Default
    private List<CopyrightTransfer> copyrightTransfers = new ArrayList<>();
}
