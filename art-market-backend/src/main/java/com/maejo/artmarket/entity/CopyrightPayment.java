package com.maejo.artmarket.entity;

import com.maejo.artmarket.enums.PaymentStatus;
import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

/**
 * การชำระเงินค่าลิขสิทธิ์ — แยกตารางจาก payment ของการซื้อชิ้นงาน
 *
 * ทำไมไม่ใช้ตาราง payment เดิม:
 *   payment.order_id เป็น NOT NULL UNIQUE ผูกกับคำสั่งซื้อหนึ่งใบเสมอ
 *   แต่การซื้อลิขสิทธิ์ไม่จำเป็นต้องมีคำสั่งซื้อ (ผู้ซื้อขอซื้อเฉพาะลิขสิทธิ์
 *   โดยไม่ซื้อชิ้นงานต้นฉบับก็ได้ — ดู CopyrightTransfer.order ที่เป็น null ได้)
 *   ถ้าจะยัดลงตารางเดิมต้องปลด constraint แล้วโค้ดทุกที่ที่อ่าน payment.order
 *   ต้องมาเช็ค null เพิ่มทั้งหมด ซึ่งเสี่ยงพังของที่ใช้งานอยู่แล้ว
 *
 * ลำดับใน flow: ผู้ขายตอบรับ (SIGNED) → ผู้ซื้อชำระเงิน → แอดมินตรวจสลิป
 * → ผู้ซื้อจึงลงนามสัญญาได้ (ดู CopyrightTransferService.signAgreement)
 */
@Entity
@Table(name = "copyright_payment")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CopyrightPayment {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer copyrightPaymentId;

    /**
     * ยอดที่ต้องชำระ ล็อกไว้ ณ ตอนที่ผู้ซื้อกดจ่าย
     *
     * ไม่อ่านสดจาก artwork.copyrightPrice ตอนแสดงบิล เพราะผู้ขายแก้ราคาลิขสิทธิ์
     * ได้ตลอด (และระบบยังคำนวณใหม่ให้อัตโนมัติเมื่อราคาขายเปลี่ยน)
     * เหตุผลเดียวกับที่ order_item.price แยกจาก artwork.price
     */
    @Column(nullable = false)
    private Double amount;

    /** สลิปโอนเงินเก็บเป็น data URL ได้ → ต้องเป็น LONGTEXT */
    @Column(columnDefinition = "LONGTEXT")
    private String slipTransfer;

    /**
     * สถานะการชำระเงิน — ชื่อเดิม transfer_status และเป็น varchar(255) ธรรมดา
     * ทั้งที่ payment ฝั่งซื้อชิ้นงานประกาศเป็น ENUM แล้ว
     * varchar รับค่าที่ไม่มีในระบบได้เงียบๆ ตอนแก้ข้อมูลด้วยมือหรือ seed ผิด
     * จึงบังคับเป็น ENUM ให้ตรงกัน และเปลี่ยนชื่อให้สื่อว่าเป็นสถานะ "การจ่ายเงิน"
     */
    @Enumerated(EnumType.STRING)
    @Column(name = "payment_status", nullable = false,
            columnDefinition = "ENUM('AWAITING_PROOF','PENDING_CONFIRMATION','COMPLETED','REJECTED')")
    private PaymentStatus paymentStatus;

    private LocalDateTime paymentDate;

    /** สัญญาหนึ่งฉบับมีการชำระเงินได้ครั้งเดียว (อัปสลิปใหม่ = แก้แถวเดิม) */
    @OneToOne
    @JoinColumn(name = "copyright_id", nullable = false, unique = true)
    private CopyrightTransfer copyrightTransfer;

    @PrePersist
    protected void onCreate() {
        if (paymentDate == null) paymentDate = LocalDateTime.now();
    }
}
