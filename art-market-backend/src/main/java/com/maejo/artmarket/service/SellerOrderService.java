package com.maejo.artmarket.service;

import com.maejo.artmarket.dto.*;
import com.maejo.artmarket.entity.Artwork;
import com.maejo.artmarket.entity.OrderItem;
import com.maejo.artmarket.entity.Orders;
import com.maejo.artmarket.entity.Seller;
import com.maejo.artmarket.enums.ArtworkStatus;
import com.maejo.artmarket.enums.AvailabilityStatus;
import com.maejo.artmarket.enums.PaymentStatus;
import com.maejo.artmarket.enums.ShippingStatus;
import com.maejo.artmarket.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

/**
 * SellerOrderService — Business Logic ของยูสเคสฝั่งผู้ขายที่เกี่ยวกับคำสั่งซื้อ:
 *   3.1.20 Print Certificate
 *   3.1.21 Confirm Availability For Art
 *   3.1.23 List Order
 *   3.1.24 Update Order
 */
@Service
@RequiredArgsConstructor
public class SellerOrderService {

    private final SellerRepository    sellerRepository;
    private final OrdersRepository    ordersRepository;
    private final OrderItemRepository orderItemRepository;
    private final ArtworkRepository   artworkRepository;

    // =========================================================================
    // ยูสเคส 3.1.23 List Order — ดูคำสั่งซื้อทั้งหมดที่มีงานของตัวเอง
    // Alternate Flow 3.1.1: "ไม่พบรายการคำสั่งซื้อ"
    // =========================================================================

    @Transactional(readOnly = true)
    public ApiResponse<List<SellerOrderResponse>> listMyOrders(String username) {

        Seller seller = sellerRepository.findByUser_Username(username).orElse(null);
        if (seller == null) {
            return ApiResponse.error("ไม่พบข้อมูลผู้ขาย");
        }

        List<Orders> orders = ordersRepository.findOrdersContainingSellerItems(seller.getSellerId());

        // Alternate Flow 3.1.1
        // ยังไม่มีใครสั่งซื้องานของผู้ขายรายนี้ = list ว่าง ไม่ใช่ error
        List<SellerOrderResponse> result = orders.stream()
                .map(o -> SellerOrderResponse.from(o, seller.getSellerId()))
                .toList();

        return ApiResponse.ok(
                result.isEmpty() ? "ไม่พบรายการคำสั่งซื้อ" : "พบคำสั่งซื้อ " + result.size() + " รายการ",
                result);
    }

    // =========================================================================
    // ยูสเคส 3.1.21 Confirm Availability For Art
    // Post Condition: ต้องมี Confirm Order จากผู้ซื้อมาก่อน (มี OrderItem รอยืนยันอยู่แล้ว)
    // Alternate Flow 6.1.1: "ไม่สามารถแก้ไขสถานะได้ กรุณาลองใหม่อีกครั้ง"
    // =========================================================================

    @Transactional
    public ApiResponse<SellerOrderResponse.SellerOrderItemDetail> confirmAvailability(
            String username, Integer orderItemId, ConfirmAvailabilityRequest req) {

        Seller seller = sellerRepository.findByUser_Username(username).orElse(null);
        if (seller == null) {
            return ApiResponse.error("ไม่พบข้อมูลผู้ขาย");
        }

        // Security check ในตัว query เดียว — ต้องเป็น order item ของงานผู้ขายคนนี้
        Optional<OrderItem> itemOpt = orderItemRepository
                .findByOrderItemIdAndArtwork_Seller_SellerId(orderItemId, seller.getSellerId());

        if (itemOpt.isEmpty()) {
            return ApiResponse.error("ไม่พบรายการคำสั่งซื้อนี้");
        }

        OrderItem item = itemOpt.get();

        if (item.getAvailabilityStatus() != AvailabilityStatus.PENDING_CONFIRMATION) {
            return ApiResponse.error("รายการนี้ถูกยืนยันไปแล้ว");
        }

        try {
            // Basic Flow ข้อ 6.1 — เปลี่ยน availabilityStatus
            Artwork artwork = item.getArtwork();

            if (req.getAvailable()) {
                item.setAvailabilityStatus(AvailabilityStatus.AVAILABLE);
                // งานพร้อมขายจริง — คงสถานะ RESERVED ไว้ (รอผู้ซื้อชำระเงิน)
            } else {
                item.setAvailabilityStatus(AvailabilityStatus.UNAVAILABLE);
                // ผู้ขายไม่พร้อมขาย — คืนสถานะงานกลับเป็น AVAILABLE ให้คนอื่นซื้อได้
                artwork.setArtworkStatus(ArtworkStatus.AVAILABLE);
                artworkRepository.save(artwork);
            }

            orderItemRepository.save(item);
            return ApiResponse.ok(
                    req.getAvailable() ? "ยืนยันความพร้อมในการขายสำเร็จ" : "แจ้งไม่พร้อมขายสำเร็จ",
                    SellerOrderResponse.SellerOrderItemDetail.from(item));

        } catch (Exception e) {
            // Alternate Flow 6.1.1
            return ApiResponse.error("ไม่สามารถแก้ไขสถานะได้ กรุณาลองใหม่อีกครั้ง");
        }
    }

    // =========================================================================
    // ยูสเคส 3.1.24 Update Order — อัปเดตสถานะการจัดส่ง (shippingStatus)
    // Alternate Flow 6.1.1: "ไม่สามารถแก้ไขสถานะได้ กรุณาลองใหม่อีกครั้ง"
    // =========================================================================

    /** รหัสพัสดุของขนส่งไทยทุกเจ้าที่รองรับเป็นตัวอักษรอังกฤษ/ตัวเลขล้วน เช่น EF123456789TH */
    private static final java.util.regex.Pattern TRACKING_PATTERN =
            java.util.regex.Pattern.compile("^[A-Z0-9-]{8,30}$");

    /**
     * ลำดับสถานะเดินหน้าอย่างเดียว:
     *   (ยังไม่จัดส่ง) → PREPARING แพ็คสินค้าแล้ว [แนบรูปแพ็ค]
     *                 → SHIPPED   จัดส่งแล้ว     [กรอกรหัสพัสดุ]
     *                 → DELIVERED จัดส่งสำเร็จ   [ผู้ซื้อยืนยัน / ระบบยืนยันเมื่อครบกำหนด]
     *
     * ส่งสถานะเดิมซ้ำได้ เพื่อแก้หลักฐานที่แนบผิด (เปลี่ยนรูป / แก้เลขพัสดุที่พิมพ์ผิด)
     * แต่ย้อนสถานะไม่ได้ และแก้อะไรไม่ได้อีกเมื่อจัดส่งสำเร็จแล้ว
     *
     * ข้ามขั้นแบบ "กรอกทีเดียวจบ" ได้:
     *   ผู้ขายส่ง SHIPPED พร้อมแนบ packingImage มาในคำขอเดียวได้เลย ไม่ต้องยิงสองรอบ
     *   ของจริงผู้ขายแพ็คแล้วหิ้วไปส่งขนส่งรอบเดียว การบังคับบันทึกสองครั้งเป็นเรื่องของ
     *   หน้าจอ ไม่ใช่เรื่องของกระบวนการ — แต่ "หลักฐานต้องครบ" ยังเหมือนเดิมทุกข้อ
     *   (ไม่มีรูปแพ็ค = จัดส่งไม่ได้) และยังบันทึกเวลาแพ็ค/เวลาส่งแยกกันไว้ให้ผู้ซื้อ
     *   กับผู้ดูแลระบบเห็นเป็นสองขั้นเหมือนเดิม
     */
    @Transactional
    public ApiResponse<SellerOrderResponse.SellerOrderItemDetail> updateShippingStatus(
            String username, Integer orderItemId, UpdateShippingStatusRequest req) {

        Seller seller = sellerRepository.findByUser_Username(username).orElse(null);
        if (seller == null) {
            return ApiResponse.error("ไม่พบข้อมูลผู้ขาย");
        }

        Optional<OrderItem> itemOpt = orderItemRepository
                .findByOrderItemIdAndArtwork_Seller_SellerId(orderItemId, seller.getSellerId());

        if (itemOpt.isEmpty()) {
            return ApiResponse.error("ไม่พบรายการคำสั่งซื้อนี้");
        }

        OrderItem item = itemOpt.get();

        // จัดส่งได้ก็ต่อเมื่อผู้ขายยืนยันความพร้อมแล้วเท่านั้น
        if (item.getAvailabilityStatus() != AvailabilityStatus.AVAILABLE) {
            return ApiResponse.error("ต้องยืนยันความพร้อมในการขายก่อนจึงจะอัปเดตสถานะการจัดส่งได้");
        }

        // เดิมไม่ได้เช็คเรื่องนี้ที่ backend เลย (หน้าเว็บซ่อนช่องไว้อย่างเดียว)
        // ยิง API ตรงๆ ก็ส่งของได้ทั้งที่ผู้ซื้อยังไม่ได้จ่ายเงิน
        var payment = item.getOrder().getPayment();
        if (payment == null || payment.getPaymentStatus() != PaymentStatus.COMPLETED) {
            return ApiResponse.error("อัปเดตการจัดส่งได้หลังผู้ดูแลระบบยืนยันการโอนเงินของผู้ซื้อแล้ว");
        }

        ShippingStatus current = item.getShippingStatus();
        ShippingStatus target  = req.getShippingStatus();

        if (current == ShippingStatus.DELIVERED) {
            return ApiResponse.error("รายการนี้จัดส่งสำเร็จแล้ว ไม่สามารถแก้ไขสถานะได้");
        }
        if (target == ShippingStatus.DELIVERED) {
            return ApiResponse.error("สถานะจัดส่งสำเร็จต้องให้ผู้ซื้อเป็นผู้ยืนยันเมื่อได้รับสินค้า");
        }

        LocalDateTime now = LocalDateTime.now();

        if (target == ShippingStatus.PREPARING) {
            if (current == ShippingStatus.SHIPPED) {
                return ApiResponse.error("จัดส่งสินค้าไปแล้ว ย้อนกลับเป็นแพ็คสินค้าไม่ได้");
            }
            // ครั้งแรกต้องแนบรูป ส่วนการส่งซ้ำไม่แนบมาได้ (คงรูปเดิมไว้)
            boolean hasNewImage = req.getPackingImage() != null && !req.getPackingImage().isBlank();
            if (!hasNewImage && item.getPackingImage() == null) {
                return ApiResponse.error("กรุณาแนบรูปภาพสินค้าที่แพ็คแล้ว");
            }
            if (hasNewImage) {
                String err = ImageDataUrls.validate(req.getPackingImage(), "รูปภาพสินค้าที่แพ็คแล้ว");
                if (err != null) return ApiResponse.error(err);
                item.setPackingImage(req.getPackingImage());
            }
            if (item.getPackedAt() == null) item.setPackedAt(now);
        }

        if (target == ShippingStatus.SHIPPED) {
            /*
              ตรวจให้ครบก่อนค่อยเขียนลง entity

              @Transactional ของ Spring จะ rollback ก็ต่อเมื่อโยน RuntimeException
              การ return ApiResponse.error เฉย ๆ ไม่ rollback ถ้าเผลอ setPackingImage
              ไว้ก่อนแล้วมาพบว่าเลขพัสดุผิดรูปแบบ รูปกับ packedAt จะถูกบันทึกค้างไว้
              ทั้งที่สถานะยังเป็น "ยังไม่จัดส่ง" — ผู้ซื้อจะเห็นรูปแพ็คในรายการที่ยังไม่ส่ง
            */
            boolean hasNewImage = req.getPackingImage() != null && !req.getPackingImage().isBlank();

            // หลักฐานยังต้องครบเหมือนเดิม — ไม่มีรูปแพ็คก็จัดส่งไม่ได้ ไม่ว่าจะแนบรอบนี้หรือรอบก่อน
            if (!hasNewImage && item.getPackingImage() == null) {
                return ApiResponse.error("กรุณาแนบรูปภาพสินค้าที่แพ็คแล้ว");
            }
            if (hasNewImage) {
                String err = ImageDataUrls.validate(req.getPackingImage(), "รูปภาพสินค้าที่แพ็คแล้ว");
                if (err != null) return ApiResponse.error(err);
            }

            String tracking = req.getTrackingNumber() == null ? ""
                    : req.getTrackingNumber().replaceAll("\\s+", "").toUpperCase();
            if (tracking.isEmpty()) {
                return ApiResponse.error("กรุณากรอกรหัสพัสดุของขนส่ง");
            }
            if (!TRACKING_PATTERN.matcher(tracking).matches()) {
                return ApiResponse.error("รหัสพัสดุต้องเป็นตัวอักษรภาษาอังกฤษหรือตัวเลข 8–30 ตัว");
            }

            if (hasNewImage) item.setPackingImage(req.getPackingImage());
            // ยังบันทึกเวลาแพ็คไว้ด้วย ประวัติการจัดส่งจึงมีครบสองขั้นแม้บันทึกครั้งเดียว
            if (item.getPackedAt() == null) item.setPackedAt(now);
            item.setTrackingNumber(tracking);
            if (item.getShippedAt() == null) item.setShippedAt(now);
        }

        try {
            // Basic Flow ข้อ 6.1
            item.setShippingStatus(target);
            orderItemRepository.save(item);
            return ApiResponse.ok("อัปเดตสถานะการจัดส่งสำเร็จ",
                    SellerOrderResponse.SellerOrderItemDetail.from(item));

        } catch (Exception e) {
            // Alternate Flow 6.1.1
            return ApiResponse.error("ไม่สามารถแก้ไขสถานะได้ กรุณาลองใหม่อีกครั้ง");
        }
    }

    // =========================================================================
    // ยูสเคส 3.1.20 Print Certificate
    // Alternate Flow 4.1.1: "ไม่พบข้อมูลงานศิลปะ"
    // =========================================================================

    @Transactional(readOnly = true)
    public ApiResponse<ArtworkDetailResponse> getCertificateData(String username, Integer artworkId) {

        Seller seller = sellerRepository.findByUser_Username(username).orElse(null);
        if (seller == null) {
            return ApiResponse.error("ไม่พบข้อมูลผู้ขาย");
        }

        Optional<Artwork> artworkOpt = artworkRepository.findById(artworkId);

        // Alternate Flow 4.1.1
        if (artworkOpt.isEmpty()) {
            return ApiResponse.error("ไม่พบข้อมูลงานศิลปะ");
        }

        Artwork artwork = artworkOpt.get();

        // ตรวจว่างานนี้เป็นของผู้ขายคนนี้ (ป้องกันพิมพ์ใบรับรองงานคนอื่น)
        if (!artwork.getSeller().getSellerId().equals(seller.getSellerId())) {
            return ApiResponse.error("ไม่มีสิทธิ์พิมพ์ใบรับรองงานศิลปะชิ้นนี้");
        }

        // Basic Flow ข้อ 5 — คืนรายละเอียดงานศิลปะให้ frontend เอาไปใส่ในฟอร์มใบรับรอง
        return ApiResponse.ok("ดึงข้อมูลสำหรับใบรับรองสำเร็จ", ArtworkDetailResponse.forOwner(artwork));
    }
}
