package com.maejo.artmarket.service;

import com.maejo.artmarket.dto.ApiResponse;
import com.maejo.artmarket.dto.MakePaymentRequest;
import com.maejo.artmarket.dto.PaymentDetailResponse;
import com.maejo.artmarket.dto.PaymentPreviewResponse;
import com.maejo.artmarket.entity.Buyer;
import com.maejo.artmarket.entity.OrderItem;
import com.maejo.artmarket.entity.Orders;
import com.maejo.artmarket.entity.Payment;
import com.maejo.artmarket.enums.PaymentStatus;
import com.maejo.artmarket.repository.BuyerRepository;
import com.maejo.artmarket.repository.OrdersRepository;
import com.maejo.artmarket.repository.PaymentRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Optional;

/**
 * PaymentService — Business Logic ของยูสเคส 3.1.15 Make Payment (ฝั่ง Buyer)
 *
 * หมายเหตุการออกแบบ (ทำให้ใช้งานได้จริงในระดับโปรเจกต์นักศึกษา):
 * SRS Basic Flow ข้อ 6 ระบุว่า "ระบบตรวจสอบรูปภาพหลักฐานการโอนเงินจาก API" (ส่งไปตรวจสอบ
 * ที่ API ภายนอก) — เอกสารไม่ได้ระบุว่า API ตัวไหน ในเวอร์ชันนี้จึง "ข้าม" ขั้นตอนตรวจสอบอัตโนมัติไปก่อน
 * (mark เป็น TODO) แล้วให้ Admin เป็นคนตรวจสลิปด้วยตาเปล่าแทนผ่านยูสเคส Confirm Payment
 * ถ้าอนาคตมี API ตรวจสลิปจริง (เช่น slip2go, EasySlip) ค่อยเสียบ logic เพิ่มตรงจุดที่ทำเครื่องหมายไว้
 */
@Service
@RequiredArgsConstructor
public class PaymentService {

    private final OrdersRepository  ordersRepository;
    private final BuyerRepository   buyerRepository;
    private final PaymentRepository paymentRepository;

    // =========================================================================
    // ดูยอดเงินที่ต้องชำระ ก่อนอัปโหลดสลิป (SRS Basic Flow ข้อ 2)
    // =========================================================================

    @Transactional(readOnly = true)
    public ApiResponse<PaymentPreviewResponse> previewPayment(String username, Integer orderId) {

        Buyer buyer = buyerRepository.findByUser_Username(username).orElse(null);
        if (buyer == null) {
            return ApiResponse.error("ไม่พบข้อมูลผู้ซื้อ");
        }

        Optional<Orders> orderOpt = ordersRepository.findById(orderId);
        if (orderOpt.isEmpty()) {
            return ApiResponse.error("ไม่พบรายการคำสั่งซื้อ");
        }

        Orders order = orderOpt.get();
        if (!order.getBuyer().getBuyerId().equals(buyer.getBuyerId())) {
            return ApiResponse.error("ไม่มีสิทธิ์เข้าถึงคำสั่งซื้อนี้");
        }

        if (paymentRepository.findByOrder_OrderId(orderId).isPresent()) {
            return ApiResponse.error("คำสั่งซื้อนี้ชำระเงินไปแล้ว");
        }

        PaymentPreviewResponse preview = buildPreview(order);
        return ApiResponse.ok("ดึงยอดชำระเงินสำเร็จ", preview);
    }

    // =========================================================================
    // ยูสเคส 3.1.15 Make Payment
    // Alternate Flow 4.1: "กรุณาแนบสลิปการโอนเงินเพื่อยืนยันใหม่อีกครั้ง" (จัดการที่ @Valid ใน DTO)
    // Alternate Flow 6.1.1: "หลักฐานการโอนเงินไม่ถูกต้อง..." (ดู TODO ด้านบน - ยังไม่มี API ตรวจสอบ)
    // Alternate Flow 7.1.1: "ระบบขัดข้อง ไม่สามารถบันทึกหลักฐานได้ กรุณาลองใหม่อีกครั้ง"
    // =========================================================================

    @Transactional
    public ApiResponse<PaymentDetailResponse> makePayment(String username, MakePaymentRequest req) {

        Buyer buyer = buyerRepository.findByUser_Username(username).orElse(null);
        if (buyer == null) {
            return ApiResponse.error("ไม่พบข้อมูลผู้ซื้อ");
        }

        Optional<Orders> orderOpt = ordersRepository.findById(req.getOrderId());
        if (orderOpt.isEmpty()) {
            return ApiResponse.error("ไม่พบรายการคำสั่งซื้อ");
        }

        Orders order = orderOpt.get();

        // Security check — ต้องเป็นคำสั่งซื้อของ buyer คนนี้
        if (!order.getBuyer().getBuyerId().equals(buyer.getBuyerId())) {
            return ApiResponse.error("ไม่มีสิทธิ์ชำระเงินสำหรับคำสั่งซื้อนี้");
        }

        // ป้องกันจ่ายซ้ำ
        if (paymentRepository.findByOrder_OrderId(req.getOrderId()).isPresent()) {
            return ApiResponse.error("คำสั่งซื้อนี้ชำระเงินไปแล้ว");
        }

        // TODO: Basic Flow ข้อ 6 — เสียบ API ตรวจสอบสลิปจริงตรงนี้ในอนาคต
        // ถ้า API บอกว่าสลิปปลอม ให้ return ApiResponse.error(
        //     "หลักฐานการโอนเงินไม่ถูกต้อง กรุณาลองอัปโหลดหลักฐานการโอนเงินใหม่อีกครั้ง");

        try {
            // Basic Flow ข้อ 5 — ระบบดึงข้อมูลราคาที่ต้องชำระเอง (ไม่รับจาก frontend)
            PaymentPreviewResponse preview = buildPreview(order);

            // Basic Flow ข้อ 7.1 — บันทึกข้อมูลการชำระเงิน
            Payment payment = Payment.builder()
                    .order(order)
                    .grandTotal(preview.getGrandTotal())
                    .shippingCost(preview.getShippingCost())
                    .slipTransfer(req.getSlipTransfer())
                    .transferStatus(PaymentStatus.PENDING_CONFIRMATION) // รอ Admin ตรวจสอบ (Confirm Payment)
                    .build();

            paymentRepository.save(payment);
            return ApiResponse.ok("อัปโหลดหลักฐานการชำระเงินสำเร็จ รอการตรวจสอบจากผู้ดูแลระบบ",
                    PaymentDetailResponse.from(payment));

        } catch (Exception e) {
            // Alternate Flow 7.1.1
            return ApiResponse.error("ระบบขัดข้อง ไม่สามารถบันทึกหลักฐานได้ กรุณาลองใหม่อีกครั้ง");
        }
    }

    // =========================================================================
    // Helper — คำนวณยอดเงิน: totalPrice (ราคารวมชิ้นงาน) + shippingCost (รวมค่าส่งทุกชิ้น)
    // =========================================================================

    private PaymentPreviewResponse buildPreview(Orders order) {
        double totalPrice = order.getOrderItems().stream()
                .mapToDouble(OrderItem::getPrice)
                .sum();

        double shippingCost = order.getOrderItems().stream()
                .map(OrderItem::getArtwork)
                .mapToDouble(a -> a.getShippingCost() != null ? a.getShippingCost() : 0.0)
                .sum();

        return PaymentPreviewResponse.builder()
                .orderId(order.getOrderId())
                .totalPrice(totalPrice)
                .shippingCost(shippingCost)
                .grandTotal(totalPrice + shippingCost)
                .build();
    }
}
