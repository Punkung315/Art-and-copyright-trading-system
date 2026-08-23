package com.maejo.artmarket.service;

import com.maejo.artmarket.dto.*;
import com.maejo.artmarket.entity.Artwork;
import com.maejo.artmarket.entity.OrderItem;
import com.maejo.artmarket.entity.Orders;
import com.maejo.artmarket.entity.Seller;
import com.maejo.artmarket.enums.ArtworkStatus;
import com.maejo.artmarket.enums.AvailabilityStatus;
import com.maejo.artmarket.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

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

        try {
            // Basic Flow ข้อ 6.1
            item.setShippingStatus(req.getShippingStatus());
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
        return ApiResponse.ok("ดึงข้อมูลสำหรับใบรับรองสำเร็จ", ArtworkDetailResponse.from(artwork));
    }
}
