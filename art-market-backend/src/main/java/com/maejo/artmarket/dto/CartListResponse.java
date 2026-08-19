package com.maejo.artmarket.dto;

import lombok.Builder;
import lombok.Data;

import java.util.List;

/** ห่อ list ของ CartItemResponse พร้อม totalPrice ตามที่ SRS List Cart ระบุ */
@Data
@Builder
public class CartListResponse {
    private List<CartItemResponse> items;
    private Double totalPrice;
}
