package com.maejo.artmarket.repository;

import com.maejo.artmarket.entity.OrderItem;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.Optional;

public interface OrderItemRepository extends JpaRepository<OrderItem, Integer> {

    List<OrderItem> findByOrder_OrderId(Integer orderId);

    /** List Order (ฝั่งผู้ขาย) — หา order item ทั้งหมดที่เป็นงานของผู้ขายคนนี้ */
    List<OrderItem> findByArtwork_Seller_SellerId(Integer sellerId);

    /** Confirm Availability / Update Order — ตรวจว่า order item นี้เป็นของผู้ขายคนนี้จริง (security check) */
    Optional<OrderItem> findByOrderItemIdAndArtwork_Seller_SellerId(Integer orderItemId, Integer sellerId);
}
