package com.maejo.artmarket.service;

import com.maejo.artmarket.dto.*;
import com.maejo.artmarket.entity.Payment;
import com.maejo.artmarket.entity.Seller;
import com.maejo.artmarket.entity.User;
import com.maejo.artmarket.entity.Orders;
import com.maejo.artmarket.entity.SellerPayout;
import com.maejo.artmarket.enums.ArtworkStatus;
import com.maejo.artmarket.enums.AvailabilityStatus;
import com.maejo.artmarket.enums.OrderStatus;
import com.maejo.artmarket.enums.PaymentStatus;
import com.maejo.artmarket.enums.Role;
import com.maejo.artmarket.repository.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

/**
 * AdminService — Business Logic สำหรับ Admin ทั้งหมด:
 *   3.1.25 List User
 *   3.1.26 Verify Seller
 *   3.1.27 List Payment
 *   3.1.28 Confirm Payment
 */
@Service
@Slf4j
@RequiredArgsConstructor
public class AdminService {

    private final UserRepository    userRepository;
    private final SellerRepository  sellerRepository;
    private final PaymentRepository paymentRepository;
    private final OrdersRepository  ordersRepository;
    private final SellerPayoutRepository sellerPayoutRepository;

    // =========================================================================
    // ยูสเคส 3.1.25 List User
    // =========================================================================

    @Transactional(readOnly = true)
    public ApiResponse<List<UserSummaryResponse>> listUsers() {
        // ตัดบัญชี ADMIN ออก — หน้านี้มีไว้จัดการผู้ซื้อ/ผู้ขาย
        // ตั้งแต่ยุบตาราง admin เข้ามาอยู่ใน users ถ้าไม่กรองไว้
        // ผู้ดูแลระบบจะเห็นบัญชีตัวเองอยู่ในรายการพร้อมปุ่มจัดการบัญชี
        List<User> users = userRepository.findByRoleNot(Role.ADMIN);
        return ApiResponse.ok(
                users.isEmpty() ? "ไม่พบข้อมูลผู้ใช้งาน" : "พบผู้ใช้งาน " + users.size() + " ราย",
                users.stream().map(UserSummaryResponse::from).toList());
    }

    /**
     * ดูข้อมูลผู้ใช้รายคนแบบเต็ม — ใช้กับหน้า "ดูข้อมูลผู้ใช้งาน" ของ Admin
     *
     * ส่งทุกอย่างยกเว้นรหัสผ่าน (ดูหมายเหตุใน UserDetailResponse)
     * ต้องอยู่ใน transaction เพราะ DTO ไล่อ่าน addresses / orders / artworks
     * ซึ่งเป็น lazy collection ถ้าอ่านนอก transaction จะเจอ LazyInitializationException
     */
    @Transactional(readOnly = true)
    public ApiResponse<UserDetailResponse> getUserDetail(Integer userId) {
        return userRepository.findById(userId)
                .map(u -> ApiResponse.ok("ดึงข้อมูลผู้ใช้งานสำเร็จ", UserDetailResponse.from(u)))
                .orElse(ApiResponse.error("ไม่พบข้อมูลผู้ใช้งาน"));
    }

    // =========================================================================
    // ยูสเคส 3.1.26 Verify Seller
    // =========================================================================

    /** ดูรายการ Seller ที่ verified=false รออนุมัติ */
    @Transactional(readOnly = true)
    public ApiResponse<List<SellerVerifyResponse>> listPendingSellers() {
        List<Seller> pending = sellerRepository.findByVerifiedFalse();
        return ApiResponse.ok(
                pending.isEmpty() ? "ไม่มีรายการผู้สมัครขายรออนุมัติ"
                                  : "พบผู้สมัครขายรออนุมัติ " + pending.size() + " ราย",
                pending.stream().map(SellerVerifyResponse::from).toList());
    }

    /** ดูรายละเอียด Seller คนเดียว ก่อนกด approve/reject */
    @Transactional(readOnly = true)
    public ApiResponse<SellerVerifyResponse> getSellerDetail(Integer sellerId) {
        return sellerRepository.findById(sellerId)
                .map(s -> ApiResponse.ok("ดึงข้อมูลสำเร็จ", SellerVerifyResponse.from(s)))
                .orElse(ApiResponse.error("ไม่พบข้อมูลผู้สมัครขาย"));
    }

    /**
     * Basic Flow ข้อ 6 — Admin กด approve หรือ reject
     * approve=true  → verified=true  → Seller ขายงานได้เลย
     * approve=false → ลบ Seller record + คืน role User กลับเป็น BUYER
     * Alternate Flow 6.1.1: "ไม่สามารถแก้ไขสถานะได้ กรุณาลองใหม่อีกครั้ง"
     */
    @Transactional
    public ApiResponse<SellerVerifyResponse> verifySeller(Integer sellerId, VerifySellerRequest req) {

        Optional<Seller> sellerOpt = sellerRepository.findById(sellerId);
        if (sellerOpt.isEmpty()) return ApiResponse.error("ไม่พบข้อมูลผู้สมัครขาย");

        Seller seller = sellerOpt.get();
        if (seller.isVerified()) return ApiResponse.error("ผู้ขายรายนี้ได้รับการอนุมัติแล้ว");

        // กันข้อมูลหายแบบเงียบๆ: Seller.artworks และ Seller.copyrightTransfers ตั้ง
        // cascade = ALL + orphanRemoval = true ไว้ ถ้าลบ Seller ทิ้งทั้งที่ยังมีผลงานหรือสัญญาอยู่
        // ข้อมูลพวกนั้นจะถูกลบตามไปหมด (ปกติไม่เกิด เพราะผู้ขายที่ยังไม่อนุมัติสร้างผลงานไม่ได้)
        if (!req.getApproved()
                && (!seller.getArtworks().isEmpty() || !seller.getCopyrightTransfers().isEmpty())) {
            return ApiResponse.error(
                    "ไม่สามารถปฏิเสธได้ เพราะผู้สมัครรายนี้มีผลงานหรือสัญญาลิขสิทธิ์อยู่ในระบบแล้ว");
        }

        try {
            if (req.getApproved()) {
                // อนุมัติ — Basic Flow ข้อ 6.1
                seller.setVerified(true);
                sellerRepository.saveAndFlush(seller);
                return ApiResponse.ok("อนุมัติผู้ขายสำเร็จ", SellerVerifyResponse.from(seller));
            }

            // ---------------------------- ปฏิเสธ ----------------------------
            // คืน role เป็น BUYER แล้วเอาแถว Seller ออก
            //
            // ⚠️ ลำดับตรงนี้สำคัญ — ของเดิมเขียนว่า delete(seller) ก่อน แล้วค่อย save(user)
            // ซึ่งพังเสมอ เพราะ User.seller เป็น
            //     @OneToOne(mappedBy = "user", cascade = CascadeType.ALL, orphanRemoval = true)
            // การเรียก save(user) = em.merge(user) จะ cascade merge ลงไปที่ user.seller
            // ซึ่งตอนนั้นเป็น entity ที่ถูก remove ไปแล้ว → Hibernate โยน exception ตอน flush/commit
            // ซึ่งเกิด "หลัง" เมธอดนี้ return ไปแล้ว catch ข้างล่างจึงจับไม่ทัน
            // หลุดไปที่ GlobalExceptionHandler กลายเป็น HTTP 500 "เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง"
            //
            // วิธีที่ถูกคือตัดความสัมพันธ์ฝั่ง User ก่อน แล้วให้ orphanRemoval ลบแถว Seller ให้เอง
            User user = seller.getUser();
            user.setSeller(null);
            user.setRole(Role.BUYER);
            // flush ในนี้ เพื่อให้ error ที่เกิดจริง (เช่น FK) ถูก catch ด้านล่างจับ ไม่ใช่หลุดเป็น 500
            userRepository.saveAndFlush(user);

            // เผื่อกรณี orphanRemoval ไม่ทำงาน (เช่น mapping ถูกแก้ทีหลัง) — ลบซ้ำให้ชัวร์
            // ต้องเช็คก่อนลบ ห้ามเรียก delete(seller) ตรงๆ เพราะถ้าถูก remove ไปแล้ว
            // Spring Data จะพยายาม merge entity ที่ลบแล้วและโยน exception ซ้ำรอยเดิม
            if (sellerRepository.existsById(sellerId)) {
                sellerRepository.deleteById(sellerId);
                sellerRepository.flush();
            }

            return ApiResponse.ok("ปฏิเสธผู้สมัครขายสำเร็จ", null);

        } catch (Exception e) {
            // log ไว้ด้วย ไม่งั้นเวลาพังจริงจะไม่มีร่องรอยว่าเพราะอะไร
            log.error("verifySeller failed (sellerId={}, approved={}): {}",
                    sellerId, req.getApproved(), e.getMessage(), e);
            return ApiResponse.error("ไม่สามารถแก้ไขสถานะได้ กรุณาลองใหม่อีกครั้ง");
        }
    }

    // =========================================================================
    // ยูสเคส 3.1.27 List Payment
    // ดูเฉพาะรายการที่ PENDING_CONFIRMATION (ผู้ซื้ออัปสลิปแล้ว รอ Admin ตรวจ)
    // =========================================================================

    @Transactional(readOnly = true)
    public ApiResponse<List<PaymentSummaryResponse>> listPayments() {
        // เดิมกรองเฉพาะ PENDING_CONFIRMATION ทำให้หน้า List Payment ของ Admin
        // "รายการหายไป" ทันทีที่กดอนุมัติ ตรวจสอบย้อนหลังไม่ได้เลย
        // SRS ยูสเคส List Payment ระบุว่าแสดง "รายการการโอนเงินทั้งหมด"
        List<Payment> payments = paymentRepository.findAll();
        return ApiResponse.ok(
                payments.isEmpty() ? "ไม่พบรายการการโอนเงิน" : "พบรายการโอนเงิน " + payments.size() + " รายการ",
                payments.stream().map(PaymentSummaryResponse::from).toList());
    }

    // =========================================================================
    // ยูสเคส 3.1.28 Confirm Payment
    // =========================================================================

    /** Basic Flow ข้อ 4-5 — ดูรายละเอียดก่อนตัดสินใจ */
    @Transactional(readOnly = true)
    public ApiResponse<PaymentDetailResponse> getPaymentDetail(Integer paymentId) {
        return paymentRepository.findById(paymentId)
                .map(p -> ApiResponse.ok("ดึงข้อมูลสำเร็จ", PaymentDetailResponse.from(p)))
                .orElse(ApiResponse.error("ไม่พบคำการโอนเงิน"));
    }

    /**
     * Basic Flow ข้อ 8 — Admin กด approve หรือ reject
     * approve=true  → COMPLETED + orderStatus → COMPLETED
     * approve=false → REJECTED
     * Alternate Flow 8.1.1: "ไม่สามารถแก้ไขข้อมูลได้ กรุณาลองใหม่อีกครั้ง"
     */
    @Transactional
    public ApiResponse<PaymentDetailResponse> confirmPayment(Integer paymentId, ConfirmPaymentRequest req) {

        Optional<Payment> paymentOpt = paymentRepository.findById(paymentId);
        if (paymentOpt.isEmpty()) return ApiResponse.error("ไม่พบคำการโอนเงิน");

        Payment payment = paymentOpt.get();
        if (payment.getPaymentStatus() != PaymentStatus.PENDING_CONFIRMATION) {
            return ApiResponse.error("รายการนี้ถูกดำเนินการแล้ว");
        }

        try {
            if (req.getApproved()) {
                payment.setPaymentStatus(PaymentStatus.COMPLETED);
                // จุดเริ่มนับกำหนดยืนยันการจัดส่งอัตโนมัติ (DeliveryAutoConfirmService)
                payment.setConfirmedAt(LocalDateTime.now());
                // อัปเดต order → COMPLETED ด้วย
                payment.getOrder().setOrderStatus(OrderStatus.COMPLETED);

                // ปิดการขายชิ้นที่ผู้ซื้อจ่ายเงินแล้ว RESERVED → SOLD
                // เดิมไม่มีจุดไหนตั้ง SOLD เลย งานที่ขายไปแล้วจึงค้าง "อยู่ในคำสั่งซื้อแล้ว" ตลอดไป
                // และตัวกรองที่ซ่อนงาน SOLD ออกจากหน้าค้นหาไม่เคยทำงานจริง
                payment.getOrder().getOrderItems().stream()
                        .filter(i -> i.getAvailabilityStatus() == AvailabilityStatus.AVAILABLE)
                        .forEach(i -> i.getArtwork().setArtworkStatus(ArtworkStatus.SOLD));

                ordersRepository.save(payment.getOrder());
            } else {
                payment.setPaymentStatus(PaymentStatus.REJECTED);
            }
            paymentRepository.save(payment);
            return ApiResponse.ok(
                    req.getApproved() ? "อนุมัติการโอนเงินสำเร็จ" : "ปฏิเสธการโอนเงินสำเร็จ",
                    PaymentDetailResponse.from(payment));

        } catch (Exception e) {
            return ApiResponse.error("ไม่สามารถแก้ไขข้อมูลได้ กรุณาลองใหม่อีกครั้ง");
        }
    }

    // =========================================================================
    // โอนเงินให้ผู้ขาย — หลังคำสั่งซื้อจัดส่งสำเร็จ ผู้ดูแลระบบโอนเงินต่อแล้วแนบสลิปเป็นหลักฐาน
    // แยกรายผู้ขาย ยอด = ราคาผลงาน + ค่าจัดส่ง ของชิ้นที่พร้อมขาย (คำนวณที่ backend เท่านั้น)
    // =========================================================================

    @Transactional
    public ApiResponse<PaymentDetailResponse> createPayout(Integer orderId, CreatePayoutRequest req) {

        Optional<Orders> orderOpt = ordersRepository.findById(orderId);
        if (orderOpt.isEmpty()) return ApiResponse.error("ไม่พบรายการคำสั่งซื้อ");
        Orders order = orderOpt.get();

        if (order.getPayment() == null
                || order.getPayment().getPaymentStatus() != PaymentStatus.COMPLETED) {
            return ApiResponse.error("คำสั่งซื้อนี้ยังไม่ได้ยืนยันการชำระเงินของผู้ซื้อ");
        }

        SellerPayoutInfo info = SellerPayoutInfo.forSeller(order, req.getSellerId());
        if (info == null) {
            return ApiResponse.error("ไม่พบผู้ขายรายนี้ในคำสั่งซื้อ หรือไม่มีผลงานที่พร้อมขาย");
        }
        if (info.isPaid()) {
            return ApiResponse.error("โอนเงินให้ผู้ขายรายนี้แล้ว");
        }
        if (!info.isReadyForPayout()) {
            return ApiResponse.error("ผลงานของผู้ขายรายนี้ยังจัดส่งไม่สำเร็จครบทุกชิ้น ("
                    + info.getDeliveredCount() + "/" + info.getItemCount() + ")");
        }

        String err = ImageDataUrls.validate(req.getSlipTransfer(), "หลักฐานการโอนเงินให้ผู้ขาย");
        if (err != null) return ApiResponse.error(err);

        Seller seller = sellerRepository.findById(req.getSellerId()).orElse(null);
        if (seller == null) return ApiResponse.error("ไม่พบข้อมูลผู้ขาย");
        if (!seller.hasBankAccount()) {
            return ApiResponse.error("ผู้ขายรายนี้ยังไม่ได้ตั้งบัญชีธนาคารสำหรับรับเงิน");
        }

        try {
            SellerPayout payout = SellerPayout.builder()
                    .order(order)
                    .seller(seller)
                    .amount(info.getAmount())
                    .slipTransfer(req.getSlipTransfer())
                    .paidAt(LocalDateTime.now())
                    // สำเนาบัญชี ณ ตอนโอน — ผู้ขายแก้บัญชีทีหลังได้ แต่หลักฐานต้องไม่เปลี่ยนตาม
                    .bankName(seller.getBankCode().getDisplayName())
                    .bankAccountNumber(seller.getBankAccountNumber())
                    .bankAccountName(seller.getBankAccountName())
                    .build();
            order.getSellerPayouts().add(payout);
            // flush ในนี้ เพื่อให้ unique (order_id, seller_id) ที่ชนจากการกดซ้ำพร้อมกัน ถูก catch ด้านล่าง
            sellerPayoutRepository.saveAndFlush(payout);

            return ApiResponse.ok("บันทึกการโอนเงินให้ผู้ขายสำเร็จ",
                    PaymentDetailResponse.from(order.getPayment()));
        } catch (Exception e) {
            log.error("createPayout failed (orderId={}, sellerId={}): {}",
                    orderId, req.getSellerId(), e.getMessage(), e);
            return ApiResponse.error("ไม่สามารถบันทึกการโอนเงินได้ กรุณาลองใหม่อีกครั้ง");
        }
    }
}
