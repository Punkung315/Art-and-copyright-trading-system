package com.maejo.artmarket.repository;

import com.maejo.artmarket.entity.CopyrightTransfer;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface CopyrightTransferRepository extends JpaRepository<CopyrightTransfer, Integer> {

    List<CopyrightTransfer> findByBuyer_BuyerId(Integer buyerId);

    /** Receive Copyright Transfer (ฝั่งผู้ขาย) — ดูสัญญาที่ถูกส่งมาให้ตัวเองทั้งหมด */
    List<CopyrightTransfer> findBySeller_SellerId(Integer sellerId);

    /** Security check — ตรวจว่าสัญญานี้เป็นของผู้ขายคนนี้จริงก่อนตอบรับ/ปฏิเสธ */
    Optional<CopyrightTransfer> findByCopyrightIdAndSeller_SellerId(Integer copyrightId, Integer sellerId);

    /** ป้องกันส่งสัญญาซ้ำสำหรับ order เดียวกัน */
    boolean existsByOrder_OrderId(Integer orderId);
}
