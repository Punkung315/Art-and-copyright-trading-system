package com.maejo.artmarket.dto;

import com.maejo.artmarket.entity.Artwork;
import com.maejo.artmarket.enums.ArtworkStatus;
import com.maejo.artmarket.enums.PublishStatus;
import com.maejo.artmarket.enums.ShippingCompany;
import lombok.Builder;
import lombok.Data;

/**
 * DTO สำหรับ View Art (ยูสเคส 3.1.2)
 * ใช้ตอนเปิดดูรายละเอียดผลงาน 1 ชิ้น — ส่ง field ครบทุกอันที่ SRS ระบุ (หน้า 23)
 * ข้อมูลผู้ขายแสดงให้ผู้ซื้อดูได้ แต่ไม่รวม FK raw id ที่ไม่จำเป็น
 */
@Data
@Builder
public class ArtworkDetailResponse {

    // --- ข้อมูลผลงาน (ตรงกับ field ที่ SRS View Art หน้า 23 ระบุทุกอัน) ---
    private Integer artworkId;
    private String artworkName;
    private String artworkImage;
    private String artworkType;
    private String artworkStyle;
    private String artworkMediums;
    private String artworkMaterial;
    private Double artworkSize;
    private String description;
    private Double price;
    private Double copyrightPrice;

    /**
     * ลิขสิทธิ์ถูกโอนให้ผู้อื่นไปแล้ว — ขอซื้อไม่ได้อีกตลอดไป
     *
     * ต้องส่งแยกจาก copyrightPrice เพราะ "ผู้ขายไม่เปิดขายลิขสิทธิ์" กับ "ขายไปแล้ว"
     * เป็นคนละสถานะในสายตาผู้ใช้ ถ้าดูจากราคาว่าง/ไม่ว่างอย่างเดียว
     * หน้าเว็บจะบอกได้แค่ "ไม่มีขาย" ซึ่งกำกวม
     */
    private Boolean copyrightSold;

    /** true = ราคาลิขสิทธิ์ด้านบนมาจากการคำนวณอัตโนมัติ ไม่ใช่ผู้ขายกรอกเอง */
    private boolean copyrightAutoPrice;

    /** ค่าจัดส่ง "ประเมิน" ยังไม่รู้ปลายทาง ค่าจริงคิดตอนยืนยันคำสั่งซื้อ */
    private Double shippingCost;

    private ShippingCompany shippingCompany;

    /** ชื่อขนส่งแบบอ่านได้ เช่น "ไปรษณีย์ไทย (EMS)" ไว้โชว์ตรงๆ ไม่ต้องแปลฝั่ง frontend */
    private String shippingCompanyName;

    private Double weight;
    private Double width;
    private Double length;
    private Double height;
    private String publishDate;
    private ArtworkStatus artworkStatus;
    private PublishStatus publishStatus;

    // --- ข้อมูลผู้ขาย (แสดงในหน้า detail เพื่อให้ผู้ซื้อรู้ว่างานนี้ของใคร) ---
    private Integer sellerId;
    private String sellerName;
    private String sellerProfileImage;
    /**
     * รหัส "ผู้ใช้" (users.user_id) ไม่ใช่รหัสในตาราง buyer/seller/artwork
     *
     * จำเป็นเพราะฝั่ง frontend รู้จักตัวตนของคนที่ login อยู่ผ่าน userId เท่านั้น
     * ถ้าเทียบกับ sellerId/buyerId ตรงๆ จะไม่มีวันตรงกัน (คนละ id space)
     * ทำให้เช็ค "นี่คืองาน/สัญญาของฉันไหม" ผิดพลาดแบบเงียบๆ
     */
    private Integer sellerUserId;

    /** ใช้ตอนที่ผู้เรียกรู้สถานะการขายลิขสิทธิ์แล้ว (หน้ารายละเอียดงาน) */
    public static ArtworkDetailResponse from(Artwork artwork, boolean copyrightSold) {
        ArtworkDetailResponse r = from(artwork);
        r.setCopyrightSold(copyrightSold);
        return r;
    }

    public static ArtworkDetailResponse from(Artwork artwork) {
        return ArtworkDetailResponse.builder()
                .artworkId(artwork.getArtworkId())
                .artworkName(artwork.getArtworkName())
                .artworkImage(artwork.getArtworkImage())
                .artworkType(artwork.getArtworkType())
                .artworkStyle(artwork.getArtworkStyle())
                .artworkMediums(artwork.getArtworkMediums())
                .artworkMaterial(artwork.getArtworkMaterial())
                .artworkSize(artwork.getArtworkSize())
                .description(artwork.getDescription())
                .price(artwork.getPrice())
                .copyrightPrice(artwork.getCopyrightPrice())
                .copyrightAutoPrice(artwork.isCopyrightAutoPrice())
                .shippingCost(artwork.getShippingCost())
                .shippingCompany(artwork.getShippingCompany())
                .shippingCompanyName(artwork.getShippingCompany() != null
                        ? artwork.getShippingCompany().getDisplayName() : null)
                .weight(artwork.getWeight())
                .width(artwork.getWidth())
                .length(artwork.getLength())
                .height(artwork.getHeight())
                .publishDate(artwork.getPublishDate())
                .artworkStatus(artwork.getArtworkStatus())
                .publishStatus(artwork.getPublishStatus())
                .sellerId(artwork.getSeller().getSellerId())
                .sellerName(artwork.getSeller().getUser().getFullName())
                .sellerProfileImage(artwork.getSeller().getUser().getProfileImage())
                .sellerUserId(artwork.getSeller().getUser().getUserId())
                .build();
    }
}
