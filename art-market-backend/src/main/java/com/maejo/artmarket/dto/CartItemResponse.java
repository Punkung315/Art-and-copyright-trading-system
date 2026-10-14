package com.maejo.artmarket.dto;

import com.maejo.artmarket.image.ArtworkImages;

import com.maejo.artmarket.entity.CartItem;
import lombok.Builder;
import lombok.Data;

import java.time.LocalDateTime;

/**
 * DTO สำหรับ List Cart (ยูสเคส 3.1.9 หน้า 32)
 * SRS ระบุ field: artworkName, addDate, priceAtAdd, totalPrice (totalPrice คำนวณรวมที่ระดับ list ไม่ใช่ item)
 */
@Data
@Builder
public class CartItemResponse {
    private Integer cartItemId;
    private Integer artworkId;
    private String  artworkName;
    private String  artworkImage;
    private LocalDateTime addDate;
    private Double  priceAtAdd;

    /**
     * ข้อมูลงานศิลปะแบบย่อ (รวมชื่อผู้ขายและสถานะ)
     * เพิ่มเข้ามาเพื่อให้หน้าตะกร้าแสดงผลได้ครบในการเรียก API ครั้งเดียว
     * ไม่ต้องยิง GET /api/artworks/{id} ซ้ำทีละชิ้น
     */
    private ArtworkSummaryResponse artwork;

    public static CartItemResponse from(CartItem c) {
        return CartItemResponse.builder()
                .cartItemId(c.getCartItemId())
                .artworkId(c.getArtwork().getArtworkId())
                .artworkName(c.getArtwork().getArtworkName())
                .artworkImage(ArtworkImages.publicImageOf(c.getArtwork()))
                .addDate(c.getAddDate())
                .priceAtAdd(c.getPriceAtAdd())
                .artwork(ArtworkSummaryResponse.from(c.getArtwork()))
                .build();
    }
}
