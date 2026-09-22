package com.maejo.artmarket.service;

import com.maejo.artmarket.entity.OrderItem;
import com.maejo.artmarket.entity.Payment;
import com.maejo.artmarket.enums.PaymentStatus;
import com.maejo.artmarket.enums.ShippingStatus;
import com.maejo.artmarket.repository.OrderItemRepository;
import com.maejo.artmarket.repository.PaymentRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.event.EventListener;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;

/**
 * ยืนยันการจัดส่งสำเร็จให้อัตโนมัติ เมื่อผู้ซื้อไม่เข้ามากดเอง
 *
 * กฎ: ชิ้นที่ "จัดส่งแล้ว" (มีเลขพัสดุ) และผู้ดูแลระบบยืนยันการชำระเงินมาแล้วครบ N วัน
 *     (app.delivery.auto-confirm-days ค่าเริ่มต้น 14) → เปลี่ยนเป็น "จัดส่งสำเร็จ"
 *
 * ชิ้นที่ยังไม่จัดส่งจะไม่ถูกปิดให้ ถึงจะเลยกำหนดแล้วก็ตาม
 * เพราะของยังไม่ออกจากร้าน การปิดเป็นจัดส่งสำเร็จจะเปิดทางให้โอนเงินให้ผู้ขายทั้งที่ผู้ซื้อยังไม่ได้ของ
 *
 * ทำงานตอนแอปสตาร์ท และทุกชั่วโมง (app.delivery.auto-confirm-check-ms)
 * — เซิร์ฟเวอร์ของโปรเจกต์ไม่ได้เปิดตลอดเวลา ถ้ารอแค่รอบชั่วโมง ของที่ครบกำหนดระหว่างปิดเครื่อง
 *   จะค้างไปอีกชั่วโมงหลังเปิด
 */
@Service
@Slf4j
@RequiredArgsConstructor
public class DeliveryAutoConfirmService {

    public static final String CONFIRMED_BY_BUYER = "BUYER";
    public static final String CONFIRMED_BY_AUTO  = "AUTO";

    private final OrderItemRepository orderItemRepository;
    private final PaymentRepository   paymentRepository;

    @Value("${app.delivery.auto-confirm-days:14}")
    private int autoConfirmDays;

    public int getAutoConfirmDays() {
        return autoConfirmDays;
    }

    /**
     * DTO เป็น static factory ฉีด config ไม่ได้ จึงฝากค่าไว้ที่ DeliveryPolicy
     * ให้หน้าเว็บแสดง "จะยืนยันให้อัตโนมัติวันที่ ..." ตรงกับที่ระบบทำจริง
     */
    @jakarta.annotation.PostConstruct
    void publishPolicy() {
        com.maejo.artmarket.dto.DeliveryPolicy.setAutoConfirmDays(autoConfirmDays);
    }

    @EventListener(ApplicationReadyEvent.class)
    public void onStartup() {
        backfillConfirmedAt();
        autoConfirmDelivered();
    }

    @Scheduled(fixedDelayString = "${app.delivery.auto-confirm-check-ms:3600000}",
               initialDelayString = "${app.delivery.auto-confirm-check-ms:3600000}")
    public void scheduled() {
        autoConfirmDelivered();
    }

    /** @return จำนวนชิ้นที่ถูกปิดเป็นจัดส่งสำเร็จในรอบนี้ */
    @Transactional
    public int autoConfirmDelivered() {
        LocalDateTime now = LocalDateTime.now();
        List<OrderItem> due = orderItemRepository.findShippedItemsPaidBefore(
                ShippingStatus.SHIPPED, PaymentStatus.COMPLETED, now.minusDays(autoConfirmDays));

        for (OrderItem item : due) {
            item.setShippingStatus(ShippingStatus.DELIVERED);
            item.setDeliveredAt(now);
            item.setDeliveryConfirmedBy(CONFIRMED_BY_AUTO);
        }
        orderItemRepository.saveAll(due);

        if (!due.isEmpty()) {
            log.info("ยืนยันการจัดส่งสำเร็จอัตโนมัติ {} รายการ (ครบ {} วันหลังยืนยันการชำระเงิน)",
                    due.size(), autoConfirmDays);
        }
        return due.size();
    }

    /**
     * คำสั่งซื้อที่ชำระเงินเสร็จก่อนมีคอลัมน์ payment.confirmed_at จะไม่มีวันที่เริ่มนับ
     * ถ้าปล่อย null ไว้ ชิ้นเหล่านั้นจะไม่มีวันถูกยืนยันอัตโนมัติ
     *
     * ไม่รู้วันยืนยันจริง จึงเริ่มนับจากวันที่อัปเดตระบบ (ผู้ซื้อได้เวลาครบ N วันเต็ม)
     * ดีกว่าเดาย้อนหลังแล้วปิดคำสั่งซื้อที่ผู้ซื้ออาจยังไม่ได้ของทันทีที่เปิดระบบ
     */
    @Transactional
    public void backfillConfirmedAt() {
        List<Payment> missing = paymentRepository.findByPaymentStatus(PaymentStatus.COMPLETED).stream()
                .filter(p -> p.getConfirmedAt() == null)
                .toList();
        if (missing.isEmpty()) return;

        LocalDateTime now = LocalDateTime.now();
        missing.forEach(p -> p.setConfirmedAt(now));
        paymentRepository.saveAll(missing);
        log.info("ตั้งวันที่ยืนยันการชำระเงินให้รายการเก่า {} รายการ (เริ่มนับกำหนดยืนยันการจัดส่งจากวันนี้)",
                missing.size());
    }
}
