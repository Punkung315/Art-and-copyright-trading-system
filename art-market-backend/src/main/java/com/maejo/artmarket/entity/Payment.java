package com.maejo.artmarket.entity;

import com.maejo.artmarket.enums.PaymentStatus;
import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

@Entity
@Table(name = "payment")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Payment {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer paymentId;

    /**
     * ยอดที่ผู้ซื้อต้องโอน ล็อกไว้ ณ ตอนที่กดชำระเงิน
     *
     * ดูเผินๆ เหมือนซ้ำกับผลรวมของ order_item แต่ไม่ใช่ — ยอดนี้คิดเฉพาะชิ้นที่
     * ผู้ขายยืนยันว่าพร้อมขาย ณ ตอนนั้น (ดู PaymentService.buildPreview)
     * ถ้าคำนวณสดทีหลัง ยอดจะขยับตามสถานะของผู้ขายที่เปลี่ยนหลังผู้ซื้อโอนเงินไปแล้ว
     * แล้วแอดมินจะเทียบสลิปไม่ตรงกับยอดในระบบ
     */
    @Column(nullable = false)
    private Double grandTotal;

    /** ส่วนค่าจัดส่งของ grandTotal ข้างบน แยกไว้ให้แสดงรายการย่อยได้โดยไม่ต้องลบเอาเอง */
    private Double shippingCost;
    // สลิปโอนเงินเก็บเป็น data URL ได้ → ต้องเป็น LONGTEXT
    @Column(columnDefinition = "LONGTEXT")
    private String slipTransfer;

    /**
     * สถานะการชำระเงิน — ของเดิมชื่อ transfer_status ซึ่งไปพ้องกับ
     * copyright_transfer.transfer_status ที่หมายถึง "สถานะการโอนลิขสิทธิ์" คนละเรื่องกัน
     * อ่านโค้ดที่หยิบสองตัวนี้มาปนกันแล้วแยกไม่ออกว่าอันไหนคืออะไร
     */
    @Enumerated(EnumType.STRING)
    @Column(name = "payment_status", nullable = false)
    private PaymentStatus paymentStatus;

    /**
     * เวลาที่ผู้ดูแลระบบกดยืนยันการโอนเงิน
     *
     * เป็นจุดเริ่มนับกำหนดยืนยันการจัดส่งอัตโนมัติ (app.delivery.auto-confirm-days)
     * ถ้าผู้ซื้อไม่กด "ได้รับสินค้าแล้ว" เอง ชิ้นที่จัดส่งแล้วจะถูกปิดเป็นจัดส่งสำเร็จเมื่อครบกำหนด
     */
    private LocalDateTime confirmedAt;

    @OneToOne
    @JoinColumn(name = "order_id", nullable = false, unique = true)
    private Orders order;
}
