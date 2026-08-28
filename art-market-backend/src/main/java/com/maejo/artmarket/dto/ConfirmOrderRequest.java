package com.maejo.artmarket.dto;

import jakarta.validation.constraints.NotNull;
import lombok.Data;

/**
 * DTO รับข้อมูลยืนยันคำสั่งซื้อ (ยูสเคส 3.1.11 Confirm Order)
 *
 * ต้องระบุที่อยู่ปลายทางเสมอ เพราะค่าจัดส่งคำนวณจากจังหวัดปลายทาง
 * ผู้ซื้อที่ยังไม่มีที่อยู่ในระบบต้องเพิ่มที่อยู่ก่อน (POST /api/users/me/addresses)
 * แล้วค่อยยืนยันคำสั่งซื้อ — ฝั่ง frontend บังคับขั้นตอนนี้ไว้ในหน้าตะกร้า
 */
@Data
public class ConfirmOrderRequest {

    @NotNull(message = "กรุณาเลือกที่อยู่สำหรับจัดส่ง")
    private Integer addressId;
}
