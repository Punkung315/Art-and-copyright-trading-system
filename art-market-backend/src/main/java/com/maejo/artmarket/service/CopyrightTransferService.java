package com.maejo.artmarket.service;

import com.maejo.artmarket.dto.*;
import com.maejo.artmarket.entity.*;
import com.maejo.artmarket.enums.CopyrightTransferStatus;
import com.maejo.artmarket.enums.PaymentStatus;
import com.maejo.artmarket.enums.PublishStatus;
import com.maejo.artmarket.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.stream.Collectors;

/**
 * CopyrightTransferService — Business Logic ของยูสเคส:
 *   3.1.12 Send Copyright Transfer (Buyer)
 *   3.1.22 Receive Copyright Transfer (Seller)
 */
@Service
@RequiredArgsConstructor
public class CopyrightTransferService {

    private final CopyrightTransferRepository copyrightTransferRepository;
    private final CopyrightPaymentRepository  copyrightPaymentRepository;
    private final BuyerRepository   buyerRepository;
    private final SellerRepository  sellerRepository;
    private final OrdersRepository  ordersRepository;
    private final ArtworkRepository artworkRepository;

    /**
     * แปะสถานะการชำระค่าลิขสิทธิ์ลงในรายการสัญญาด้วยคิวรีเดียว
     *
     * ไม่ไล่เรียก findByCopyrightTransfer_CopyrightId ทีละฉบับใน stream
     * เพราะจะกลายเป็น N+1 ตามจำนวนสัญญาในหน้า
     */
    private List<CopyrightTransferResponse> withPayments(List<CopyrightTransfer> transfers) {
        if (transfers.isEmpty()) return List.of();

        Map<Integer, CopyrightPayment> byTransfer = copyrightPaymentRepository
                .findByCopyrightTransfer_CopyrightIdIn(
                        transfers.stream().map(CopyrightTransfer::getCopyrightId).toList())
                .stream()
                .collect(Collectors.toMap(p -> p.getCopyrightTransfer().getCopyrightId(), p -> p));

        return transfers.stream()
                .map(t -> CopyrightTransferResponse.from(t, byTransfer.get(t.getCopyrightId())))
                .toList();
    }

    /** สถานะการจ่ายเงินของสัญญาฉบับเดียว — null ถ้ายังไม่เคยอัปสลิป */
    private CopyrightPayment paymentOf(CopyrightTransfer transfer) {
        return copyrightPaymentRepository
                .findByCopyrightTransfer_CopyrightId(transfer.getCopyrightId())
                .orElse(null);
    }

    /** สถานะที่ถือว่าสัญญา "ยังมีผลอยู่" — REJECTED ไม่นับ ยื่นใหม่ได้ */
    private static final List<CopyrightTransferStatus> ACTIVE_STATUSES = List.of(
            CopyrightTransferStatus.PENDING,
            CopyrightTransferStatus.SIGNED,
            CopyrightTransferStatus.COMPLETED);

    /**
     * เวอร์ชันข้อความสัญญาที่ระบบใช้อยู่ตอนนี้
     *
     * ถ้าแก้เนื้อหาสัญญาในหน้าพิมพ์เมื่อไหร่ ต้องขยับเลขนี้ด้วย
     * แล้วหน้าพิมพ์ต้องเลือกแสดงข้อความตามเวอร์ชันที่บันทึกไว้ในแต่ละสัญญา
     * ไม่ใช่แสดงเวอร์ชันล่าสุดเสมอ
     */
    public static final String CURRENT_TERMS_VERSION = "v1-2026";

    /** ข้อความข้อตกลงมาตรฐาน ใช้เมื่อ client ไม่ได้ส่ง agreement มา */
    private static final String DEFAULT_AGREEMENT =
            "ข้าพเจ้าตกลงซื้อสิทธิ์ในลิขสิทธิ์ของผลงานชิ้นนี้ตามราคาที่กำหนด "
          + "และยินยอมปฏิบัติตามข้อตกลงการโอนลิขสิทธิ์ทุกประการ";

    // =========================================================================
    // ยูสเคส 3.1.12 Send Copyright Transfer
    // Alternate Flow 3.1: "กรุณากรอกข้อมูลให้ถูกต้อง" (ตรวจใน DTO ด้วย @NotBlank/@Pattern)
    // Alternate Flow 5.1.1: "ไม่สามารถบันทึกรายละเอียดสัญญาได้ กรุณาลองใหม่อีกครั้ง"
    // =========================================================================

    @Transactional
    public ApiResponse<CopyrightTransferResponse> sendCopyrightTransfer(
            String username, SendCopyrightTransferRequest req) {

        Buyer buyer = buyerRepository.findByUser_Username(username).orElse(null);
        if (buyer == null) {
            return ApiResponse.error("ไม่พบข้อมูลผู้ซื้อ");
        }

        // ระบุงานศิลปะที่ต้องการขอลิขสิทธิ์
        // รับ artworkId เป็นหลัก (frontend เข้าจากหน้ารายละเอียดงาน /copyright/new/[artworkId])
        // ส่วน orderId ยังรับได้เพื่อความเข้ากันได้กับของเดิม โดยจะแปลงเป็นงานชิ้นแรกใน order นั้น
        Artwork artwork = null;
        if (req.getArtworkId() != null) {
            artwork = artworkRepository.findById(req.getArtworkId()).orElse(null);
        } else if (req.getOrderId() != null) {
            Orders o = ordersRepository.findById(req.getOrderId()).orElse(null);
            if (o != null && !o.getOrderItems().isEmpty()) {
                artwork = o.getOrderItems().get(0).getArtwork();
            }
        } else {
            return ApiResponse.error("กรุณาระบุงานศิลปะที่ต้องการขอโอนลิขสิทธิ์");
        }

        if (artwork == null) {
            return ApiResponse.error("ไม่พบงานศิลปะที่ต้องการ");
        }

        if (artwork.getPublishStatus() != PublishStatus.PUBLISHED) {
            return ApiResponse.error("งานศิลปะชิ้นนี้ยังไม่ได้เผยแพร่");
        }

        // ผู้ขายต้องตั้งราคาลิขสิทธิ์ไว้ ถึงจะถือว่าเปิดขายลิขสิทธิ์ของงานชิ้นนี้
        if (artwork.getCopyrightPrice() == null || artwork.getCopyrightPrice() <= 0) {
            return ApiResponse.error("งานศิลปะชิ้นนี้ไม่ได้เปิดขายลิขสิทธิ์");
        }

        Seller seller = artwork.getSeller();

        // กันไม่ให้ผู้ขายขอซื้อลิขสิทธิ์งานของตัวเอง
        if (seller.getUser().getUserId().equals(buyer.getUser().getUserId())) {
            return ApiResponse.error("ไม่สามารถขอโอนลิขสิทธิ์งานของตัวเองได้");
        }

        // กันส่งคำขอซ้ำสำหรับงานชิ้นเดียวกันที่ยังดำเนินการอยู่
        // (ถ้าเคยถูกปฏิเสธไปแล้ว ให้ยื่นใหม่ได้)
        boolean duplicate = copyrightTransferRepository
                .existsByBuyer_BuyerIdAndArtwork_ArtworkIdAndTransferStatusIn(
                        buyer.getBuyerId(),
                        artwork.getArtworkId(),
                        ACTIVE_STATUSES);
        if (duplicate) {
            return ApiResponse.error("คุณส่งคำขอโอนลิขสิทธิ์ของงานชิ้นนี้ไปแล้ว");
        }

        // งานหนึ่งชิ้นขายลิขสิทธิ์ได้ครั้งเดียว — เช็คแยกจากด้านบนเพราะคนละกฎกัน
        //
        // ด้านบนกัน "คนเดิมขอซ้ำ" ส่วนตรงนี้กัน "คนใหม่ขอทับของคนอื่น"
        // สัญญาของระบบเป็นการโอนแต่เพียงผู้เดียวตลอดอายุการคุ้มครอง
        // ถ้าปล่อยให้สองคนขอพร้อมกันแล้วผู้ขายกดตอบรับทั้งคู่
        // จะกลายเป็นขายสิทธิ์ผูกขาดชิ้นเดียวกันสองรอบ ซึ่งผิดทั้งสัญญาและกฎหมาย
        //
        // แยกข้อความสองแบบ เพราะ "ขายไปแล้วถาวร" กับ "มีคนจองอยู่ อาจว่างทีหลัง"
        // เป็นคนละสถานการณ์สำหรับผู้ใช้
        if (copyrightTransferRepository.findFirstByArtwork_ArtworkIdAndTransferStatus(
                artwork.getArtworkId(), CopyrightTransferStatus.COMPLETED).isPresent()) {
            return ApiResponse.error("ลิขสิทธิ์ของผลงานชิ้นนี้ถูกโอนให้ผู้อื่นไปแล้ว ไม่สามารถขอซื้อได้อีก");
        }
        if (copyrightTransferRepository.existsByArtwork_ArtworkIdAndTransferStatusIn(
                artwork.getArtworkId(),
                List.of(CopyrightTransferStatus.PENDING, CopyrightTransferStatus.SIGNED))) {
            return ApiResponse.error("มีผู้ซื้อรายอื่นกำลังขอโอนลิขสิทธิ์ของผลงานชิ้นนี้อยู่ กรุณารอผลก่อน");
        }

        // ถ้าผู้ซื้อเคยสั่งซื้อชิ้นงานนี้ ให้ผูกคำสั่งซื้อไว้เพื่อการอ้างอิง
        // แต่ไม่บังคับ — ขอซื้อเฉพาะลิขสิทธิ์โดยไม่ซื้อชิ้นงานก็ได้
        Orders order = ordersRepository
                .findByBuyerAndArtwork(buyer.getBuyerId(), artwork.getArtworkId())
                .stream().findFirst().orElse(null);

        try {
            CopyrightTransfer transfer = CopyrightTransfer.builder()
                    .artwork(artwork)
                    .order(order)   // null ได้ ถ้าไม่เคยซื้อชิ้นงานนี้
                    .buyer(buyer)
                    .seller(seller)
                    .fullName(req.getFullName())
                    .houseNo(req.getHouseNo())
                    .villageNo(req.getVillageNo())
                    .thoroughfare(req.getThoroughfare())
                    .subdistrict(req.getSubdistrict())
                    .district(req.getDistrict())
                    .province(req.getProvince())
                    .postalCode(req.getPostalCode())
                    .nationalNo(req.getNationalNo())
                    // เก็บข้อความข้อตกลงที่ผู้ซื้อยอมรับไว้เป็น snapshot ของสัญญาฉบับนี้
                    // ถ้า client เก่าไม่ส่งมา ใช้ข้อความมาตรฐานแทนเพื่อไม่ให้สัญญาว่างเปล่า
                    .buyerAgreementDetail(
                            req.getBuyerAgreementDetail() != null
                                    && !req.getBuyerAgreementDetail().isBlank()
                                    ? req.getBuyerAgreementDetail().trim()
                                    : DEFAULT_AGREEMENT)
                    // ล็อกราคา ณ วินาทีที่ยื่นคำขอ — ตั้งแต่จุดนี้ผู้ขายแก้ราคาลิขสิทธิ์
                    // ของงานได้ตามใจ แต่ไม่กระทบสัญญาฉบับที่ยื่นไปแล้ว
                    .agreedPrice(artwork.getCopyrightPrice())
                    .termsVersion(CURRENT_TERMS_VERSION)
                    .transferStatus(CopyrightTransferStatus.PENDING)
                    .build();

            copyrightTransferRepository.save(transfer);
            return ApiResponse.ok("ส่งสัญญาโอนลิขสิทธิ์สำเร็จ รอผู้ขายตรวจสอบ",
                    CopyrightTransferResponse.from(transfer));

        } catch (Exception e) {
            return ApiResponse.error("ไม่สามารถบันทึกรายละเอียดสัญญาได้ กรุณาลองใหม่อีกครั้ง");
        }
    }

    /** ดูรายการสัญญาที่ตัวเองส่งไป (ฝั่งผู้ซื้อ) */
    @Transactional(readOnly = true)
    public ApiResponse<List<CopyrightTransferResponse>> listMySentTransfers(String username) {
        Buyer buyer = buyerRepository.findByUser_Username(username).orElse(null);
        if (buyer == null) return ApiResponse.error("ไม่พบข้อมูลผู้ซื้อ");

        List<CopyrightTransfer> transfers = copyrightTransferRepository.findByBuyer_BuyerId(buyer.getBuyerId());
        // list ว่าง = ยังไม่มีสัญญา ไม่ใช่ error
        return ApiResponse.ok(
                transfers.isEmpty() ? "ไม่พบข้อมูลสัญญาการโอนลิขสิทธิ์" : "พบสัญญา " + transfers.size() + " ฉบับ",
                withPayments(transfers));
    }

    // =========================================================================
    // ยูสเคส 3.1.22 Receive Copyright Transfer
    // Post Condition: ต้องมี Send Copyright Transfer จากผู้ซื้อมาก่อน
    // =========================================================================

    /** ดูรายการสัญญาที่ถูกส่งมาให้ตัวเอง (ฝั่งผู้ขาย) — ใช้ก่อนเลือกอันที่จะตอบ */
    @Transactional(readOnly = true)
    public ApiResponse<List<CopyrightTransferResponse>> listReceivedTransfers(String username) {
        Seller seller = sellerRepository.findByUser_Username(username).orElse(null);
        if (seller == null) return ApiResponse.error("ไม่พบข้อมูลผู้ขาย");

        List<CopyrightTransfer> transfers = copyrightTransferRepository.findBySeller_SellerId(seller.getSellerId());

        // Alternate Flow 4.1.1
        // list ว่าง = ยังไม่มีสัญญา ไม่ใช่ error
        return ApiResponse.ok(
                transfers.isEmpty() ? "ไม่พบข้อมูลสัญญาการโอนลิขสิทธิ์" : "พบสัญญา " + transfers.size() + " ฉบับ",
                withPayments(transfers));
    }

    /**
     * Basic Flow ข้อ 6-9 — ผู้ขายกรอกรายละเอียดการต่อรอง (detail) แล้วตอบรับ/ปฏิเสธ
     * approved=true  → transferStatus = SIGNED
     * approved=false → transferStatus = REJECTED
     */
    // =========================================================================
    // ยูสเคส 3.1.16 Sign Agreement — ผู้ซื้ออัปโหลดสัญญาที่ลงนามแล้ว
    //
    // ลำดับสถานะทั้งหมดของสัญญา:
    //   PENDING   ผู้ซื้อส่งคำขอ → รอผู้ขายตอบ
    //   SIGNED    ผู้ขายตอบรับแล้ว → รอผู้ซื้อดาวน์โหลดไปเซ็นแล้วอัปกลับ
    //   COMPLETED ผู้ซื้ออัปไฟล์ที่เซ็นแล้ว → สัญญาสมบูรณ์
    //   REJECTED  ผู้ขายปฏิเสธ
    //
    // เดิมไม่มีเมธอดนี้เลย สัญญาจึงค้างที่ SIGNED ตลอดไปและ documentFile เป็น null เสมอ
    // =========================================================================

    @Transactional
    public ApiResponse<CopyrightTransferResponse> signAgreement(
            String username, Integer copyrightId, SignCopyrightTransferRequest req) {

        Buyer buyer = buyerRepository.findByUser_Username(username).orElse(null);
        if (buyer == null) {
            return ApiResponse.error("ไม่พบข้อมูลผู้ซื้อ");
        }

        Optional<CopyrightTransfer> transferOpt = copyrightTransferRepository
                .findByCopyrightIdAndBuyer_BuyerId(copyrightId, buyer.getBuyerId());
        if (transferOpt.isEmpty()) {
            return ApiResponse.error("ไม่สามารถค้นหาไฟล์เอกสารสัญญาการโอนได้");
        }

        CopyrightTransfer transfer = transferOpt.get();

        if (transfer.getTransferStatus() != CopyrightTransferStatus.SIGNED) {
            return ApiResponse.error("ต้องรอผู้ขายตอบรับสัญญาก่อนจึงจะลงนามได้");
        }

        // ต้องชำระค่าลิขสิทธิ์และผู้ดูแลระบบยืนยันสลิปแล้วเท่านั้น
        //
        // ลิขสิทธิ์ที่โอนไปแล้วเรียกคืนยากกว่าชิ้นงานที่ยังตามของกลับมาได้
        // ถ้าปล่อยให้ลงนามก่อนจ่าย เอกสารสัญญาที่สมบูรณ์จะอยู่ในมือผู้ซื้อ
        // ทั้งที่ผู้ขายยังไม่ได้เงินสักบาท
        //
        // หน้าเว็บล็อกปุ่มไว้แล้ว แต่ต้องกันที่นี่ด้วย — ยิงตรงมาที่ API ก็ผ่านได้ถ้าไม่กัน
        CopyrightPayment payment = paymentOf(transfer);
        if (payment == null) {
            return ApiResponse.error("กรุณาชำระค่าลิขสิทธิ์ก่อนลงนามสัญญา");
        }
        if (payment.getPaymentStatus() != PaymentStatus.COMPLETED) {
            return ApiResponse.error(
                    payment.getPaymentStatus() == PaymentStatus.REJECTED
                            ? "หลักฐานการชำระเงินถูกปฏิเสธ กรุณาอัปโหลดสลิปใหม่อีกครั้ง"
                            : "รอผู้ดูแลระบบตรวจสอบหลักฐานการชำระเงินก่อนจึงจะลงนามได้");
        }

        try {
            transfer.setBuyerSignature(req.getSignature());
            // ไฟล์เอกสารที่สแกนกลับมาเป็นทางเลือก — ไม่ส่งมาก็ไม่ทับของเดิมให้เป็น null
            if (req.getDocumentFile() != null && !req.getDocumentFile().isBlank()) {
                transfer.setDocumentFile(req.getDocumentFile());
            }
            transfer.setBuyerSignedDate(LocalDateTime.now());
            transfer.setTransferStatus(CopyrightTransferStatus.COMPLETED);
            copyrightTransferRepository.save(transfer);
            return ApiResponse.ok("ลงนามสัญญาโอนลิขสิทธิ์สำเร็จ",
                    CopyrightTransferResponse.from(transfer, payment));
        } catch (Exception e) {
            return ApiResponse.error("ไม่สามารถบันทึกไฟล์สัญญาได้ กรุณาลองใหม่อีกครั้ง");
        }
    }

    @Transactional
    public ApiResponse<CopyrightTransferResponse> receiveCopyrightTransfer(
            String username, Integer copyrightId, ReceiveCopyrightTransferRequest req) {

        Seller seller = sellerRepository.findByUser_Username(username).orElse(null);
        if (seller == null) {
            return ApiResponse.error("ไม่พบข้อมูลผู้ขาย");
        }

        Optional<CopyrightTransfer> transferOpt = copyrightTransferRepository
                .findByCopyrightIdAndSeller_SellerId(copyrightId, seller.getSellerId());

        // Alternate Flow 4.1.1
        if (transferOpt.isEmpty()) {
            return ApiResponse.error("ไม่พบข้อมูลสัญญาการโอนลิขสิทธิ์");
        }

        CopyrightTransfer transfer = transferOpt.get();

        if (transfer.getTransferStatus() != CopyrightTransferStatus.PENDING) {
            return ApiResponse.error("สัญญาฉบับนี้ถูกดำเนินการแล้ว");
        }

        // ตอบรับ = ลงนามในฐานะผู้โอน จึงต้องมีลายมือชื่อ (มาตรา 17)
        // ปฏิเสธไม่ต้องเซ็น เพราะไม่มีการโอนเกิดขึ้น
        if (req.getApproved() && (req.getSignature() == null || req.getSignature().isBlank())) {
            return ApiResponse.error("กรุณาแนบลายมือชื่อของผู้โอนเพื่อยืนยันการตอบรับ");
        }

        // งานชิ้นนี้ต้องยังไม่ถูกขายลิขสิทธิ์ให้ใคร — เช็คซ้ำที่นี่ด้วย
        //
        // ตอนยื่นคำขอเช็คไปแล้วรอบหนึ่ง แต่ระหว่างที่คำขอนี้รอผู้ขายตอบ
        // สัญญาฉบับอื่นของงานเดียวกันอาจปิดจบไปก่อนได้ (เช่นผู้ขายเผลอตอบรับสองฉบับ)
        // ถ้าไม่เช็คตรงนี้อีกครั้ง จะเกิดสัญญา COMPLETED สองฉบับของงานชิ้นเดียว
        if (req.getApproved()
                && copyrightTransferRepository.findFirstByArtwork_ArtworkIdAndTransferStatus(
                        transfer.getArtwork().getArtworkId(), CopyrightTransferStatus.COMPLETED)
                   .filter(other -> !other.getCopyrightId().equals(transfer.getCopyrightId()))
                   .isPresent()) {
            return ApiResponse.error("ลิขสิทธิ์ของผลงานชิ้นนี้ถูกโอนให้ผู้อื่นไปแล้ว ไม่สามารถตอบรับคำขอนี้ได้");
        }

        try {
            transfer.setSellerResponseDetail(req.getDetail());
            if (req.getApproved()) {
                transfer.setSellerSignature(req.getSignature());
                transfer.setSellerSignedDate(LocalDateTime.now());
            }
            transfer.setTransferStatus(
                    req.getApproved() ? CopyrightTransferStatus.SIGNED : CopyrightTransferStatus.REJECTED);

            copyrightTransferRepository.save(transfer);
            return ApiResponse.ok(
                    req.getApproved() ? "ตอบรับสัญญาโอนลิขสิทธิ์สำเร็จ" : "ปฏิเสธสัญญาโอนลิขสิทธิ์สำเร็จ",
                    CopyrightTransferResponse.from(transfer, paymentOf(transfer)));

        } catch (Exception e) {
            // Alternate Flow 9.1.1
            return ApiResponse.error("ไม่สามารถบันทึกข้อมูลการต่อรองได้ กรุณาลองใหม่อีกครั้ง");
        }
    }
}
