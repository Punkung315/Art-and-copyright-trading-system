package com.maejo.artmarket.dto;

import com.maejo.artmarket.entity.OrderItem;
import com.maejo.artmarket.enums.AvailabilityStatus;
import lombok.Builder;
import lombok.Data;

import java.time.LocalDateTime;
import java.util.List;

/**
 * DTO สำหรับ View Quotation (ยูสเคส 3.1.14 หน้า 36)
 * SRS ระบุ field ครบ: orderId, dateTimeNow, sellerName, buyerName, sellerAddress,
 * buyerAddress, sellerTel, sellerEmail, price (รายชิ้น), totalAmount, Artwork ทั้งหมด
 *
 * ส่วนที่เพิ่มจาก SRS เป็นข้อมูลที่ "ใบเสนอราคาจริง" ต้องมีแต่ SRS ไม่ได้ระบุไว้
 * (เบอร์/อีเมลลูกค้า ที่อยู่จัดส่ง ค่าจัดส่ง ยอดสุทธิ) — ถ้าไม่มี ใบเสนอราคาจะบอก
 * ยอดที่ต้องโอนไม่ได้เลย เพราะราคาชิ้นงานอย่างเดียวไม่ใช่ยอดที่ผู้ซื้อจ่าย
 *
 * หมายเหตุการออกแบบ: โมเดลข้อมูลของ SRS (ER-Diagram) ไม่ได้ออกแบบรองรับกรณี Order เดียว
 * มีงานจากหลายผู้ขายปนกัน ใบเสนอราคานี้จึงอ้างอิงข้อมูลผู้ขายจาก "ชิ้นงานแรก" ในคำสั่งซื้อ
 * เป็นหลัก — ถ้าต้องรองรับหลายผู้ขายในคำสั่งซื้อเดียวจริงจัง ควรแยกใบเสนอราคาเป็นต่อผู้ขายแทน
 * (รายชิ้นจึงแนบ sellerName มาด้วย ใบเสนอราคาจะได้ระบุได้ว่าชิ้นไหนของใคร)
 */
@Data
@Builder
public class QuotationResponse {

    private Integer orderId;
    private LocalDateTime dateTimeNow;

    /** วันที่ของคำสั่งซื้อ — ใบเสนอราคาอ้างวันที่นี้ ไม่ใช่วันที่กดเปิดดู */
    private LocalDateTime orderDate;
    private LocalDateTime confirmDateTime;

    private String sellerName;
    private String sellerAddress;
    private String sellerTel;
    private String sellerEmail;

    private String buyerName;
    private String buyerAddress;
    private String buyerTel;
    private String buyerEmail;

    /**
     * เลขประจำตัวผู้เสียภาษีของลูกค้า = เลขบัตรประชาชน (บุคคลธรรมดาใช้เลขเดียวกัน)
     * null ได้ ถ้าผู้ใช้ยังไม่ได้กรอกตอนสมัคร
     */
    private String buyerTaxId;

    /** ที่อยู่ปลายทางของคำสั่งซื้อนี้ — สำเนาตอนยืนยันคำสั่งซื้อ ไม่ใช่ที่อยู่ปัจจุบัน */
    private String shippingAddress;

    /** ยอดของ "ทั้งใบ" — รวมทุกชิ้นไม่ว่าผู้ขายจะยืนยันความพร้อมขายแล้วหรือยัง */
    private Double totalAmount;
    private Double shippingCost;
    private Double grandTotal;

    /**
     * ยอดที่ต้องชำระจริง — ตัดชิ้นที่ผู้ขายแจ้งว่าไม่พร้อมจำหน่ายออกแล้ว
     * ต้องส่งมาให้ใบเสนอราคาด้วย ไม่งั้นผู้ซื้อจะเห็นยอดในใบเสนอราคาไม่ตรงกับยอดที่หน้าชำระเงิน
     */
    private Double payableTotalAmount;
    private Double payableShippingCost;
    private Double payableGrandTotal;

    /** true = มีบางชิ้นถูกตัดออกจากยอด (ผู้ขายแจ้งไม่พร้อมจำหน่าย) */
    private boolean partial;

    private List<QuotationItem> items;

    @Data
    @Builder
    public static class QuotationItem {
        /** ลำดับที่แสดงบนใบเสนอราคา เริ่มที่ 1 */
        private Integer no;
        private String artworkName;
        private String sellerName;

        /**
         * งานศิลปะเป็นงานชิ้นเดียว ระบบจึงล็อกจำนวนไว้ที่ 1 เสมอ
         * ส่งออกมาเป็น field จริงเพื่อให้ใบเสนอราคามีคอลัมน์ "จำนวน" ตามรูปแบบเอกสารมาตรฐาน
         */
        private Integer quantity;

        /** ราคาต่อหน่วย = ราคาที่ล็อกไว้ใน order_item */
        private Double price;
        /** ราคารวมของบรรทัดนี้ = price x quantity */
        private Double amount;

        private Double shippingCost;
        private String shippingCompanyName;

        private AvailabilityStatus availabilityStatus;

        public static QuotationItem from(OrderItem item, int no) {
            var artwork = item.getArtwork();
            var seller  = artwork != null ? artwork.getSeller() : null;
            var company = item.getShippingCompany() != null
                    ? item.getShippingCompany()
                    : (artwork != null ? artwork.getShippingCompany() : null);
            double price = item.getPrice() != null ? item.getPrice() : 0.0;
            return QuotationItem.builder()
                    .no(no)
                    .artworkName(artwork != null ? artwork.getArtworkName() : null)
                    .sellerName(seller != null ? seller.getUser().getFullName() : null)
                    .quantity(1)
                    .price(price)
                    .amount(price)
                    .shippingCost(shippingOf(item))
                    .shippingCompanyName(company != null ? company.getDisplayName() : null)
                    .availabilityStatus(item.getAvailabilityStatus())
                    .build();
        }
    }

    /**
     * ค่าจัดส่งของ 1 ชิ้น อ่านจาก order_item ที่ล็อกไว้ตอนยืนยันคำสั่งซื้อ
     * เหตุผลเดียวกับ OrderDetailResponse.shippingOf — ห้ามอ่านสดจาก artwork
     * เพราะผู้ขายแก้ราคาประเมินได้ตลอด ยอดในใบเสนอราคาที่ออกไปแล้วจะเปลี่ยนตาม
     */
    public static double shippingOf(OrderItem item) {
        return OrderCharge.lockedShippingOf(item);
    }

    /** formatAddress ใช้ซ้ำได้ทั้ง buyer/seller — รวม field ที่อยู่เป็นบรรทัดเดียว */
    public static String formatAddress(com.maejo.artmarket.entity.Address a) {
        if (a == null) return null;
        StringBuilder sb = new StringBuilder();
        if (a.getHouseNo() != null)      sb.append(a.getHouseNo()).append(" ");
        if (a.getVillageNo() != null)    sb.append("หมู่ ").append(a.getVillageNo()).append(" ");
        if (a.getThoroughfare() != null) sb.append(a.getThoroughfare()).append(" ");
        sb.append(a.getSubdistrict()).append(" ")
          .append(a.getDistrict()).append(" ")
          .append(a.getProvince()).append(" ")
          .append(a.getPostalCode());
        return sb.toString();
    }
}
