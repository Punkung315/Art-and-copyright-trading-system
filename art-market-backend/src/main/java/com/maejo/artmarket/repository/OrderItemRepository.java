package com.maejo.artmarket.repository;

import com.maejo.artmarket.entity.OrderItem;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

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
}
