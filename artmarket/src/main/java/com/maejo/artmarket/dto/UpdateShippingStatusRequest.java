package com.maejo.artmarket.dto;

import com.maejo.artmarket.enums.ShippingStatus;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

/** DTO รับสถานะการจัดส่งใหม่ (ยูสเคส 3.1.24 Update Order หน้า 45) */
@Data
public class UpdateShippingStatusRequest {
    @NotNull(message = "กรุณาระบุสถานะการจัดส่ง")
    private ShippingStatus shippingStatus;
}
