package com.maejo.artmarket.repository;

import com.maejo.artmarket.entity.Orders;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface OrdersRepository extends JpaRepository<Orders, Integer> {

    /** View Order (ฝั่งผู้ซื้อ) */
    List<Orders> findByBuyer_BuyerId(Integer buyerId);

    /**
     * List Order (ฝั่งผู้ขาย, ยูสเคส 3.1.23) — หา Order ที่มีอย่างน้อย 1 ชิ้นเป็นงานของผู้ขายคนนี้
     * ใช้ DISTINCT เพราะ order เดียวอาจมีหลายชิ้นงานของผู้ขายคนเดียวกัน
     */
    @Query("SELECT DISTINCT o FROM Orders o " +
           "JOIN o.orderItems oi " +
           "WHERE oi.artwork.seller.sellerId = :sellerId " +
           "ORDER BY o.orderId DESC")
    List<Orders> findOrdersContainingSellerItems(@Param("sellerId") Integer sellerId);
}
