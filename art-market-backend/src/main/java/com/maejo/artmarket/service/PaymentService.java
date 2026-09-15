package com.maejo.artmarket.service;

import com.maejo.artmarket.dto.ApiResponse;
import com.maejo.artmarket.dto.MakePaymentRequest;
import com.maejo.artmarket.dto.PaymentDetailResponse;
import com.maejo.artmarket.dto.PaymentPreviewResponse;
import com.maejo.artmarket.entity.Buyer;
import com.maejo.artmarket.entity.OrderItem;
import com.maejo.artmarket.entity.Orders;
import com.maejo.artmarket.entity.Payment;
import com.maejo.artmarket.enums.AvailabilityStatus;
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

        // สลิปที่ถูกปฏิเสธไปแล้วต้องอัปโหลดใหม่ได้ หน้าชำระเงินจึงต้องเปิดยอดให้ดูอีกครั้ง
        boolean paidAlready = paymentRepository.findByOrder_OrderId(orderId)
                .filter(p -> p.getPaymentStatus() != PaymentStatus.REJECTED)
                .isPresent();
        if (paidAlready) {
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

        // ผู้ขายทุกคนต้อง "ตอบแล้ว" ก่อน — จะพร้อมขายหรือไม่พร้อมก็ได้ แต่ต้องไม่มีใครค้างอยู่
        //
        // ที่ต้องรอให้ครบเพราะยอดเงินขึ้นกับว่าชิ้นไหนได้ไปบ้าง
        // ถ้าปล่อยให้จ่ายตอนยังมีคนไม่ตอบ ยอดที่จ่ายจะเปลี่ยนทีหลังเมื่อคนที่เหลือตอบมา
        //
        // หน้าเว็บซ่อนปุ่มชำระเงินไว้อยู่แล้ว แต่ endpoint ต้องกันเองด้วย
        // ไม่งั้นยิงตรงมาที่ API ก็จ่ายได้ (หน้าเว็บไม่ใช่ที่บังคับกฎทางธุรกิจ)
        boolean waitingSeller = order.getOrderItems().stream()
                .anyMatch(i -> i.getAvailabilityStatus() == AvailabilityStatus.PENDING_CONFIRMATION);
        if (waitingSeller) {
            return ApiResponse.error("กรุณารอผู้ขายยืนยันความพร้อมในการขายให้ครบทุกชิ้นก่อนชำระเงิน");
        }

        // ต้องเหลืออย่างน้อยหนึ่งชิ้นที่พร้อมขาย ไม่งั้นไม่มีอะไรให้จ่าย
        boolean hasPayableItem = order.getOrderItems().stream()
                .anyMatch(i -> i.getAvailabilityStatus() == AvailabilityStatus.AVAILABLE);
        if (!hasPayableItem) {
            return ApiResponse.error("ผู้ขายแจ้งไม่พร้อมจำหน่ายทุกชิ้นในคำสั่งซื้อนี้ ไม่สามารถชำระเงินได้");
        }

        // ป้องกันจ่ายซ้ำ — ยกเว้นกรณีที่ผู้ดูแลระบบปฏิเสธสลิปไปแล้ว
        // ตรงนั้นต้องให้ผู้ซื้ออัปโหลดใหม่ได้ ไม่งั้นคำสั่งซื้อจะค้างตายอยู่แบบนั้นตลอดไป
        Optional<Payment> existingOpt = paymentRepository.findByOrder_OrderId(req.getOrderId());
        if (existingOpt.isPresent()
                && existingOpt.get().getPaymentStatus() != PaymentStatus.REJECTED) {
            return ApiResponse.error("คำสั่งซื้อนี้ชำระเงินไปแล้ว");
        }

        // TODO: Basic Flow ข้อ 6 — เสียบ API ตรวจสอบสลิปจริงตรงนี้ในอนาคต
        // ถ้า API บอกว่าสลิปปลอม ให้ return ApiResponse.error(
        //     "หลักฐานการโอนเงินไม่ถูกต้อง กรุณาลองอัปโหลดหลักฐานการโอนเงินใหม่อีกครั้ง");

        try {
            // Basic Flow ข้อ 5 — ระบบดึงข้อมูลราคาที่ต้องชำระเอง (ไม่รับจาก frontend)
            PaymentPreviewResponse preview = buildPreview(order);

            // Basic Flow ข้อ 7.1 — บันทึกข้อมูลการชำระเงิน
            // ถ้าเคยถูกปฏิเสธมาก่อน ให้แก้แถวเดิมแทนสร้างใหม่
            // (ตาราง payment มี UNIQUE ที่ order_id — สร้างซ้ำจะชนคีย์)
            Payment payment = existingOpt.orElseGet(() -> Payment.builder().order(order).build());
            payment.setGrandTotal(preview.getGrandTotal());
            payment.setShippingCost(preview.getShippingCost());
            payment.setSlipTransfer(req.getSlipTransfer());
            payment.setPaymentStatus(PaymentStatus.PENDING_CONFIRMATION); // รอ Admin ตรวจสอบ

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

    /** fallback ไป artwork ให้เฉพาะออเดอร์เก่าที่สร้างก่อนมีคอลัมน์ order_item.shipping_cost */
    private static double shippingOf(OrderItem item) {
        if (item.getShippingCost() != null) return item.getShippingCost();
        var artwork = item.getArtwork();
        return artwork != null && artwork.getShippingCostEstimate() != null
                ? artwork.getShippingCostEstimate() : 0.0;
    }

    private PaymentPreviewResponse buildPreview(Orders order) {
        // คิดเงินเฉพาะชิ้นที่ผู้ขายยืนยันว่าพร้อมขายเท่านั้น
        //
        // คำสั่งซื้อใบเดียวมีงานจากหลายผู้ขายได้ ถ้าผู้ขายรายหนึ่งแจ้งไม่พร้อมจำหน่าย
        // ผู้ซื้อยังซื้อชิ้นที่เหลือต่อได้ แต่ต้องไม่ถูกเก็บเงินค่าชิ้นที่ไม่ได้ของ
        var payableItems = order.getOrderItems().stream()
                .filter(i -> i.getAvailabilityStatus() == AvailabilityStatus.AVAILABLE)
                .toList();

        double totalPrice = payableItems.stream()
                .mapToDouble(OrderItem::getPrice)
                .sum();

        // ค่าจัดส่งอ่านจาก order_item ที่ล็อกไว้ตอนยืนยันคำสั่งซื้อ ไม่ใช่จาก artwork
        // artwork.shippingCost เป็นราคาประเมินที่ผู้ขายแก้ได้ตลอด — ถ้าอ่านสด
        // ยอดที่ต้องโอนจะขยับได้หลังผู้ซื้อเห็นตัวเลขไปแล้ว
        double shippingCost = payableItems.stream()
                .mapToDouble(PaymentService::shippingOf)
                .sum();

        return PaymentPreviewResponse.builder()
                .orderId(order.getOrderId())
                .totalPrice(totalPrice)
                .shippingCost(shippingCost)
                .grandTotal(totalPrice + shippingCost)
                .build();
    }
}
