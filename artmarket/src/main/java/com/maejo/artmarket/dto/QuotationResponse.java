package com.maejo.artmarket.dto;

import com.maejo.artmarket.entity.OrderItem;
import lombok.Builder;
import lombok.Data;

import java.time.LocalDateTime;
import java.util.List;

/**
 * DTO สำหรับ View Quotation (ยูสเคส 3.1.14 หน้า 36)
 * SRS ระบุ field ครบ: orderId, dateTimeNow, sellerName, buyerName, sellerAddress,
 * buyerAddress, sellerTel, sellerEmail, price (รายชิ้น), totalAmount, Artwork ทั้งหมด
 *
 * หมายเหตุการออกแบบ: โมเดลข้อมูลของ SRS (ER-Diagram) ไม่ได้ออกแบบรองรับกรณี Order เดียว
 * มีงานจากหลายผู้ขายปนกัน ใบเสนอราคานี้จึงอ้างอิงข้อมูลผู้ขายจาก "ชิ้นงานแรก" ในคำสั่งซื้อ
 * เป็นหลัก — ถ้าต้องรองรับหลายผู้ขายในคำสั่งซื้อเดียวจริงจัง ควรแยกใบเสนอราคาเป็นต่อผู้ขายแทน
 */
@Data
@Builder
public class QuotationResponse {

    private Integer orderId;
    private LocalDateTime dateTimeNow;

    private String sellerName;
    private String sellerAddress;
    private String sellerTel;
    private String sellerEmail;

    private String buyerName;
    private String buyerAddress;

    private Double totalAmount;
    private List<QuotationItem> items;

    @Data
    @Builder
    public static class QuotationItem {
        private String artworkName;
        private Double price;

        public static QuotationItem from(OrderItem item) {
            return QuotationItem.builder()
                    .artworkName(item.getArtwork().getArtworkName())
                    .price(item.getPrice())
                    .build();
        }
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
