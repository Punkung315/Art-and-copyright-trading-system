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
     * Search Art (ยูสเคส 3.1.1) — ค้นหาเฉพาะงานที่ PUBLISHED และยังขายได้
     * ทุก param optional: ถ้าส่ง null จะข้ามเงื่อนไขนั้น
     * JOIN FETCH ป้องกัน N+1 query problem
     *
     * ตัดงานที่ SOLD ออก เพราะงานต้นฉบับมีชิ้นเดียว ขายไปแล้วก็ซื้อไม่ได้อีก
     * การปล่อยให้ค้างอยู่ในผลการค้นหาทำให้ผู้ซื้อเสียเวลากดเข้าไปแล้วเจอปุ่มที่กดไม่ได้
     * งานที่ขายแล้วยังดูได้จากหน้าโปรไฟล์ของศิลปินในฐานะผลงานเก่า
     *
     * ส่วน RESERVED (อยู่ในคำสั่งซื้อของคนอื่น) ยังแสดงอยู่ เพราะถ้าผู้ขายแจ้ง
     * ไม่พร้อมจำหน่ายหรือคำสั่งซื้อถูกยกเลิก งานจะกลับมาขายได้อีก
     */
    @Query("SELECT a FROM Artwork a " +
           "JOIN FETCH a.seller s " +
           "JOIN FETCH s.user u " +
           "WHERE a.publishStatus = 'PUBLISHED' " +
           "AND a.artworkStatus <> 'SOLD' " +
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
           "AND (:maxSize IS NULL OR a.width <= :maxSize) " +
           /*
            * ตัวกรอง "สิ่งที่ขาย"
            *   WITH_COPYRIGHT = ซื้อลิขสิทธิ์ของงานชิ้นนี้ได้ด้วย
            *   ORIGINAL_ONLY  = ขายเฉพาะตัวชิ้นงาน (ไม่เปิดขายลิขสิทธิ์ หรือลิขสิทธิ์ถูกขายไปแล้ว)
            *
            * ต้องเช็ค "ลิขสิทธิ์ขายไปแล้วหรือยัง" จากตารางสัญญาด้วย ไม่ใช่ดูแค่ copyrightPrice
            * เพราะราคายังค้างอยู่ที่ชิ้นงานแม้สัญญาจะปิดจบไปแล้ว (ดู ArtworkService.copyrightSold)
            * ถ้าดูแค่ราคา ตัวกรองจะพางานที่ซื้อลิขสิทธิ์ไม่ได้แล้วขึ้นมาให้ผู้ซื้อเสียเวลากดเข้าไป
            */
           "AND (:offer IS NULL " +
           "     OR (:offer = 'WITH_COPYRIGHT' AND a.copyrightPrice IS NOT NULL " +
           "         AND NOT EXISTS (SELECT 1 FROM CopyrightTransfer t " +
           "                         WHERE t.artwork = a AND t.transferStatus = 'COMPLETED')) " +
           "     OR (:offer = 'ORIGINAL_ONLY' AND (a.copyrightPrice IS NULL " +
           "         OR EXISTS (SELECT 1 FROM CopyrightTransfer t " +
           "                    WHERE t.artwork = a AND t.transferStatus = 'COMPLETED')))) " +
           // ช่วงราคาลิขสิทธิ์ — งานที่ไม่ได้เปิดขายลิขสิทธิ์ (copyrightPrice IS NULL)
           // จะหลุดออกจากผลลัพธ์เองตามกฎ NULL ของ SQL ซึ่งเป็นสิ่งที่ต้องการ
           "AND (:minCopyrightPrice IS NULL OR a.copyrightPrice >= :minCopyrightPrice) " +
           "AND (:maxCopyrightPrice IS NULL OR a.copyrightPrice <= :maxCopyrightPrice)")
    List<Artwork> searchArtworks(
            @Param("keyword")        String keyword,
            @Param("artworkType")    String artworkType,
            @Param("artworkStyle")   String artworkStyle,
            @Param("artworkMediums") String artworkMediums,
            @Param("minPrice")       Double minPrice,
            @Param("maxPrice")       Double maxPrice,
            @Param("minSize")        Double minSize,
            @Param("maxSize")        Double maxSize,
            @Param("offer")             String offer,
            @Param("minCopyrightPrice") Double minCopyrightPrice,
            @Param("maxCopyrightPrice") Double maxCopyrightPrice,
            // ORDER BY ถูกถอดออกจาก query string แล้วส่งเป็น Sort แทน
            // ถ้าปล่อย ORDER BY ไว้ใน query ด้วย Spring Data จะต่อ ORDER BY ซ้อนกันสองอัน → SQL พัง
            Sort sort
    );

    // =========================================================================
    // ตัวเลือกของตัวกรอง (facets) — อ่านค่าจริงที่มีในฐานข้อมูล
    // คืนเป็น Object[] { value, count } เพราะ JPQL constructor expression
    // ใช้กับ nested static class ได้ยุ่งยากกว่า จึง map เป็น DTO ใน service แทน
    // =========================================================================

    // ทุก facet ต้องตัด SOLD ออกเหมือน searchArtworks ไม่งั้นตัวเลขข้างตัวกรอง
    // จะบอกว่ามี 5 ชิ้น แต่พอกดแล้วขึ้นมาแค่ 3
    @Query("SELECT a.artworkType, COUNT(a) FROM Artwork a " +
           "WHERE a.publishStatus = 'PUBLISHED' AND a.artworkStatus <> 'SOLD' " +
           "AND a.artworkType IS NOT NULL " +
           "GROUP BY a.artworkType ORDER BY COUNT(a) DESC, a.artworkType ASC")
    List<Object[]> countByType();

    @Query("SELECT a.artworkStyle, COUNT(a) FROM Artwork a " +
           "WHERE a.publishStatus = 'PUBLISHED' AND a.artworkStatus <> 'SOLD' " +
           "AND a.artworkStyle IS NOT NULL " +
           "GROUP BY a.artworkStyle ORDER BY COUNT(a) DESC, a.artworkStyle ASC")
    List<Object[]> countByStyle();

    @Query("SELECT a.artworkMediums, COUNT(a) FROM Artwork a " +
           "WHERE a.publishStatus = 'PUBLISHED' AND a.artworkStatus <> 'SOLD' " +
           "AND a.artworkMediums IS NOT NULL " +
           "GROUP BY a.artworkMediums ORDER BY COUNT(a) DESC, a.artworkMediums ASC")
    List<Object[]> countByMediums();

    @Query("SELECT MIN(a.price), MAX(a.price) FROM Artwork a " +
           "WHERE a.publishStatus = 'PUBLISHED' AND a.artworkStatus <> 'SOLD'")
    List<Object[]> priceRange();

    /**
     * ขอบของสไลเดอร์เมื่อผู้ใช้สลับไปกรองด้วย "ราคาลิขสิทธิ์"
     * นับเฉพาะงานที่ยังซื้อลิขสิทธิ์ได้จริง เพราะถ้ารวมงานที่ลิขสิทธิ์ขายไปแล้วด้วย
     * เพดานสไลเดอร์จะกว้างเกินช่วงที่กดแล้วมีผลลัพธ์ขึ้นมาจริง
     */
    @Query("SELECT MIN(a.copyrightPrice), MAX(a.copyrightPrice) FROM Artwork a " +
           "WHERE a.publishStatus = 'PUBLISHED' AND a.artworkStatus <> 'SOLD' " +
           "AND a.copyrightPrice IS NOT NULL " +
           "AND NOT EXISTS (SELECT 1 FROM CopyrightTransfer t " +
           "                WHERE t.artwork = a AND t.transferStatus = 'COMPLETED')")
    List<Object[]> copyrightPriceRange();

    /** จำนวนงานที่ซื้อลิขสิทธิ์ได้ — ตัวเลขข้างตัวกรอง "สิ่งที่ขาย" */
    @Query("SELECT COUNT(a) FROM Artwork a " +
           "WHERE a.publishStatus = 'PUBLISHED' AND a.artworkStatus <> 'SOLD' " +
           "AND a.copyrightPrice IS NOT NULL " +
           "AND NOT EXISTS (SELECT 1 FROM CopyrightTransfer t " +
           "                WHERE t.artwork = a AND t.transferStatus = 'COMPLETED')")
    long countWithCopyright();

    /** จำนวนงานที่ขายเฉพาะตัวชิ้นงาน (ไม่เปิดขายลิขสิทธิ์ หรือลิขสิทธิ์ถูกขายไปแล้ว) */
    @Query("SELECT COUNT(a) FROM Artwork a " +
           "WHERE a.publishStatus = 'PUBLISHED' AND a.artworkStatus <> 'SOLD' " +
           "AND (a.copyrightPrice IS NULL " +
           "     OR EXISTS (SELECT 1 FROM CopyrightTransfer t " +
           "                WHERE t.artwork = a AND t.transferStatus = 'COMPLETED'))")
    long countOriginalOnly();

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
