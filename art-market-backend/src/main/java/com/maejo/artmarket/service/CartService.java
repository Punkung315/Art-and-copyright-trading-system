package com.maejo.artmarket.service;

import com.maejo.artmarket.dto.*;
import com.maejo.artmarket.entity.*;
import com.maejo.artmarket.enums.ArtworkStatus;
import com.maejo.artmarket.enums.AvailabilityStatus;
import com.maejo.artmarket.enums.OrderStatus;
import com.maejo.artmarket.enums.PublishStatus;
import com.maejo.artmarket.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Optional;

/**
 * CartService — Business Logic ของยูสเคส:
 *   3.1.8  Add Cart
 *   3.1.9  List Cart
 *   3.1.10 Remove Item
 *   3.1.11 Confirm Order
 */
@Service
@RequiredArgsConstructor
public class CartService {

    private final CartItemRepository cartItemRepository;
    private final ArtworkRepository  artworkRepository;
    private final BuyerRepository    buyerRepository;
    private final OrdersRepository   ordersRepository;
    private final OrderItemRepository orderItemRepository;

    // =========================================================================
    // ยูสเคส 3.1.8 Add Cart
    // Basic Flow ข้อ 5: บันทึกงานศิลปะที่เลือกลงในตะกร้า
    // Alternate Flow 3.1: "กรุณากรอกข้อมูลให้ครบถ้วน" (ตรวจใน DTO ด้วย @NotNull)
    // Alternate Flow 5.1.1: "ไม่สามารถเพิ่มลงในตะกร้าได้ กรุณาลองใหม่อีกครั้ง"
    // =========================================================================

    @Transactional
    public ApiResponse<CartItemResponse> addCart(String username, AddCartRequest req) {

        Buyer buyer = buyerRepository.findByUser_Username(username).orElse(null);
        if (buyer == null) {
            return ApiResponse.error("ไม่พบข้อมูลผู้ซื้อ");
        }

        // ตรวจว่างานยัง PUBLISHED และ AVAILABLE อยู่ไหม
        Optional<Artwork> artworkOpt = artworkRepository.findById(req.getArtworkId());
        if (artworkOpt.isEmpty()) {
            return ApiResponse.error("ไม่พบงานศิลปะที่เลือก");
        }
        Artwork artwork = artworkOpt.get();

        if (artwork.getPublishStatus() != PublishStatus.PUBLISHED
                || artwork.getArtworkStatus() != ArtworkStatus.AVAILABLE) {
            return ApiResponse.error("งานศิลปะชิ้นนี้ไม่พร้อมจำหน่ายในขณะนี้");
        }

        // ป้องกันใส่ของซ้ำในตะกร้า
        if (cartItemRepository.existsByArtwork_ArtworkIdAndBuyer_BuyerId(
                req.getArtworkId(), buyer.getBuyerId())) {
            return ApiResponse.error("งานศิลปะชิ้นนี้อยู่ในตะกร้าของคุณแล้ว");
        }

        try {
            // Basic Flow ข้อ 5.1 — บันทึก priceAtAdd = ราคาปัจจุบันของงาน ณ ตอนใส่ตะกร้า
            CartItem cartItem = CartItem.builder()
                    .artwork(artwork)
                    .buyer(buyer)
                    .priceAtAdd(artwork.getPrice())
                    .build();

            cartItemRepository.save(cartItem);
            return ApiResponse.ok("เพิ่มลงในตะกร้าสำเร็จ", CartItemResponse.from(cartItem));

        } catch (Exception e) {
            // Alternate Flow 5.1.1
            return ApiResponse.error("ไม่สามารถเพิ่มลงในตะกร้าได้ กรุณาลองใหม่อีกครั้ง");
        }
    }

    // =========================================================================
    // ยูสเคส 3.1.9 List Cart
    // Alternate Flow 3.1.1: "ไม่พบรายการคำสั่งซื้อ"
    // =========================================================================

    @Transactional(readOnly = true)
    public ApiResponse<CartListResponse> listCart(String username) {

        Buyer buyer = buyerRepository.findByUser_Username(username).orElse(null);
        if (buyer == null) {
            return ApiResponse.error("ไม่พบข้อมูลผู้ซื้อ");
        }

        List<CartItem> cartItems = cartItemRepository.findByBuyerId(buyer.getBuyerId());

        // Alternate Flow 3.1.1
        if (cartItems.isEmpty()) {
            return ApiResponse.error("ไม่พบรายการคำสั่งซื้อ");
        }

        double totalPrice = cartItems.stream().mapToDouble(CartItem::getPriceAtAdd).sum();

        CartListResponse response = CartListResponse.builder()
                .items(cartItems.stream().map(CartItemResponse::from).toList())
                .totalPrice(totalPrice)
                .build();

        return ApiResponse.ok("พบ " + cartItems.size() + " รายการในตะกร้า", response);
    }

    // =========================================================================
    // ยูสเคส 3.1.10 Remove Item
    // Alternate Flow 3.1: "กรุณาเลือกรายการคำสั่งซื้อที่ต้องการลบ" (จัดการที่ระดับ routing — ต้องมี id เสมอ)
    // Alternate Flow 5.1.1: "ลบคำสั่งซื้อไม่สำเร็จ"
    // =========================================================================

    @Transactional
    public ApiResponse<Void> removeItem(String username, Integer cartItemId) {

        Buyer buyer = buyerRepository.findByUser_Username(username).orElse(null);
        if (buyer == null) {
            return ApiResponse.error("ไม่พบข้อมูลผู้ซื้อ");
        }

        // ตรวจว่า cart item นี้เป็นของ buyer คนนี้จริง (security check)
        Optional<CartItem> itemOpt = cartItemRepository
                .findByCartItemIdAndBuyer_BuyerId(cartItemId, buyer.getBuyerId());

        if (itemOpt.isEmpty()) {
            return ApiResponse.error("ไม่พบรายการในตะกร้าที่ต้องการลบ");
        }

        try {
            cartItemRepository.delete(itemOpt.get());
            return ApiResponse.ok("ลบรายการออกจากตะกร้าสำเร็จ", null);
        } catch (Exception e) {
            // Alternate Flow 5.1.1
            return ApiResponse.error("ลบคำสั่งซื้อไม่สำเร็จ");
        }
    }

    // =========================================================================
    // ยูสเคส 3.1.11 Confirm Order
    // Basic Flow: ยืนยันคำสั่งซื้อทั้งตะกร้า → สร้าง Order + OrderItem จาก CartItem ทั้งหมด
    // → ล้างตะกร้า → ระบบถามความพร้อมไปยังผู้ขาย (ตั้ง availabilityStatus = PENDING_CONFIRMATION)
    // Alternate Flow 3.1: "คำสั่งซื้อไม่ถูกต้อง กรุณาลองใหม่อีกครั้ง" (ตะกร้าว่าง)
    // Alternate Flow 5.1.1: "ไม่สามารถบันทึกข้อมูลได้"
    // =========================================================================

    @Transactional
    public ApiResponse<OrderDetailResponse> confirmOrder(String username) {

        Buyer buyer = buyerRepository.findByUser_Username(username).orElse(null);
        if (buyer == null) {
            return ApiResponse.error("ไม่พบข้อมูลผู้ซื้อ");
        }

        List<CartItem> cartItems = cartItemRepository.findByBuyerId(buyer.getBuyerId());

        // Alternate Flow 3.1 — ตะกร้าว่าง ยืนยันคำสั่งซื้อไม่ได้
        if (cartItems.isEmpty()) {
            return ApiResponse.error("คำสั่งซื้อไม่ถูกต้อง กรุณาลองใหม่อีกครั้ง");
        }

        try {
            // Basic Flow ข้อ 5.1 — สร้าง Order
            Orders order = Orders.builder()
                    .buyer(buyer)
                    .orderStatus(OrderStatus.PENDING)
                    .confirmDateTime(java.time.LocalDateTime.now())
                    .build();
            ordersRepository.save(order);

            // สร้าง OrderItem จากแต่ละ CartItem — ระบบถามความพร้อมไปยังผู้ขาย
            // (ตั้ง availabilityStatus = PENDING_CONFIRMATION รอผู้ขาย Confirm Availability)
            for (CartItem cartItem : cartItems) {
                OrderItem orderItem = OrderItem.builder()
                        .artwork(cartItem.getArtwork())
                        .order(order)
                        .price(cartItem.getPriceAtAdd())
                        .availabilityStatus(AvailabilityStatus.PENDING_CONFIRMATION)
                        .build();
                orderItemRepository.save(orderItem);

                // เปลี่ยนสถานะงานเป็น RESERVED กันคนอื่นสั่งซื้อซ้ำระหว่างรอผู้ขายยืนยัน
                Artwork artwork = cartItem.getArtwork();
                artwork.setArtworkStatus(ArtworkStatus.RESERVED);
                artworkRepository.save(artwork);
            }

            // ล้างตะกร้าหลังยืนยันคำสั่งซื้อสำเร็จ
            cartItemRepository.deleteAll(cartItems);

            // ต้องดึง order ใหม่อีกครั้งเพื่อให้ orderItems ใน entity โหลดครบ (lazy loading)
            Orders savedOrder = ordersRepository.findById(order.getOrderId()).orElseThrow();
            return ApiResponse.ok("ยืนยันคำสั่งซื้อสำเร็จ", OrderDetailResponse.from(savedOrder));

        } catch (Exception e) {
            // Alternate Flow 5.1.1
            return ApiResponse.error("ไม่สามารถบันทึกข้อมูลได้");
        }
    }
}
