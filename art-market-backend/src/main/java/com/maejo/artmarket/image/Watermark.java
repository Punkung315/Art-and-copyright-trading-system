package com.maejo.artmarket.image;

import javax.imageio.IIOImage;
import javax.imageio.ImageIO;
import javax.imageio.ImageWriteParam;
import javax.imageio.ImageWriter;
import javax.imageio.stream.ImageOutputStream;
import java.awt.*;
import java.awt.font.FontRenderContext;
import java.awt.geom.AffineTransform;
import java.awt.geom.Rectangle2D;
import java.awt.image.BufferedImage;
import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.util.Base64;

/**
 * ฝังลายน้ำลงในรูปผลงาน — สร้าง "ภาพตัวอย่าง" ที่ส่งออกสู่สาธารณะแทนรูปต้นฉบับ
 *
 * ทำไมต้องฝังที่ backend ไม่ใช่วาดทับที่หน้าเว็บ:
 *   รูปทุกรูปในระบบเดินทางเป็น base64 อยู่ใน JSON ของ API ถ้าลายน้ำเป็นแค่ชั้น CSS
 *   ที่วางทับรูป คนที่เปิด DevTools → Network ก็คัดลอกรูปต้นฉบับไปได้ทันที
 *   การกันคลิกขวาที่หน้าเว็บช่วยได้แค่ผู้ใช้ทั่วไป ลายน้ำที่อยู่ใน "ตัวไฟล์" เท่านั้น
 *   ที่ตามรูปไปทุกที่ — รูปต้นฉบับจึงไม่ควรออกจากเซิร์ฟเวอร์ไปหาคนที่ไม่ใช่เจ้าของงานเลย
 *
 * ลักษณะลายน้ำ:
 *   - คำว่า ARTMARA เรียงเป็นแถวเฉียงทั่วทั้งภาพ ครอปส่วนไหนออกไปก็ยังติดลายน้ำ
 *   - ตัวอักษรสีขาวโปร่งแสงมีขอบเข้ม อ่านออกทั้งบนภาพสีอ่อนและสีเข้ม
 *     แต่ยังเห็นผลงานได้ชัดพอให้ผู้ซื้อตัดสินใจ
 *   - ใช้ตัวอักษรละตินล้วน เพราะฟอนต์ไทยในเครื่องเซิร์ฟเวอร์ไม่แน่นอน (ลินุกซ์บางเครื่อง
 *     ไม่มีฟอนต์ไทยเลย ข้อความไทยจะออกมาเป็นกล่องสี่เหลี่ยม)
 *
 * ภาพตัวอย่างย่อด้านยาวไม่เกิน {@link #MAX_EDGE} px ด้วย — เป็นอีกชั้นของการป้องกัน
 * (ต่อให้ลบลายน้ำได้ ก็ได้แค่ภาพความละเอียดต่ำ) และทำให้หน้าค้นหาโหลดเร็วขึ้น
 */
public final class Watermark {

    public static final String TEXT = "ARTMARA";

    /** ความยาวด้านที่ยาวที่สุดของภาพตัวอย่าง */
    static final int MAX_EDGE = 1200;

    private static final float JPEG_QUALITY = 0.82f;

    private Watermark() {}

    /** อ่านรูปไม่ได้ (ไฟล์เสีย / ชนิดที่ไม่รองรับ) */
    public static class UnreadableImageException extends Exception {
        public UnreadableImageException(String message) { super(message); }
    }

    /**
     * รับ data URL ของรูปต้นฉบับ คืน data URL ของภาพตัวอย่างที่มีลายน้ำ (jpeg เสมอ)
     */
    public static String apply(String dataUrl) throws UnreadableImageException {
        BufferedImage source = decode(dataUrl);
        BufferedImage marked = render(source);
        return "data:image/jpeg;base64," + Base64.getEncoder().encodeToString(encodeJpeg(marked));
    }

    static BufferedImage decode(String dataUrl) throws UnreadableImageException {
        if (dataUrl == null || !dataUrl.startsWith("data:image/")) {
            throw new UnreadableImageException("ไม่ใช่ data URL ของรูปภาพ");
        }
        int comma = dataUrl.indexOf(',');
        if (comma < 0) throw new UnreadableImageException("data URL ไม่สมบูรณ์");
        try {
            byte[] bytes = Base64.getDecoder().decode(dataUrl.substring(comma + 1).trim());
            BufferedImage img = ImageIO.read(new ByteArrayInputStream(bytes));
            if (img == null) throw new UnreadableImageException("ไม่รู้จักชนิดไฟล์รูป");
            return img;
        } catch (IllegalArgumentException | IOException e) {
            throw new UnreadableImageException("อ่านไฟล์รูปไม่ได้: " + e.getMessage());
        }
    }

    static BufferedImage render(BufferedImage source) {
        int w = source.getWidth();
        int h = source.getHeight();
        double scale = Math.min(1.0, (double) MAX_EDGE / Math.max(w, h));
        int tw = Math.max(1, (int) Math.round(w * scale));
        int th = Math.max(1, (int) Math.round(h * scale));

        // RGB ไม่มี alpha — jpeg ไม่รองรับความโปร่งใส png โปร่งใสจึงวางบนพื้นขาว
        BufferedImage out = new BufferedImage(tw, th, BufferedImage.TYPE_INT_RGB);
        Graphics2D g = out.createGraphics();
        try {
            g.setRenderingHint(RenderingHints.KEY_INTERPOLATION, RenderingHints.VALUE_INTERPOLATION_BICUBIC);
            g.setRenderingHint(RenderingHints.KEY_RENDERING, RenderingHints.VALUE_RENDER_QUALITY);
            g.setRenderingHint(RenderingHints.KEY_ANTIALIASING, RenderingHints.VALUE_ANTIALIAS_ON);
            g.setRenderingHint(RenderingHints.KEY_TEXT_ANTIALIASING, RenderingHints.VALUE_TEXT_ANTIALIAS_ON);

            g.setColor(Color.WHITE);
            g.fillRect(0, 0, tw, th);
            g.drawImage(source, 0, 0, tw, th, null);

            drawTiledText(g, tw, th);
        } finally {
            g.dispose();
        }
        return out;
    }

    /** ARTMARA เฉียง -30° เรียงเป็นแถวสลับฟันปลา ครอบคลุมทั้งภาพรวมถึงมุม */
    private static void drawTiledText(Graphics2D g, int w, int h) {
        int fontSize = Math.max(14, Math.min(w, h) / 9);
        Font font = new Font(Font.SANS_SERIF, Font.BOLD, fontSize);
        g.setFont(font);

        FontRenderContext frc = g.getFontRenderContext();
        Rectangle2D bounds = font.getStringBounds(TEXT, frc);
        int stepX = (int) (bounds.getWidth() * 1.6);
        int stepY = (int) (bounds.getHeight() * 2.4);

        AffineTransform original = g.getTransform();
        g.rotate(Math.toRadians(-30), w / 2.0, h / 2.0);

        // หมุนแล้วมุมภาพจะโผล่พ้นพื้นที่วาด จึงวาดเกินขอบออกไปเท่าเส้นทแยงมุม
        int reach = (int) Math.hypot(w, h);
        Stroke outline = new BasicStroke(Math.max(1f, fontSize / 18f));
        int row = 0;
        for (int y = -reach; y < h + reach; y += stepY, row++) {
            int offset = (row % 2 == 0) ? 0 : stepX / 2;
            for (int x = -reach + offset; x < w + reach; x += stepX) {
                Shape glyphs = font.createGlyphVector(frc, TEXT).getOutline(x, y);
                // ขอบเข้มก่อน แล้วค่อยเติมขาว — อ่านออกทั้งบนภาพสว่างและภาพมืด
                g.setStroke(outline);
                g.setColor(new Color(0, 0, 0, 70));
                g.draw(glyphs);
                g.setColor(new Color(255, 255, 255, 95));
                g.fill(glyphs);
            }
        }
        g.setTransform(original);
    }

    static byte[] encodeJpeg(BufferedImage img) {
        ImageWriter writer = ImageIO.getImageWritersByFormatName("jpeg").next();
        ByteArrayOutputStream bytes = new ByteArrayOutputStream();
        try (ImageOutputStream ios = ImageIO.createImageOutputStream(bytes)) {
            writer.setOutput(ios);
            ImageWriteParam param = writer.getDefaultWriteParam();
            param.setCompressionMode(ImageWriteParam.MODE_EXPLICIT);
            param.setCompressionQuality(JPEG_QUALITY);
            writer.write(null, new IIOImage(img, null, null), param);
        } catch (IOException e) {
            // เขียนลง ByteArrayOutputStream ในหน่วยความจำ — ไม่มีทางเกิด IOException จริง
            throw new IllegalStateException("เข้ารหัส jpeg ไม่สำเร็จ", e);
        } finally {
            writer.dispose();
        }
        return bytes.toByteArray();
    }
}
