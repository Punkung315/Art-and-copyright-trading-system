package com.maejo.artmarket.dto;

import com.maejo.artmarket.entity.OrderItem;
import com.maejo.artmarket.entity.Orders;
import com.maejo.artmarket.entity.Seller;
import com.maejo.artmarket.entity.SellerPayout;
import com.maejo.artmarket.enums.AvailabilityStatus;
import com.maejo.artmarket.enums.PaymentStatus;
import com.maejo.artmarket.enums.ShippingStatus;
import lombok.Builder;
import lombok.Data;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * ยอดที่ต้องโอนให้ผู้ขาย 1 คนใน 1 คำสั่งซื้อ พร้อมสถานะการโอน
 *
 * เป็นที่เดียวที่กำหนดกฎ "โอนให้ผู้ขายได้เมื่อไร และเท่าไร"
 * ทั้งหน้าแอดมิน (แสดงผล) และ AdminService.createPayout (บันทึกจริง) ใช้ตัวนี้ร่วมกัน
 * จะได้ไม่เกิดกรณีหน้าเว็บบอกว่าโอนได้ แต่ backend ปฏิเสธ หรือยอดสองที่ไม่ตรงกัน
 *
 * กฎ:
 *   - นับเฉพาะชิ้นที่ผู้ขายยืนยันว่าพร้อมขาย (AVAILABLE) — ชิ้นที่ไม่พร้อมขาย ผู้ซื้อไม่ได้จ่าย
 *   - ยอด = ราคาผลงาน + ค่าจัดส่ง เต็มจำนวน (ยังไม่มีค่าธรรมเนียมแพลตฟอร์ม)
 *   - โอนได้เมื่อผู้ดูแลระบบยืนยันการชำระเงินของผู้ซื้อแล้ว และทุกชิ้นของผู้ขายคนนี้จัดส่งสำเร็จ
 */
@Data
@Builder
public class SellerPayoutInfo {
    private Integer sellerId;
    private Integer sellerUserId;
    private String  sellerName;
    private String  sellerEmail;
    private String  sellerPhone;

    /** ยอดที่ต้องโอน — ถ้าโอนแล้วเป็นยอดที่ล็อกไว้ตอนโอน */
    private Double  amount;
    private Integer itemCount;
    private Integer deliveredCount;

    /** ครบเงื่อนไขและยังไม่เคยโอน — หน้าแอดมินใช้เปิดปุ่มแนบสลิป */
    private boolean readyForPayout;
    private boolean paid;

    private Integer       payoutId;
    private LocalDateTime paidAt;
    private String        slipTransfer;

    /**
     * บัญชีปลายทาง
     *   ยังไม่โอน → บัญชีปัจจุบันของผู้ขาย (ให้แอดมินใช้โอน)
     *   โอนแล้ว   → สำเนาบัญชี ณ ตอนโอน (ผู้ขายแก้บัญชีทีหลังก็ไม่เปลี่ยน)
     */
    private boolean hasBankAccount;
    private String  bankName;
    private String  bankAccountNumber;
    private String  bankAccountName;
    /** รูปหน้าสมุดบัญชีปัจจุบัน — ให้แอดมินตรวจก่อนโอน (ไม่มีหลังโอนแล้ว) */
    private String  bankBookImage;

    /** ค่าจัดส่งที่ล็อกไว้ของชิ้นหนึ่ง — สูตรอยู่ที่ OrderCharge ที่เดียว */
    static double shippingOf(OrderItem item) {
        return OrderCharge.lockedShippingOf(item);
    }

    /** รายการผู้ขายทุกคนในคำสั่งซื้อที่มีชิ้นพร้อมขาย เรียงตามลำดับชิ้นในคำสั่งซื้อ */
    public static List<SellerPayoutInfo> listFor(Orders order) {
        Map<Integer, List<OrderItem>> bySeller = new LinkedHashMap<>();
        Map<Integer, Seller> sellers = new LinkedHashMap<>();
        for (OrderItem i : order.getOrderItems()) {
            if (i.getAvailabilityStatus() != AvailabilityStatus.AVAILABLE) continue;
            Seller s = i.getArtwork().getSeller();
            bySeller.computeIfAbsent(s.getSellerId(), k -> new ArrayList<>()).add(i);
            sellers.putIfAbsent(s.getSellerId(), s);
        }

        boolean paymentConfirmed = order.getPayment() != null
                && order.getPayment().getPaymentStatus() == PaymentStatus.COMPLETED;

        List<SellerPayoutInfo> out = new ArrayList<>();
        for (var e : bySeller.entrySet()) {
            Seller s = sellers.get(e.getKey());
            List<OrderItem> items = e.getValue();
            int delivered = (int) items.stream()
                    .filter(i -> i.getShippingStatus() == ShippingStatus.DELIVERED).count();
            double amount = items.stream().mapToDouble(i -> i.getPrice() + shippingOf(i)).sum();

            SellerPayout payout = order.getSellerPayouts().stream()
                    .filter(p -> p.getSeller().getSellerId().equals(s.getSellerId()))
                    .findFirst().orElse(null);

            boolean useSnapshot = payout != null && payout.getBankAccountNumber() != null;

            out.add(SellerPayoutInfo.builder()
                    .hasBankAccount(useSnapshot || s.hasBankAccount())
                    .bankName(useSnapshot ? payout.getBankName()
                            : s.hasBankAccount() ? s.getBankCode().getDisplayName() : null)
                    .bankAccountNumber(useSnapshot ? payout.getBankAccountNumber() : s.getBankAccountNumber())
                    .bankAccountName(useSnapshot ? payout.getBankAccountName() : s.getBankAccountName())
                    .bankBookImage(payout == null ? s.getBankBookImage() : null)
                    .sellerId(s.getSellerId())
                    .sellerUserId(s.getUser().getUserId())
                    .sellerName(s.getUser().getFullName())
                    .sellerEmail(s.getUser().getEmail())
                    .sellerPhone(s.getUser().getPhoneNumber())
                    .amount(payout != null ? payout.getAmount() : amount)
                    .itemCount(items.size())
                    .deliveredCount(delivered)
                    .paid(payout != null)
                    .readyForPayout(payout == null && paymentConfirmed && delivered == items.size())
                    .payoutId(payout != null ? payout.getPayoutId() : null)
                    .paidAt(payout != null ? payout.getPaidAt() : null)
                    .slipTransfer(payout != null ? payout.getSlipTransfer() : null)
                    .build());
        }
        return out;
    }

    /** ของผู้ขายคนเดียว — null ถ้าผู้ขายคนนี้ไม่มีชิ้นที่พร้อมขายในคำสั่งซื้อ */
    public static SellerPayoutInfo forSeller(Orders order, Integer sellerId) {
        return listFor(order).stream()
                .filter(p -> p.getSellerId().equals(sellerId))
                .findFirst().orElse(null);
    }
}
