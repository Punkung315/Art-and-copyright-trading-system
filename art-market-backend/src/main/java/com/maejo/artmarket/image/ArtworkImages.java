package com.maejo.artmarket.image;

import com.maejo.artmarket.entity.Artwork;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

/**
 * กฎเดียวของระบบว่า "ใครเห็นรูปผลงานแบบไหน"
 *
 *   - เจ้าของงาน (ผู้ขาย) → รูปต้นฉบับ  ใช้แก้ไขงาน / ออกใบรับรอง
 *   - ทุกคนที่เหลือ          → ภาพตัวอย่างมีลายน้ำ  (ค้นหา หน้าแรก ดูผลงาน โปรไฟล์ ตะกร้า คำสั่งซื้อ)
 *
 * DTO ทุกตัวต้องเอารูปผ่านคลาสนี้ ห้ามเรียก artwork.getArtworkImage() ตรง ๆ
 * เพราะลืมจุดเดียวรูปต้นฉบับก็หลุดออกไปทั้งก้อน — ค่าเริ่มต้นจึงเป็นแบบมีลายน้ำเสมอ
 * และต้องขอรูปต้นฉบับแบบเจาะจงเท่านั้น
 */
public final class ArtworkImages {

    private static final Logger log = LoggerFactory.getLogger(ArtworkImages.class);

    private ArtworkImages() {}

    /**
     * รูปสำหรับคนทั่วไป — ไม่มีทางคืนรูปต้นฉบับ
     *
     * ปกติภาพตัวอย่างถูกสร้างเก็บไว้แล้วตอนบันทึกงาน (และตอนเปิดระบบสำหรับงานเก่า)
     * ถ้ายังไม่มีด้วยเหตุใดก็ตาม ให้สร้างสด ๆ แทน ถ้าสร้างไม่ได้คืน null
     * หน้าเว็บจะแสดงรูปแทนที่ — ยอมให้ไม่มีรูป ดีกว่าปล่อยรูปต้นฉบับออกไป
     */
    public static String publicImageOf(Artwork artwork) {
        if (artwork == null) return null;
        if (artwork.getWatermarkedImage() != null) return artwork.getWatermarkedImage();
        if (artwork.getArtworkImage() == null) return null;
        try {
            return Watermark.apply(artwork.getArtworkImage());
        } catch (Watermark.UnreadableImageException e) {
            log.warn("สร้างภาพตัวอย่างของผลงาน #{} ไม่ได้: {}", artwork.getArtworkId(), e.getMessage());
            return null;
        }
    }

    /** รูปต้นฉบับ — เรียกได้เฉพาะตอนที่ยืนยันแล้วว่าผู้ขอเป็นเจ้าของงาน */
    public static String originalImageOf(Artwork artwork) {
        return artwork == null ? null : artwork.getArtworkImage();
    }
}
