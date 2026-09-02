package com.maejo.artmarket.dto;

import jakarta.validation.constraints.NotNull;
import lombok.Data;

import java.util.List;

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

    /**
     * รายการในตะกร้าที่ต้องการสั่งซื้อรอบนี้
     *
     * null หรือ list ว่าง = สั่งซื้อทั้งตะกร้า (พฤติกรรมเดิม ไม่พังของที่เรียกอยู่แล้ว)
     * ระบุมา = สั่งเฉพาะรายการที่เลือก ที่เหลือยังค้างอยู่ในตะกร้าให้สั่งทีหลังได้
     */
    private List<Integer> cartItemIds;
}
