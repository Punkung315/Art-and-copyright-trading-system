package com.maejo.artmarket.dto;

import jakarta.validation.constraints.NotNull;
import lombok.Data;

/**
 * DTO รับการยืนยันความพร้อมของผู้ขาย (ยูสเคส 3.1.21 Confirm Availability For Art หน้า 43)
 * available=true  → ผู้ขายพร้อมขาย (availabilityStatus → AVAILABLE)
 * available=false → ผู้ขายไม่พร้อมขาย (availabilityStatus → UNAVAILABLE) เช่น ของหมด/ขายไปแล้วที่อื่น
 */
@Data
public class ConfirmAvailabilityRequest {
    @NotNull(message = "กรุณายืนยันความพร้อมในการขาย")
    private Boolean available;
}
