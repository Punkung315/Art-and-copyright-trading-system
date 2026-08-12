package com.maejo.artmarket.dto;

import com.maejo.artmarket.entity.Artwork;
import com.maejo.artmarket.enums.ArtworkStatus;
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
    private Double shippingCost;
    private Double weight;
    private Double width;
    private Double length;
    private Double height;
    private String publishDate;
    private ArtworkStatus artworkStatus;

    // --- ข้อมูลผู้ขาย (แสดงในหน้า detail เพื่อให้ผู้ซื้อรู้ว่างานนี้ของใคร) ---
    private Integer sellerId;
    private String sellerName;
    private String sellerProfileImage;

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
                .shippingCost(artwork.getShippingCost())
                .weight(artwork.getWeight())
                .width(artwork.getWidth())
                .length(artwork.getLength())
                .height(artwork.getHeight())
                .publishDate(artwork.getPublishDate())
                .artworkStatus(artwork.getArtworkStatus())
                .sellerId(artwork.getSeller().getSellerId())
                .sellerName(artwork.getSeller().getUser().getFullName())
                .sellerProfileImage(artwork.getSeller().getUser().getProfileImage())
                .build();
    }
}
