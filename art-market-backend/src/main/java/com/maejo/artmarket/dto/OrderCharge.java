package com.maejo.artmarket.dto;

import com.maejo.artmarket.entity.OrderItem;
import com.maejo.artmarket.enums.AvailabilityStatus;

import java.util.List;

/**
 * กฎ "ชิ้นไหนถูกเรียกเก็บเงินเท่าไร" ของคำสั่งซื้อหนึ่งใบ — แหล่งความจริงเดียวของสูตรคิดเงิน
 *
 * ทำไมต้องมีคลาสนี้:
 *   ชิ้นที่ผู้ขายแจ้งว่า "ไม่พร้อมจำหน่าย" ถูกตัดออกจากยอดที่ผู้ซื้อต้องโอนตั้งแต่ตอนสร้าง
 *   การชำระเงินแล้ว (ดู PaymentService) แต่ DTO ที่ส่งให้หน้าผู้ดูแลระบบยังรวมราคาชิ้นนั้น
 *   อยู่ในช่อง totalPrice ทำให้ "ค่าชิ้นงานรวม + ค่าจัดส่ง" ไม่เท่ากับ "ยอดสุทธิที่ต้องโอน"
 *   หน้าตรวจสอบจึงขึ้นคำเตือนยอดไม่ตรงกับคำสั่งซื้อที่ปกติดีทุกใบที่มีของขาด
 *
 *   ผู้ดูแลระบบต้องเทียบตัวเลขบนสลิปกับยอดในระบบให้ได้ภายในไม่กี่วินาที
 *   ตัวเลขที่บวกกันไม่ลงจึงไม่ใช่แค่เรื่องความสวยงาม — มันทำให้ตรวจสลิปไม่ได้เลย
 *
 * หมายเหตุ: ตอนที่มีการชำระเงินแล้ว ทุกชิ้นถูกตอบความพร้อมขายไปแล้วเสมอ
 * (PaymentService ไม่ให้จ่ายจนกว่าผู้ขายจะตอบครบ) จึงไม่มีสถานะ PENDING_CONFIRMATION ค้าง
 */
public final class OrderCharge {

    private OrderCharge() {}

    /** ชิ้นนี้ถูกเรียกเก็บเงินไหม — ไม่พร้อมจำหน่าย = ไม่เก็บ */
    public static boolean isCharged(OrderItem item) {
        return item != null && item.getAvailabilityStatus() == AvailabilityStatus.AVAILABLE;
    }

    /**
     * ค่าจัดส่งที่ล็อกไว้ตอนยืนยันคำสั่งซื้อ (ยังไม่สนว่าถูกเรียกเก็บหรือไม่)
     *
     * ห้ามอ่านจาก artwork.shippingCostEstimate เป็นหลัก — นั่นเป็นราคาประเมินที่ผู้ขาย
     * แก้ได้ตลอด ถ้าอ่านสด ยอดของคำสั่งซื้อที่โอนเงินไปแล้วจะเปลี่ยนตามผู้ขายไปด้วย
     * fallback มีไว้ให้ออเดอร์เก่าที่สร้างก่อนมีคอลัมน์ order_item.shipping_cost เท่านั้น
     */
    public static double lockedShippingOf(OrderItem item) {
        if (item == null) return 0.0;
        if (item.getShippingCost() != null) return item.getShippingCost();
        var artwork = item.getArtwork();
        return artwork != null && artwork.getShippingCostEstimate() != null
                ? artwork.getShippingCostEstimate() : 0.0;
    }

    /** ราคาชิ้นงานที่เรียกเก็บจริง — 0 ถ้าผู้ขายแจ้งไม่พร้อมจำหน่าย */
    public static double chargedPriceOf(OrderItem item) {
        if (!isCharged(item) || item.getPrice() == null) return 0.0;
        return item.getPrice();
    }

    /** ค่าจัดส่งที่เรียกเก็บจริง — 0 ถ้าไม่ได้ส่งของชิ้นนี้ */
    public static double chargedShippingOf(OrderItem item) {
        return isCharged(item) ? lockedShippingOf(item) : 0.0;
    }

    /** รวมค่าชิ้นงานที่เรียกเก็บจริงทั้งคำสั่งซื้อ */
    public static double chargedItemTotal(List<OrderItem> items) {
        return items == null ? 0.0
                : items.stream().mapToDouble(OrderCharge::chargedPriceOf).sum();
    }

    /** รวมค่าจัดส่งที่เรียกเก็บจริงทั้งคำสั่งซื้อ */
    public static double chargedShippingTotal(List<OrderItem> items) {
        return items == null ? 0.0
                : items.stream().mapToDouble(OrderCharge::chargedShippingOf).sum();
    }
}
