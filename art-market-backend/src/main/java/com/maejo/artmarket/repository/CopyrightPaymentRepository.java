package com.maejo.artmarket.repository;

import com.maejo.artmarket.entity.CopyrightPayment;
import com.maejo.artmarket.enums.PaymentStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.util.List;
import java.util.Optional;

public interface CopyrightPaymentRepository extends JpaRepository<CopyrightPayment, Integer> {

    Optional<CopyrightPayment> findByCopyrightTransfer_CopyrightId(Integer copyrightId);

    /**
     * ดึงการชำระเงินของสัญญาหลายฉบับในคิวรีเดียว
     *
     * ใช้ตอนทำรายการสัญญา (sent/received) ที่ต้องแสดงสถานะการจ่ายเงินของทุกแถว
     * ถ้าไล่เรียกทีละฉบับจะกลายเป็น N+1 ตามจำนวนสัญญาในหน้า
     */
    List<CopyrightPayment> findByCopyrightTransfer_CopyrightIdIn(List<Integer> copyrightIds);

    /**
     * รายการทั้งหมดสำหรับหน้าแอดมิน โหลดความสัมพันธ์มาพร้อมกันในคิวรีเดียว
     * ไม่งั้นหน้ารายการจะยิงคิวรีย่อยรายแถว (N+1) ตอนอ่านชื่อผู้ซื้อ/ผู้ขาย
     */
    @Query("""
            SELECT cp FROM CopyrightPayment cp
            JOIN FETCH cp.copyrightTransfer ct
            JOIN FETCH ct.buyer b JOIN FETCH b.user
            JOIN FETCH ct.seller s JOIN FETCH s.user
            JOIN FETCH ct.artwork
            ORDER BY cp.copyrightPaymentId DESC
            """)
    List<CopyrightPayment> findAllForAdmin();

    long countByTransferStatus(PaymentStatus status);
}
