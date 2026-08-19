package com.maejo.artmarket.dto;

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

    public static CartItemResponse from(CartItem c) {
        return CartItemResponse.builder()
                .cartItemId(c.getCartItemId())
                .artworkId(c.getArtwork().getArtworkId())
                .artworkName(c.getArtwork().getArtworkName())
                .artworkImage(c.getArtwork().getArtworkImage())
                .addDate(c.getAddDate())
                .priceAtAdd(c.getPriceAtAdd())
                .build();
    }
}
