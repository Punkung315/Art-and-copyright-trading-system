package com.maejo.artmarket.service;

/**
 * ตรวจรูปที่ส่งมาเป็น data URL (รูปแพ็คสินค้า / สลิปโอนเงินให้ผู้ขาย)
 *
 * หน้าเว็บจำกัดชนิดไฟล์ไว้แล้ว แต่ endpoint ต้องกันเองด้วย
 * ไม่งั้นยิง API ตรงๆ แล้วใส่ข้อความอะไรก็ได้ลงช่องที่ควรเป็นรูป
 */
final class ImageDataUrls {

    /** ~7.5 MB ของไฟล์จริง หลังเข้ารหัส base64 จะยาวขึ้นราว 4/3 */
    static final int MAX_LENGTH = 10_000_000;

    private ImageDataUrls() {}

    /** null = ใช้ได้ ไม่งั้นคืนข้อความ error ภาษาไทย */
    static String validate(String value, String what) {
        if (value == null || value.isBlank()) return "กรุณาแนบ" + what;
        if (!(value.startsWith("data:image/png;base64,")
                || value.startsWith("data:image/jpeg;base64,")
                || value.startsWith("data:image/jpg;base64,"))) {
            return what + "ต้องเป็นไฟล์ png หรือ jpg เท่านั้น";
        }
        if (value.length() > MAX_LENGTH) return what + "มีขนาดใหญ่เกินไป";
        return null;
    }
}
