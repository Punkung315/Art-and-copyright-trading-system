package com.maejo.artmarket.service;

import com.maejo.artmarket.dto.*;
import com.maejo.artmarket.entity.Buyer;
import com.maejo.artmarket.entity.CopyrightPayment;
import com.maejo.artmarket.entity.CopyrightTransfer;
import com.maejo.artmarket.enums.CopyrightTransferStatus;
import com.maejo.artmarket.enums.PaymentStatus;
import com.maejo.artmarket.repository.BuyerRepository;
import com.maejo.artmarket.repository.CopyrightPaymentRepository;
import com.maejo.artmarket.repository.CopyrightTransferRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Optional;

/**
 * การชำระเงินค่าลิขสิทธิ์
 *
 * ลำดับใน flow (ยืนยันกับเจ้าของโปรเจกต์แล้ว):
 *   ผู้ซื้อส่งคำขอ (PENDING)
 *   → ผู้ขายตอบรับ (SIGNED)
 *   → ผู้ซื้อโอนเงินและอัปสลิป (copyright_payment = PENDING_CONFIRMATION)
 *   → แอดมินตรวจสลิป (COMPLETED / REJECTED)
 *   → ผู้ซื้อลงนามสัญญาได้ (COMPLETED)
 *
 * เหตุผลที่ให้จ่ายก่อนลงนาม: ลิขสิทธิ์โอนแล้วเรียกคืนยากกว่าชิ้นงาน
 * ถ้าปล่อยให้ลงนามก่อนแล้วค่อยจ่าย เอกสารที่สมบูรณ์จะอยู่ในมือผู้ซื้อทั้งที่ยังไม่ได้เงิน
 */
@Service
@RequiredArgsConstructor
public class CopyrightPaymentService {

    private final CopyrightTransferRepository copyrightTransferRepository;
    private final CopyrightPaymentRepository  copyrightPaymentRepository;
    private final BuyerRepository             buyerRepository;

    // =========================================================================
    // ฝั่งผู้ซื้อ
    // =========================================================================

    /** ยอดที่ต้องชำระ + สถานะปัจจุบัน สำหรับเปิดหน้าชำระเงิน */
    @Transactional(readOnly = true)
    public ApiResponse<CopyrightPaymentPreviewResponse> previewPayment(String username, Integer copyrightId) {

        Buyer buyer = buyerRepository.findByUser_Username(username).orElse(null);
        if (buyer == null) return ApiResponse.error("ไม่พบข้อมูลผู้ซื้อ");

        Optional<CopyrightTransfer> transferOpt = copyrightTransferRepository
                .findByCopyrightIdAndBuyer_BuyerId(copyrightId, buyer.getBuyerId());
        if (transferOpt.isEmpty()) return ApiResponse.error("ไม่พบข้อมูลสัญญาการโอนลิขสิทธิ์");

        CopyrightTransfer transfer = transferOpt.get();
        CopyrightPayment existing = copyrightPaymentRepository
                .findByCopyrightTransfer_CopyrightId(copyrightId).orElse(null);

        String blockReason = payBlockReason(transfer, existing);

        // ยอดที่แสดง: ถ้าเคยจ่ายแล้วต้องเป็นยอดที่ล็อกไว้เท่านั้น
        // ผู้ขายแก้ราคาลิขสิทธิ์ได้ตลอด (และระบบยังคำนวณใหม่ให้อัตโนมัติเมื่อราคาขายเปลี่ยน)
        // ถ้าอ่านสดทุกครั้ง ยอดในใบเสร็จของผู้ซื้อจะขยับเองหลังจากโอนเงินไปแล้ว
        Double amount = existing != null
                ? existing.getAmount()
                : currentCopyrightPrice(transfer);

        return ApiResponse.ok("ดึงยอดชำระเงินค่าลิขสิทธิ์สำเร็จ",
                CopyrightPaymentPreviewResponse.builder()
                        .copyrightId(transfer.getCopyrightId())
                        .artworkId(transfer.getArtwork().getArtworkId())
                        .artworkName(transfer.getArtwork().getArtworkName())
                        .sellerName(transfer.getSeller().getUser().getFullName())
                        .amount(amount)
                        .copyrightTransferStatus(transfer.getTransferStatus())
                        .paymentStatus(existing != null ? existing.getTransferStatus() : null)
                        .slipTransfer(existing != null ? existing.getSlipTransfer() : null)
                        .canPay(blockReason == null)
                        .reason(blockReason)
                        .build());
    }

    /** ผู้ซื้ออัปโหลดสลิปค่าลิขสิทธิ์ */
    @Transactional
    public ApiResponse<CopyrightPaymentResponse> makePayment(
            String username, Integer copyrightId, MakeCopyrightPaymentRequest req) {

        Buyer buyer = buyerRepository.findByUser_Username(username).orElse(null);
        if (buyer == null) return ApiResponse.error("ไม่พบข้อมูลผู้ซื้อ");

        Optional<CopyrightTransfer> transferOpt = copyrightTransferRepository
                .findByCopyrightIdAndBuyer_BuyerId(copyrightId, buyer.getBuyerId());
        if (transferOpt.isEmpty()) return ApiResponse.error("ไม่พบข้อมูลสัญญาการโอนลิขสิทธิ์");

        CopyrightTransfer transfer = transferOpt.get();
        CopyrightPayment existing = copyrightPaymentRepository
                .findByCopyrightTransfer_CopyrightId(copyrightId).orElse(null);

        // กฎเดียวกับที่ preview ใช้ตัดสินว่าปุ่มโผล่ไหม — แต่ต้องเช็คที่นี่ด้วย
        // หน้าเว็บซ่อนปุ่มไม่ใช่การบังคับกฎ ยิงตรงมาที่ API ก็ผ่านได้ถ้าไม่กันตรงนี้
        String blockReason = payBlockReason(transfer, existing);
        if (blockReason != null) return ApiResponse.error(blockReason);

        double amount = currentCopyrightPrice(transfer);
        if (amount <= 0) {
            return ApiResponse.error("งานศิลปะชิ้นนี้ยังไม่ได้ตั้งราคาลิขสิทธิ์ ไม่สามารถชำระเงินได้");
        }

        try {
            // ถ้าเคยถูกปฏิเสธมาก่อน แก้แถวเดิม — ตาราง copyright_payment มี UNIQUE ที่ copyright_id
            // สร้างแถวใหม่จะชนคีย์แล้วผู้ซื้อจะติดค้างจ่ายไม่ได้ตลอดไป
            CopyrightPayment payment = existing != null
                    ? existing
                    : CopyrightPayment.builder().copyrightTransfer(transfer).build();

            // ล็อกยอดใหม่ทุกครั้งที่อัปสลิป — ถ้าราคาขยับระหว่างที่สลิปถูกปฏิเสธ
            // ผู้ซื้อจะโอนตามยอดที่หน้าเว็บเพิ่งแสดง ไม่ใช่ยอดของรอบก่อน
            payment.setAmount(amount);
            payment.setSlipTransfer(req.getSlipTransfer());
            payment.setTransferStatus(PaymentStatus.PENDING_CONFIRMATION);

            copyrightPaymentRepository.save(payment);
            return ApiResponse.ok("อัปโหลดหลักฐานการชำระค่าลิขสิทธิ์สำเร็จ รอการตรวจสอบจากผู้ดูแลระบบ",
                    CopyrightPaymentResponse.detail(payment));

        } catch (Exception e) {
            return ApiResponse.error("ระบบขัดข้อง ไม่สามารถบันทึกหลักฐานได้ กรุณาลองใหม่อีกครั้ง");
        }
    }

    // =========================================================================
    // ฝั่งแอดมิน — ตรวจสลิปที่หน้าเดียวกับการโอนเงินค่าชิ้นงาน
    // =========================================================================

    @Transactional(readOnly = true)
    public ApiResponse<List<CopyrightPaymentResponse>> listPayments() {
        List<CopyrightPayment> payments = copyrightPaymentRepository.findAllForAdmin();
        return ApiResponse.ok(
                payments.isEmpty()
                        ? "ไม่พบรายการชำระค่าลิขสิทธิ์"
                        : "พบรายการชำระค่าลิขสิทธิ์ " + payments.size() + " รายการ",
                payments.stream().map(CopyrightPaymentResponse::summary).toList());
    }

    @Transactional(readOnly = true)
    public ApiResponse<CopyrightPaymentResponse> getPaymentDetail(Integer copyrightPaymentId) {
        return copyrightPaymentRepository.findById(copyrightPaymentId)
                .map(cp -> ApiResponse.ok("ดึงข้อมูลสำเร็จ", CopyrightPaymentResponse.detail(cp)))
                .orElse(ApiResponse.error("ไม่พบรายการชำระค่าลิขสิทธิ์"));
    }

    @Transactional
    public ApiResponse<CopyrightPaymentResponse> confirmPayment(
            Integer copyrightPaymentId, ConfirmPaymentRequest req) {

        Optional<CopyrightPayment> paymentOpt = copyrightPaymentRepository.findById(copyrightPaymentId);
        if (paymentOpt.isEmpty()) return ApiResponse.error("ไม่พบรายการชำระค่าลิขสิทธิ์");

        CopyrightPayment payment = paymentOpt.get();
        if (payment.getTransferStatus() != PaymentStatus.PENDING_CONFIRMATION) {
            return ApiResponse.error("รายการนี้ถูกดำเนินการแล้ว");
        }

        try {
            payment.setTransferStatus(
                    req.getApproved() ? PaymentStatus.COMPLETED : PaymentStatus.REJECTED);
            copyrightPaymentRepository.save(payment);

            // ไม่แตะ transferStatus ของสัญญาที่นี่
            // การจ่ายเงินสำเร็จแค่ "ปลดล็อก" ให้ผู้ซื้อลงนามได้ ตัวสัญญาจะเป็น COMPLETED
            // ก็ต่อเมื่อผู้ซื้ออัปไฟล์ที่ลงนามแล้วจริงๆ (ดู CopyrightTransferService.signAgreement)
            return ApiResponse.ok(
                    req.getApproved() ? "อนุมัติการชำระค่าลิขสิทธิ์สำเร็จ" : "ปฏิเสธการชำระค่าลิขสิทธิ์สำเร็จ",
                    CopyrightPaymentResponse.detail(payment));

        } catch (Exception e) {
            return ApiResponse.error("ไม่สามารถแก้ไขข้อมูลได้ กรุณาลองใหม่อีกครั้ง");
        }
    }

    // =========================================================================
    // กฎกลาง — ใช้ร่วมกันระหว่าง preview, makePayment และด่านลงนาม
    // =========================================================================

    /** @return เหตุผลที่ยังจ่ายไม่ได้ หรือ null ถ้าจ่ายได้ */
    private static String payBlockReason(CopyrightTransfer transfer, CopyrightPayment existing) {
        if (transfer.getTransferStatus() == CopyrightTransferStatus.REJECTED) {
            return "ผู้ขายปฏิเสธคำขอโอนลิขสิทธิ์ฉบับนี้แล้ว";
        }
        if (transfer.getTransferStatus() == CopyrightTransferStatus.PENDING) {
            return "กรุณารอผู้ขายตอบรับคำขอโอนลิขสิทธิ์ก่อนชำระเงิน";
        }
        // สลิปที่ถูกปฏิเสธไปแล้วต้องอัปใหม่ได้ ไม่งั้นสัญญาจะค้างตายอยู่แบบนั้นตลอดไป
        if (existing != null && existing.getTransferStatus() != PaymentStatus.REJECTED) {
            return existing.getTransferStatus() == PaymentStatus.COMPLETED
                    ? "สัญญาฉบับนี้ชำระเงินเรียบร้อยแล้ว"
                    : "อัปโหลดสลิปแล้ว รอผู้ดูแลระบบตรวจสอบ";
        }
        return null;
    }

    private static double currentCopyrightPrice(CopyrightTransfer transfer) {
        Double price = transfer.getArtwork().getCopyrightPrice();
        return price != null ? price : 0.0;
    }
}
