package com.maejo.artmarket.dto;

import com.maejo.artmarket.entity.Artwork;
import com.maejo.artmarket.enums.ArtworkStatus;
import com.maejo.artmarket.enums.PublishStatus;
import lombok.Builder;
import lombok.Data;

/**
 * DTO สำหรับ Search Art (ยูสเคส 3.1.1)
 * ใช้ตอนแสดงรายการผลงานในหน้าค้นหา — ส่งแค่ข้อมูลที่จำเป็นสำหรับ card/thumbnail
 * ไม่ส่ง field ทุกอันของ Artwork เพราะ bandwidth และ security (ไม่ expose ข้อมูลที่ไม่จำเป็น)
 *
 * ชื่อ field ตรงกับที่ SRS (View Art หน้า 23) ระบุไว้ว่าต้องแสดง
 */
@Data
@Builder
public class ArtworkSummaryResponse {

    private Integer artworkId;
    private String artworkName;
    private String artworkImage;
    private String artworkType;
    private String artworkStyle;
    private Double price;
    private ArtworkStatus artworkStatus;
    // ต้องส่ง publishStatus ออกมาด้วย ไม่งั้นหน้า "ผลงานของฉัน" ของผู้ขาย
    // แยกไม่ออกว่าชิ้นไหนเป็นฉบับร่าง (DRAFT) ชิ้นไหนเผยแพร่แล้ว
    private PublishStatus publishStatus;

    // ข้อมูลผู้ขาย (แสดงบน card ว่างานนี้เป็นของใคร)
    private Integer sellerId;
    private String sellerName; // มาจาก seller.user.fullName
    /**
     * รหัส "ผู้ใช้" (users.user_id) ไม่ใช่รหัสในตาราง buyer/seller/artwork
     *
     * จำเป็นเพราะฝั่ง frontend รู้จักตัวตนของคนที่ login อยู่ผ่าน userId เท่านั้น
     * ถ้าเทียบกับ sellerId/buyerId ตรงๆ จะไม่มีวันตรงกัน (คนละ id space)
     * ทำให้เช็ค "นี่คืองาน/สัญญาของฉันไหม" ผิดพลาดแบบเงียบๆ
     */
    private Integer sellerUserId;

    /**
     * ราคาลิขสิทธิ์ และสถานะว่าขายไปแล้วหรือยัง
     *
     * ต้องมีในระดับ summary ไม่ใช่เฉพาะหน้า detail เพราะหน้าค้นหาต้องกรองและ
     * แสดง "ซื้อลิขสิทธิ์ได้" บนการ์ดได้โดยไม่ต้องยิง API รายชิ้น
     * (ของเดิมการ์ดมีป้ายนี้อยู่แล้วแต่ไม่เคยขึ้นเลย เพราะข้อมูลไม่เคยถูกส่งมา)
     */
    private Double  copyrightPrice;
    private boolean copyrightSold;

    /**
     * ขนาดชิ้นงาน — ไว้แสดงบนการ์ดผลการค้นหา
     * ผู้ซื้อเลือกงานจากขนาดจริงพอ ๆ กับจากราคา แต่เดิมต้องกดเข้าไปในแต่ละชิ้นถึงจะเห็น
     */
    private Double width;
    private Double height;

    /** แปลง Entity → DTO ในที่เดียว ไม่ต้องกระจาย logic ไปหลายที่ */
    public static ArtworkSummaryResponse from(Artwork artwork) {
        return from(artwork, false);
    }

    /**
     * @param copyrightSold ลิขสิทธิ์ของชิ้นนี้ถูกโอนจบไปแล้วหรือยัง
     *                      ผู้เรียกต้องหามาให้ (ดู CopyrightTransferRepository.findSoldArtworkIds)
     *                      DTO ไม่ควรไปเรียก repository เองเพราะจะกลายเป็น N+1 ทันที
     */
    public static ArtworkSummaryResponse from(Artwork artwork, boolean copyrightSold) {
        return ArtworkSummaryResponse.builder()
                .copyrightPrice(artwork.getCopyrightPrice())
                .copyrightSold(copyrightSold)
                .width(artwork.getWidth())
                .height(artwork.getHeight())
                .artworkId(artwork.getArtworkId())
                .artworkName(artwork.getArtworkName())
                .artworkImage(artwork.getArtworkImage())
                .artworkType(artwork.getArtworkType())
                .artworkStyle(artwork.getArtworkStyle())
                .price(artwork.getPrice())
                .artworkStatus(artwork.getArtworkStatus())
                .publishStatus(artwork.getPublishStatus())
                .sellerId(artwork.getSeller().getSellerId())
                .sellerName(artwork.getSeller().getUser().getFullName())
                .sellerUserId(artwork.getSeller().getUser().getUserId())
                .build();
    }
}
