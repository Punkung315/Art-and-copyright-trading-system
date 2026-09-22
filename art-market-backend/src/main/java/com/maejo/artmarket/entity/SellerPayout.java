package com.maejo.artmarket.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

/**
 * การโอนเงินจากแพลตฟอร์มให้ผู้ขาย (1 แถว = ผู้ขาย 1 คน ใน 1 คำสั่งซื้อ)
 *
 * ผู้ซื้อโอนเงินเข้าบัญชีแพลตฟอร์ม → ผู้ดูแลระบบยืนยัน → ผู้ขายจัดส่ง
 * → จัดส่งสำเร็จ → ผู้ดูแลระบบโอนเงินต่อให้ผู้ขาย แล้วแนบสลิปไว้ที่นี่
 *
 * แยกรายผู้ขายเพราะคำสั่งซื้อหนึ่งใบมีงานจากหลายร้านได้ แต่ละร้านส่งของเสร็จไม่พร้อมกัน
 * ถ้าโอนรวมทั้งใบ ร้านที่ส่งเร็วต้องรอร้านที่ช้ากว่าโดยไม่มีเหตุผล
 *
 * amount ล็อกไว้ ณ ตอนโอน (ราคาผลงาน + ค่าจัดส่ง ของชิ้นที่พร้อมขาย) ไม่คำนวณสดทีหลัง
 * ด้วยเหตุผลเดียวกับ Payment.grandTotal — ยอดในหลักฐานต้องไม่ขยับตามข้อมูลที่แก้ภายหลัง
 */
@Entity
@Table(name = "seller_payout",
       uniqueConstraints = @UniqueConstraint(name = "uk_seller_payout_order_seller",
                                             columnNames = {"order_id", "seller_id"}))
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class SellerPayout {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer payoutId;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "order_id", nullable = false)
    private Orders order;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "seller_id", nullable = false)
    private Seller seller;

    @Column(nullable = false)
    private Double amount;

    /** สลิปโอนเงินให้ผู้ขาย (data URL) */
    @Column(columnDefinition = "LONGTEXT", nullable = false)
    private String slipTransfer;

    @Column(nullable = false)
    private LocalDateTime paidAt;

    /**
     * สำเนาบัญชีปลายทาง ณ ตอนโอน
     *
     * ผู้ขายแก้บัญชีในโปรไฟล์ได้ตลอด ถ้าอ้างอิงบัญชีปัจจุบันของผู้ขายตรงๆ
     * หลักฐานการโอนย้อนหลังจะเปลี่ยนตามไปด้วย แล้วตรวจไม่ได้ว่าเงินก้อนนี้เข้าบัญชีไหนจริง
     * (nullable เผื่อแถวที่โอนก่อนมีคอลัมน์เหล่านี้)
     */
    @Column(length = 100)
    private String bankName;

    @Column(length = 20)
    private String bankAccountNumber;

    @Column(length = 150)
    private String bankAccountName;
}
