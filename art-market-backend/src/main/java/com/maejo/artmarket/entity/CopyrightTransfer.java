package com.maejo.artmarket.entity;

import com.maejo.artmarket.enums.CopyrightTransferStatus;
import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;

/**
 * ตาราง Copyright Transfer — อ้างอิงจาก Data Dictionary หน้า 128 พร้อมเพิ่มเติมจาก SRS ยูสเคส
 * Send Copyright Transfer (3.1.12) และ Receive Copyright Transfer (3.1.22)
 *
 * หมายเหตุ (ช่องโหว่ของ SRS): ยูสเคส Send Copyright Transfer ระบุว่าผู้ซื้อต้องกรอก
 * fullName, Address (houseNo, villageNo, thoroughfare, subdistrict, district, province, postalCode)
 * และ nationalNo ลงในฟอร์มสัญญา แต่ Data Dictionary เดิมของตาราง Copyright Transfer ไม่มี field
 * เหล่านี้เลย (มีแค่ documentFile, transferDate, transferStatus, sellerSignature)
 * จึงเพิ่ม field เหล่านี้เข้าไปเพื่อเก็บเป็น "snapshot" ของข้อมูลตอนทำสัญญา
 * (ตั้งใจแยกจาก User/Address เดิม เพราะข้อมูลในสัญญาไม่ควรเปลี่ยนตามถ้าผู้ใช้แก้โปรไฟล์ทีหลัง)
 *
 * เพิ่ม sellerResponseDetail สำหรับยูสเคส Receive Copyright Transfer ที่ระบุว่าผู้ขายต้อง
 * "บอกเหตุผลกลับไปหาผู้ซื้อ (detail)" ตอนตอบรับหรือปฏิเสธ — ไม่มีใน Data Dictionary เดิมเช่นกัน
 *
 * แนะนำให้ Pun อัปเดต Data Dictionary ในเอกสาร SRS เพิ่ม field เหล่านี้ให้ตรงกับโค้ดด้วย
 */
@Entity
@Table(name = "copyright_transfer")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CopyrightTransfer {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer copyrightId;

    @Column(columnDefinition = "LONGTEXT")
    private String documentFile;

    @Column(nullable = false, updatable = false)
    private LocalDateTime transferDate;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private CopyrightTransferStatus transferStatus;

    @Column(columnDefinition = "LONGTEXT")
    private String sellerSignature;

    // ---- เพิ่มเติม: ข้อมูลสัญญาที่ผู้ซื้อกรอกตอน Send Copyright Transfer ----
    @Column(nullable = false)
    private String fullName;

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

    @Column(nullable = false)
    private String nationalNo;

    // ---- เพิ่มเติม: คำตอบ/เหตุผลจากผู้ขายตอน Receive Copyright Transfer ----
    @Column(length = 1000)
    private String sellerResponseDetail;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "buyer_id", nullable = false)
    private Buyer buyer;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "seller_id", nullable = false)
    private Seller seller;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "order_id", nullable = false)
    private Orders order;

    @PrePersist
    protected void onCreate() {
        this.transferDate = LocalDateTime.now();
    }
}
