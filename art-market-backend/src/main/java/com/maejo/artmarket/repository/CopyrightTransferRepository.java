package com.maejo.artmarket.repository;

import com.maejo.artmarket.entity.CopyrightTransfer;
import com.maejo.artmarket.enums.CopyrightTransferStatus;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface CopyrightTransferRepository extends JpaRepository<CopyrightTransfer, Integer> {

    List<CopyrightTransfer> findByBuyer_BuyerId(Integer buyerId);

    /** Receive Copyright Transfer (ฝั่งผู้ขาย) — ดูสัญญาที่ถูกส่งมาให้ตัวเองทั้งหมด */
    List<CopyrightTransfer> findBySeller_SellerId(Integer sellerId);

    /** Security check — ตรวจว่าสัญญานี้เป็นของผู้ขายคนนี้จริงก่อนตอบรับ/ปฏิเสธ */
    Optional<CopyrightTransfer> findByCopyrightIdAndSeller_SellerId(Integer copyrightId, Integer sellerId);

    /** ใช้ในยูสเคส Sign Agreement — ผู้ซื้อเซ็นสัญญาของตัวเองเท่านั้น */
    Optional<CopyrightTransfer> findByCopyrightIdAndBuyer_BuyerId(Integer copyrightId, Integer buyerId);

    /** ป้องกันส่งสัญญาซ้ำสำหรับ order เดียวกัน */
    boolean existsByOrder_OrderId(Integer orderId);

    /**
     * มีคำขอโอนลิขสิทธิ์ของงานชิ้นนี้จากผู้ซื้อรายนี้ที่ยังดำเนินการอยู่หรือไม่
     *
     * ใช้แทนการเช็คซ้ำด้วย order_id เดิม เพราะตอนนี้สัญญาผูกกับงานศิลปะ ไม่ใช่คำสั่งซื้อ
     * ส่งสถานะที่ถือว่า "ยังดำเนินการอยู่" เข้ามา เพื่อให้คำขอที่เคยถูกปฏิเสธยื่นใหม่ได้
     */
    boolean existsByBuyer_BuyerIdAndArtwork_ArtworkIdAndTransferStatusIn(
            Integer buyerId, Integer artworkId, List<CopyrightTransferStatus> statuses);
}
