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
     * หาคำสั่งซื้อของผู้ซื้อรายนี้ที่มีงานศิลปะชิ้นที่ระบุอยู่ (ล่าสุดก่อน)
     * ใช้ตอนผู้ซื้อกดส่งสัญญาโอนลิขสิทธิ์จากหน้ารายละเอียดงานศิลปะ ซึ่งรู้แค่ artworkId
     */
    @Query("SELECT DISTINCT o FROM Orders o " +
           "JOIN o.orderItems oi " +
           "WHERE o.buyer.buyerId = :buyerId AND oi.artwork.artworkId = :artworkId " +
           "ORDER BY o.orderId DESC")
    List<Orders> findByBuyerAndArtwork(@Param("buyerId") Integer buyerId,
                                       @Param("artworkId") Integer artworkId);

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
