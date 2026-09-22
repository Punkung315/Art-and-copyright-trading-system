package com.maejo.artmarket.dto;

import com.maejo.artmarket.enums.ShippingStatus;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.Data;

/**
 * DTO รับสถานะการจัดส่งใหม่ (ยูสเคส 3.1.24 Update Order หน้า 45)
 *
 * หลักฐานที่ต้องแนบตามสถานะ (ตรวจใน SellerOrderService เพราะขึ้นกับสถานะปลายทาง):
 *   PREPARING (แพ็คสินค้าแล้ว) → packingImage   รูปสินค้าที่แพ็คแล้ว
 *   SHIPPED   (จัดส่งแล้ว)     → trackingNumber รหัสพัสดุของขนส่ง
 *   DELIVERED                  → ผู้ขายตั้งเองไม่ได้ ผู้ซื้อเป็นคนยืนยัน (หรือระบบยืนยันเมื่อครบกำหนด)
 */
@Data
public class UpdateShippingStatusRequest {
    @NotNull(message = "กรุณาระบุสถานะการจัดส่ง")
    private ShippingStatus shippingStatus;

    /** data URL ของรูป (png/jpg) — ไม่ส่งมาได้ถ้าเคยแนบไว้แล้วและไม่ต้องการเปลี่ยน */
    private String packingImage;

    @Size(max = 100, message = "รหัสพัสดุยาวเกินไป")
    private String trackingNumber;
}
