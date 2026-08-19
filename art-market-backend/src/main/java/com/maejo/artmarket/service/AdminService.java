package com.maejo.artmarket.service;

import com.maejo.artmarket.dto.*;
import com.maejo.artmarket.entity.Payment;
import com.maejo.artmarket.entity.Seller;
import com.maejo.artmarket.entity.User;
import com.maejo.artmarket.enums.OrderStatus;
import com.maejo.artmarket.enums.PaymentStatus;
import com.maejo.artmarket.enums.Role;
import com.maejo.artmarket.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

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
@RequiredArgsConstructor
public class AdminService {

    private final UserRepository    userRepository;
    private final SellerRepository  sellerRepository;
    private final PaymentRepository paymentRepository;
    private final OrdersRepository  ordersRepository;

    // =========================================================================
    // ยูสเคส 3.1.25 List User
    // =========================================================================

    @Transactional(readOnly = true)
    public ApiResponse<List<UserSummaryResponse>> listUsers() {
        List<User> users = userRepository.findAll();
        if (users.isEmpty()) return ApiResponse.error("ไม่พบข้อมูลผู้ใช้งาน");
        return ApiResponse.ok("พบผู้ใช้งาน " + users.size() + " ราย",
                users.stream().map(UserSummaryResponse::from).toList());
    }

    // =========================================================================
    // ยูสเคส 3.1.26 Verify Seller
    // =========================================================================

    /** ดูรายการ Seller ที่ verified=false รออนุมัติ */
    @Transactional(readOnly = true)
    public ApiResponse<List<SellerVerifyResponse>> listPendingSellers() {
        List<Seller> pending = sellerRepository.findByVerifiedFalse();
        if (pending.isEmpty()) return ApiResponse.error("ไม่มีรายการผู้สมัครขายรออนุมัติ");
        return ApiResponse.ok("พบผู้สมัครขายรออนุมัติ " + pending.size() + " ราย",
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

        try {
            if (req.getApproved()) {
                // อนุมัติ — Basic Flow ข้อ 6.1
                seller.setVerified(true);
                sellerRepository.save(seller);
                return ApiResponse.ok("อนุมัติผู้ขายสำเร็จ", SellerVerifyResponse.from(seller));
            } else {
                // ปฏิเสธ — ลบ Seller + คืน role เป็น BUYER
                User user = seller.getUser();
                sellerRepository.delete(seller);
                user.setRole(Role.BUYER);
                userRepository.save(user);
                return ApiResponse.ok("ปฏิเสธผู้สมัครขายสำเร็จ", null);
            }
        } catch (Exception e) {
            return ApiResponse.error("ไม่สามารถแก้ไขสถานะได้ กรุณาลองใหม่อีกครั้ง");
        }
    }

    // =========================================================================
    // ยูสเคส 3.1.27 List Payment
    // ดูเฉพาะรายการที่ PENDING_CONFIRMATION (ผู้ซื้ออัปสลิปแล้ว รอ Admin ตรวจ)
    // =========================================================================

    @Transactional(readOnly = true)
    public ApiResponse<List<PaymentSummaryResponse>> listPayments() {
        List<Payment> payments = paymentRepository
                .findByTransferStatus(PaymentStatus.PENDING_CONFIRMATION);
        if (payments.isEmpty()) return ApiResponse.error("ไม่พบรายการการโอนเงิน");
        return ApiResponse.ok("พบรายการโอนเงิน " + payments.size() + " รายการ",
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
        if (payment.getTransferStatus() != PaymentStatus.PENDING_CONFIRMATION) {
            return ApiResponse.error("รายการนี้ถูกดำเนินการแล้ว");
        }

        try {
            if (req.getApproved()) {
                payment.setTransferStatus(PaymentStatus.COMPLETED);
                // อัปเดต order → COMPLETED ด้วย
                payment.getOrder().setOrderStatus(OrderStatus.COMPLETED);
                ordersRepository.save(payment.getOrder());
            } else {
                payment.setTransferStatus(PaymentStatus.REJECTED);
            }
            paymentRepository.save(payment);
            return ApiResponse.ok(
                    req.getApproved() ? "อนุมัติการโอนเงินสำเร็จ" : "ปฏิเสธการโอนเงินสำเร็จ",
                    PaymentDetailResponse.from(payment));

        } catch (Exception e) {
            return ApiResponse.error("ไม่สามารถแก้ไขข้อมูลได้ กรุณาลองใหม่อีกครั้ง");
        }
    }
}
