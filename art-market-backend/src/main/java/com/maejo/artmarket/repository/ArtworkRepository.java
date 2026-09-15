package com.maejo.artmarket.repository;

import com.maejo.artmarket.entity.Artwork;
import com.maejo.artmarket.enums.PublishStatus;
import org.springframework.data.domain.Sort;
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
           "AND (:keyword IS NULL OR LOWER(a.artworkName) LIKE LOWER(CONCAT('%', :keyword, '%')) " +
           "                      OR LOWER(u.fullName)    LIKE LOWER(CONCAT('%', :keyword, '%'))) " +
           "AND (:artworkType IS NULL OR a.artworkType = :artworkType) " +
           "AND (:artworkStyle IS NULL OR a.artworkStyle = :artworkStyle) " +
           "AND (:artworkMediums IS NULL OR a.artworkMediums = :artworkMediums) " +
           "AND (:minPrice IS NULL OR a.price >= :minPrice) " +
           "AND (:maxPrice IS NULL OR a.price <= :maxPrice) " +
           // ตัวกรอง "ช่วงขนาด" อ่านความกว้างโดยตรง
           // เดิมอ่านคอลัมน์ artworkSize ที่หน้าเว็บคอยเซ็ตให้เท่ากับ width อยู่ตลอด
           // ซึ่งแปลว่าเก็บค่าเดียวกันไว้สองที่ พอตัดคอลัมน์นั้นทิ้งจึงย้ายมาอ่าน width
           "AND (:minSize IS NULL OR a.width >= :minSize) " +
           "AND (:maxSize IS NULL OR a.width <= :maxSize)")
    List<Artwork> searchArtworks(
            @Param("keyword")        String keyword,
            @Param("artworkType")    String artworkType,
            @Param("artworkStyle")   String artworkStyle,
            @Param("artworkMediums") String artworkMediums,
            @Param("minPrice")       Double minPrice,
            @Param("maxPrice")       Double maxPrice,
            @Param("minSize")        Double minSize,
            @Param("maxSize")        Double maxSize,
            // ORDER BY ถูกถอดออกจาก query string แล้วส่งเป็น Sort แทน
            // ถ้าปล่อย ORDER BY ไว้ใน query ด้วย Spring Data จะต่อ ORDER BY ซ้อนกันสองอัน → SQL พัง
            Sort sort
    );

    // =========================================================================
    // ตัวเลือกของตัวกรอง (facets) — อ่านค่าจริงที่มีในฐานข้อมูล
    // คืนเป็น Object[] { value, count } เพราะ JPQL constructor expression
    // ใช้กับ nested static class ได้ยุ่งยากกว่า จึง map เป็น DTO ใน service แทน
    // =========================================================================

    @Query("SELECT a.artworkType, COUNT(a) FROM Artwork a " +
           "WHERE a.publishStatus = 'PUBLISHED' AND a.artworkType IS NOT NULL " +
           "GROUP BY a.artworkType ORDER BY COUNT(a) DESC, a.artworkType ASC")
    List<Object[]> countByType();

    @Query("SELECT a.artworkStyle, COUNT(a) FROM Artwork a " +
           "WHERE a.publishStatus = 'PUBLISHED' AND a.artworkStyle IS NOT NULL " +
           "GROUP BY a.artworkStyle ORDER BY COUNT(a) DESC, a.artworkStyle ASC")
    List<Object[]> countByStyle();

    @Query("SELECT a.artworkMediums, COUNT(a) FROM Artwork a " +
           "WHERE a.publishStatus = 'PUBLISHED' AND a.artworkMediums IS NOT NULL " +
           "GROUP BY a.artworkMediums ORDER BY COUNT(a) DESC, a.artworkMediums ASC")
    List<Object[]> countByMediums();

    @Query("SELECT MIN(a.price), MAX(a.price) FROM Artwork a WHERE a.publishStatus = 'PUBLISHED'")
    List<Object[]> priceRange();

    // =========================================================================
    // แนะนำสำหรับคุณ (หน้าแรก)
    // =========================================================================

    /**
     * ประเภทและสไตล์ของงานที่ผู้ซื้อรายนี้เคยสั่งซื้อหรือใส่ตะกร้าไว้
     * ใช้เป็น "ความสนใจ" ของผู้ใช้ แทนการเก็บประวัติการดูซึ่งยังไม่มีในระบบ
     */
    @Query("SELECT DISTINCT a.artworkType FROM Artwork a WHERE a.artworkId IN :artworkIds")
    List<String> findTypesOfArtworks(@Param("artworkIds") List<Integer> artworkIds);

    @Query("SELECT DISTINCT a.artworkStyle FROM Artwork a WHERE a.artworkId IN :artworkIds")
    List<String> findStylesOfArtworks(@Param("artworkIds") List<Integer> artworkIds);

    /**
     * งานที่ยังว่างอยู่และตรงกับประเภทหรือสไตล์ที่ผู้ใช้สนใจ
     * ตัดงานที่เขาเคยซื้อ/ใส่ตะกร้าไปแล้วออก และตัดงานของตัวเองออกด้วย
     */
    @Query("SELECT a FROM Artwork a " +
           "JOIN FETCH a.seller s " +
           "JOIN FETCH s.user u " +
           "WHERE a.publishStatus = 'PUBLISHED' " +
           "AND a.artworkStatus = 'AVAILABLE' " +
           "AND a.artworkId NOT IN :excludeArtworkIds " +
           "AND u.userId <> :currentUserId " +
           "AND (a.artworkType IN :types OR a.artworkStyle IN :styles) " +
           "ORDER BY a.artworkId DESC")
    List<Artwork> findRecommended(
            @Param("types")             List<String> types,
            @Param("styles")            List<String> styles,
            @Param("excludeArtworkIds") List<Integer> excludeArtworkIds,
            @Param("currentUserId")     Integer currentUserId
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
