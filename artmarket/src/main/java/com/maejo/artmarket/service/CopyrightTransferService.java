package com.maejo.artmarket.service;

import com.maejo.artmarket.dto.*;
import com.maejo.artmarket.entity.*;
import com.maejo.artmarket.enums.CopyrightTransferStatus;
import com.maejo.artmarket.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Optional;

/**
 * CopyrightTransferService — Business Logic ของยูสเคส:
 *   3.1.12 Send Copyright Transfer (Buyer)
 *   3.1.22 Receive Copyright Transfer (Seller)
 */
@Service
@RequiredArgsConstructor
public class CopyrightTransferService {

    private final CopyrightTransferRepository copyrightTransferRepository;
    private final BuyerRepository   buyerRepository;
    private final SellerRepository  sellerRepository;
    private final OrdersRepository  ordersRepository;

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

        Optional<Orders> orderOpt = ordersRepository.findById(req.getOrderId());
        if (orderOpt.isEmpty()) {
            return ApiResponse.error("ไม่พบรายการคำสั่งซื้อ");
        }

        Orders order = orderOpt.get();

        if (!order.getBuyer().getBuyerId().equals(buyer.getBuyerId())) {
            return ApiResponse.error("ไม่มีสิทธิ์เข้าถึงคำสั่งซื้อนี้");
        }

        if (copyrightTransferRepository.existsByOrder_OrderId(req.getOrderId())) {
            return ApiResponse.error("คำสั่งซื้อนี้มีการส่งสัญญาโอนลิขสิทธิ์ไปแล้ว");
        }

        if (order.getOrderItems().isEmpty()) {
            return ApiResponse.error("คำสั่งซื้อไม่มีรายการสินค้า");
        }
        // หา seller จากชิ้นงานแรกใน order (ดูหมายเหตุใน QuotationResponse เรื่องข้อจำกัดของโมเดล)
        Seller seller = order.getOrderItems().get(0).getArtwork().getSeller();

        try {
            CopyrightTransfer transfer = CopyrightTransfer.builder()
                    .order(order)
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
        if (transfers.isEmpty()) return ApiResponse.error("ไม่พบข้อมูลสัญญาการโอนลิขสิทธิ์");

        return ApiResponse.ok("พบสัญญา " + transfers.size() + " ฉบับ",
                transfers.stream().map(CopyrightTransferResponse::from).toList());
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
        if (transfers.isEmpty()) return ApiResponse.error("ไม่พบข้อมูลสัญญาการโอนลิขสิทธิ์");

        return ApiResponse.ok("พบสัญญา " + transfers.size() + " ฉบับ",
                transfers.stream().map(CopyrightTransferResponse::from).toList());
    }

    /**
     * Basic Flow ข้อ 6-9 — ผู้ขายกรอกรายละเอียดการต่อรอง (detail) แล้วตอบรับ/ปฏิเสธ
     * approved=true  → transferStatus = SIGNED
     * approved=false → transferStatus = REJECTED
     */
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

        try {
            transfer.setSellerResponseDetail(req.getDetail());
            transfer.setTransferStatus(
                    req.getApproved() ? CopyrightTransferStatus.SIGNED : CopyrightTransferStatus.REJECTED);

            copyrightTransferRepository.save(transfer);
            return ApiResponse.ok(
                    req.getApproved() ? "ตอบรับสัญญาโอนลิขสิทธิ์สำเร็จ" : "ปฏิเสธสัญญาโอนลิขสิทธิ์สำเร็จ",
                    CopyrightTransferResponse.from(transfer));

        } catch (Exception e) {
            // Alternate Flow 9.1.1
            return ApiResponse.error("ไม่สามารถบันทึกข้อมูลการต่อรองได้ กรุณาลองใหม่อีกครั้ง");
        }
    }
}
