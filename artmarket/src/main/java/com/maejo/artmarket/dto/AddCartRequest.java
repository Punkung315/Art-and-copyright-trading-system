package com.maejo.artmarket.dto;

import jakarta.validation.constraints.NotNull;
import lombok.Data;

/** DTO รับข้อมูลเพิ่มลงตะกร้า (ยูสเคส 3.1.8 Add Cart หน้า 31) */
@Data
public class AddCartRequest {
    @NotNull(message = "กรุณาเลือกงานศิลปะ")
    private Integer artworkId;
}
