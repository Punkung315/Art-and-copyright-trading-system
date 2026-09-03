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

    /**
     * ลายมือชื่อผู้ขาย — ผู้ขายแนบตอนตอบรับคำขอ
     *
     * พ.ร.บ. ลิขสิทธิ์ มาตรา 17 กำหนดว่าการโอนลิขสิทธิ์ต้องทำเป็นหนังสือ
     * และมีลายมือชื่อ "ทั้งผู้โอนและผู้รับโอน" — เดิมคอลัมน์นี้มีอยู่แต่ไม่มีโค้ดไหน
     * เขียนค่าลงเลย เอกสารที่ระบบออกให้จึงมีลายเซ็นฝ่ายเดียว (ของผู้ซื้อใน documentFile)
     */
    @Column(columnDefinition = "LONGTEXT")
    private String sellerSignature;

    /**
     * ลายมือชื่อผู้รับโอน — ผู้ซื้อเซ็นตอนลงนามสัญญา
     *
     * แยกจาก documentFile เพราะเป็นคนละอย่างกัน:
     *   buyerSignature = ลายมือชื่อ (บังคับ) เอาไปแสดงในช่องลงนามบนใบสัญญา
     *   documentFile   = ไฟล์เอกสารที่เซ็นกระดาษแล้วสแกนกลับ (ไม่บังคับ) เป็นหลักฐานแนบเพิ่ม
     *
     * เดิมมีแต่ documentFile ทำให้ลายเซ็นผู้ซื้อ "ฝัง" อยู่ในรูปถ่ายเอกสารทั้งใบ
     * ช่องลงนามฝั่งผู้รับโอนบนใบสัญญาจึงว่างเปล่าเสมอ ทั้งที่ผู้ซื้อเซ็นไปแล้ว
     */
    @Column(columnDefinition = "LONGTEXT")
    private String buyerSignature;

    /**
     * วันที่แต่ละฝ่ายลงนาม — คนละตัวกับ transferDate ซึ่งเป็นวันที่ "ยื่นคำขอ"
     *
     * สัญญาต้องบอกได้ว่าใครเซ็นวันไหน ไม่ใช่มีวันเดียวแล้วเอาไปแปะว่า "วันที่ทำสัญญา"
     * (หน้าพิมพ์เดิมใช้ transferDate แล้วติดป้ายผิดแบบนั้นอยู่)
     */
    private LocalDateTime sellerSignedDate;
    private LocalDateTime buyerSignedDate;

    /**
     * ราคาลิขสิทธิ์ที่ตกลงกัน ล็อกไว้ตอนยื่นคำขอ
     *
     * ห้ามอ่านสดจาก artwork.copyrightPrice เพราะผู้ขายแก้ราคาได้ตลอด
     * และระบบยังคำนวณใหม่ให้อัตโนมัติเมื่อราคาขายเปลี่ยน (price × 3)
     * ถ้าอ่านสด ใบสัญญาที่พิมพ์ย้อนหลังจะเปลี่ยนตัวเลขเอง และยอดที่ผู้ซื้อ
     * ต้องจ่ายก็ขยับได้หลังผู้ขายตอบรับไปแล้ว
     *
     * หลักเดียวกับ order_item.price และ copyright_payment.amount
     */
    @Column(nullable = false)
    private Double agreedPrice;

    /**
     * เวอร์ชันของข้อความสัญญาที่คู่สัญญาตกลงกัน ณ ตอนนั้น
     *
     * ข้อความสัญญาเป็นค่าคงที่ของระบบ (ทุกฉบับเงื่อนไขเดียวกัน) จึงไม่เก็บตัวข้อความรายแถว
     * แต่ต้องเก็บ "เวอร์ชัน" ไว้ ไม่งั้นวันที่แก้ข้อความสัญญา สัญญาเก่าทุกฉบับ
     * จะถูกพิมพ์ออกมาด้วยเงื่อนไขใหม่ที่ไม่มีใครเคยเซ็น
     */
    @Column(nullable = false, length = 20)
    private String termsVersion;

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

    /**
     * รายละเอียดข้อตกลงที่ผู้ซื้อระบุตอนยื่นคำขอ (ฟอร์ม Send Copyright Transfer ช่อง "รายละเอียดข้อตกลง")
     *
     * เดิมไม่มีคอลัมน์นี้ ข้อความที่ผู้ซื้อพิมพ์จึงถูกทิ้งไปตั้งแต่ชั้น DTO
     * ทำให้หน้าสัญญาทั้งฝั่งผู้ซื้อและผู้ขายแสดงหัวข้อ "รายละเอียดข้อตกลง" แบบว่างเปล่า
     * (คนละตัวกับ sellerResponseDetail ด้านล่าง ซึ่งเป็นคำตอบของ "ผู้ขาย")
     */
    @Column(length = 1000)
    private String agreement;

    // ---- เพิ่มเติม: คำตอบ/เหตุผลจากผู้ขายตอน Receive Copyright Transfer ----
    @Column(length = 1000)
    private String sellerResponseDetail;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "buyer_id", nullable = false)
    private Buyer buyer;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "seller_id", nullable = false)
    private Seller seller;

    /**
     * งานศิลปะที่ขอโอนลิขสิทธิ์ — เป็นตัวอ้างอิงหลักของสัญญา
     *
     * เดิมสัญญาผูกกับ Order อย่างเดียว ทำให้ต้อง "ซื้อชิ้นงานก่อน" ถึงจะขอลิขสิทธิ์ได้
     * แต่ลิขสิทธิ์กับตัวชิ้นงานเป็นสินค้าคนละชิ้นกัน ผู้ซื้อจึงควรขอซื้อเฉพาะลิขสิทธิ์ได้
     * โดยไม่ต้องซื้อชิ้นงานต้นฉบับ จึงย้ายตัวอ้างอิงหลักมาที่ Artwork แทน
     */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "artwork_id", nullable = false)
    private Artwork artwork;

    /**
     * คำสั่งซื้อที่เกี่ยวข้อง — เป็น null ได้
     *
     * ถ้าผู้ซื้อเคยสั่งซื้อชิ้นงานนี้อยู่แล้ว ระบบจะผูกคำสั่งซื้อนั้นไว้ให้เพื่อการอ้างอิง
     * แต่ถ้าขอซื้อเฉพาะลิขสิทธิ์โดยไม่ได้ซื้อชิ้นงาน field นี้จะว่าง
     */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "order_id")
    private Orders order;

    /**
     * ราคาที่ตกลงกันของสัญญาฉบับนี้ — จุดเดียวที่ตัดสินว่าราคาคือเท่าไหร่
     *
     * ต้องเช็ค "> 0" ไม่ใช่แค่ "!= null" เพราะข้อมูลเก่าจะมีค่าเป็น 0 ไม่ใช่ null:
     *
     *   ตอน Hibernate (ddl-auto: update) เพิ่มคอลัมน์ NOT NULL เข้าตารางที่มีข้อมูลอยู่แล้ว
     *   MySQL เติมค่าให้แถวเดิมด้วย 0 (ตัวเลข) และ '' (ข้อความ) — ไม่ใช่ NULL
     *   สัญญาทุกฉบับที่มีอยู่ก่อนอัปเดตจึงมี agreed_price = 0 และถ้าเช็คแค่ null
     *   หน้าเว็บจะแสดงราคาเป็น ฿0 ทั้งหมด และผู้ซื้อจะถูกเรียกเก็บเงิน 0 บาท
     *
     * fallback ไปที่ราคาลิขสิทธิ์ปัจจุบันของงาน ใช้เฉพาะกรณีข้อมูลเก่าแบบนั้นเท่านั้น
     * สัญญาที่สร้างหลังจากนี้จะมีราคาล็อกไว้ตั้งแต่ตอนยื่นคำขอเสมอ
     */
    public double effectiveAgreedPrice() {
        if (agreedPrice != null && agreedPrice > 0) return agreedPrice;
        Double current = artwork != null ? artwork.getCopyrightPrice() : null;
        return current != null ? current : 0.0;
    }

    @PrePersist
    protected void onCreate() {
        this.transferDate = LocalDateTime.now();
    }
}
