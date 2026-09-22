package com.maejo.artmarket.repository;

import com.maejo.artmarket.entity.OrderItem;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import com.maejo.artmarket.enums.PaymentStatus;
import com.maejo.artmarket.enums.ShippingStatus;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

public interface OrderItemRepository extends JpaRepository<OrderItem, Integer> {

    List<OrderItem> findByOrder_OrderId(Integer orderId);

    /** List Order (ฝั่งผู้ขาย) — หา order item ทั้งหมดที่เป็นงานของผู้ขายคนนี้ */
    List<OrderItem> findByArtwork_Seller_SellerId(Integer sellerId);

    /** Confirm Availability / Update Order — ตรวจว่า order item นี้เป็นของผู้ขายคนนี้จริง (security check) */
    Optional<OrderItem> findByOrderItemIdAndArtwork_Seller_SellerId(Integer orderItemId, Integer sellerId);

    /**
     * รหัสงานศิลปะทั้งหมดที่ผู้ใช้รายนี้เคยสั่งซื้อ
     * ใช้เป็นข้อมูลตั้งต้นของแถว "แนะนำสำหรับคุณ" ในหน้าแรก
     */
    @Query("SELECT DISTINCT oi.artwork.artworkId FROM OrderItem oi " +
           "WHERE oi.order.buyer.user.username = :username")
    List<Integer> findArtworkIdsPurchasedBy(@Param("username") String username);

    /**
     * ชิ้นที่ "จัดส่งแล้ว" แต่ผู้ซื้อยังไม่กดยืนยัน และผู้ดูแลระบบยืนยันการชำระเงินมานานเกินกำหนด
     * ใช้กับงานยืนยันการจัดส่งอัตโนมัติ (DeliveryAutoConfirmService)
     *
     * ชิ้นที่ยังไม่จัดส่ง (ยังไม่มีเลขพัสดุ) ไม่นับ — ปิดเป็นจัดส่งสำเร็จไม่ได้ทั้งที่ของยังไม่ออกจากร้าน
     */
    @Query("SELECT oi FROM OrderItem oi JOIN oi.order o JOIN o.payment p " +
           "WHERE oi.shippingStatus = :shipped " +
           "AND p.paymentStatus = :completed " +
           "AND p.confirmedAt IS NOT NULL AND p.confirmedAt <= :cutoff")
    List<OrderItem> findShippedItemsPaidBefore(@Param("shipped") ShippingStatus shipped,
                                               @Param("completed") PaymentStatus completed,
                                               @Param("cutoff") LocalDateTime cutoff);
}
