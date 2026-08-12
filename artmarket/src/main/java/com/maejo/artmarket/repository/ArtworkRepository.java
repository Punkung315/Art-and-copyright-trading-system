package com.maejo.artmarket.repository;

import com.maejo.artmarket.entity.Artwork;
import com.maejo.artmarket.enums.PublishStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface ArtworkRepository extends JpaRepository<Artwork, Integer> {

    /** List Art ฝั่งผู้ขาย — ดูงานของตัวเองทั้งหมด (DRAFT + PUBLISHED) */
    List<Artwork> findBySeller_SellerId(Integer sellerId);

    /** View Profile ตัวเอง — ดูงานทั้งหมดของ user นี้ (ทั้ง DRAFT + PUBLISHED) */
    List<Artwork> findBySeller_User_UserId(Integer userId);

    /** View Profile คนอื่น — ดูงานที่ PUBLISHED แล้วของ user นี้เท่านั้น */
    List<Artwork> findBySeller_User_UserIdAndPublishStatus(Integer userId, PublishStatus publishStatus);

    /**
     * Search Art (ยูสเคส 3.1.1) — ค้นหาเฉพาะงานที่ PUBLISHED
     * ทุก param optional: ถ้าส่ง null จะข้ามเงื่อนไขนั้น
     * JOIN FETCH ป้องกัน N+1 query problem
     */
    @Query("SELECT a FROM Artwork a " +
           "JOIN FETCH a.seller s " +
           "JOIN FETCH s.user u " +
           "WHERE a.publishStatus = 'PUBLISHED' " +
           "AND (:keyword IS NULL OR LOWER(a.artworkName) LIKE LOWER(CONCAT('%', :keyword, '%'))) " +
           "AND (:artworkType IS NULL OR a.artworkType = :artworkType) " +
           "AND (:artworkStyle IS NULL OR a.artworkStyle = :artworkStyle) " +
           "AND (:minPrice IS NULL OR a.price >= :minPrice) " +
           "AND (:maxPrice IS NULL OR a.price <= :maxPrice) " +
           "ORDER BY a.artworkId DESC")
    List<Artwork> searchArtworks(
            @Param("keyword")      String keyword,
            @Param("artworkType")  String artworkType,
            @Param("artworkStyle") String artworkStyle,
            @Param("minPrice")     Double minPrice,
            @Param("maxPrice")     Double maxPrice
    );

    /**
     * View Art (ยูสเคส 3.1.2) — ดึงงาน 1 ชิ้นพร้อม seller.user ในคำสั่งเดียว
     * คืนเฉพาะงานที่ PUBLISHED แล้ว (ป้องกันเข้าถึง draft โดยเดา id)
     */
    @Query("SELECT a FROM Artwork a " +
           "JOIN FETCH a.seller s " +
           "JOIN FETCH s.user u " +
           "WHERE a.artworkId = :artworkId " +
           "AND a.publishStatus = 'PUBLISHED'")
    Optional<Artwork> findPublishedById(@Param("artworkId") Integer artworkId);
}
