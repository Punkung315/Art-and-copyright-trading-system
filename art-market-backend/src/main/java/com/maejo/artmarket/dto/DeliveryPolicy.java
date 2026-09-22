package com.maejo.artmarket.dto;

import com.maejo.artmarket.entity.Payment;
import com.maejo.artmarket.enums.PaymentStatus;

import java.time.LocalDateTime;

/**
 * กำหนดยืนยันการจัดส่งอัตโนมัติ ที่ DTO ใช้คำนวณวันที่แสดงบนหน้าเว็บ
 * ค่าจริงมาจาก app.delivery.auto-confirm-days (ตั้งโดย DeliveryAutoConfirmService ตอนสตาร์ท)
 */
public final class DeliveryPolicy {

    private static volatile int autoConfirmDays = 14;

    private DeliveryPolicy() {}

    public static void setAutoConfirmDays(int days) {
        autoConfirmDays = days;
    }

    public static int getAutoConfirmDays() {
        return autoConfirmDays;
    }

    /** วันที่ระบบจะยืนยันให้ — null ถ้ายังไม่ได้ยืนยันการชำระเงิน */
    public static LocalDateTime autoConfirmAt(Payment payment) {
        if (payment == null || payment.getPaymentStatus() != PaymentStatus.COMPLETED
                || payment.getConfirmedAt() == null) {
            return null;
        }
        return payment.getConfirmedAt().plusDays(autoConfirmDays);
    }
}
