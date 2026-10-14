package com.maejo.artmarket.image;

import com.maejo.artmarket.repository.ArtworkRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.stereotype.Component;
import org.springframework.transaction.support.TransactionTemplate;

import java.util.List;

/**
 * เติมภาพตัวอย่างมีลายน้ำให้ผลงานที่บันทึกไว้ก่อนมีฟีเจอร์นี้ (รวมข้อมูล seed)
 *
 * รันทุกครั้งที่เปิดระบบ แต่ทำงานเฉพาะแถวที่ยังไม่มีภาพตัวอย่าง
 * เปิดครั้งที่สองเป็นต้นไปจึงแทบไม่เสียเวลา
 *
 * ทำทีละชิ้นในทรานแซกชันของตัวเอง — รูปเสียชิ้นเดียวต้องไม่ทำให้ชิ้นอื่นไม่ได้ลายน้ำ
 * และไม่ต้องโหลดรูป base64 ทั้งตารางขึ้นหน่วยความจำพร้อมกัน
 */
@Component
public class WatermarkBackfill implements ApplicationRunner {

    private static final Logger log = LoggerFactory.getLogger(WatermarkBackfill.class);

    private final ArtworkRepository artworkRepository;
    private final TransactionTemplate tx;

    public WatermarkBackfill(ArtworkRepository artworkRepository, TransactionTemplate tx) {
        this.artworkRepository = artworkRepository;
        this.tx = tx;
    }

    @Override
    public void run(ApplicationArguments args) {
        List<Integer> ids = artworkRepository.findIdsMissingWatermark();
        if (ids.isEmpty()) return;

        long started = System.currentTimeMillis();
        int done = 0, failed = 0;
        for (Integer id : ids) {
            Boolean ok = tx.execute(status -> artworkRepository.findById(id).map(a -> {
                try {
                    a.setWatermarkedImage(Watermark.apply(a.getArtworkImage()));
                    artworkRepository.save(a);
                    return true;
                } catch (Watermark.UnreadableImageException e) {
                    log.warn("สร้างภาพตัวอย่างของผลงาน #{} ไม่ได้: {}", id, e.getMessage());
                    return false;
                }
            }).orElse(false));
            if (Boolean.TRUE.equals(ok)) done++; else failed++;
        }
        log.info("สร้างภาพตัวอย่างมีลายน้ำ {} ชิ้น (ไม่สำเร็จ {}) ใช้เวลา {} ms",
                done, failed, System.currentTimeMillis() - started);
    }
}
