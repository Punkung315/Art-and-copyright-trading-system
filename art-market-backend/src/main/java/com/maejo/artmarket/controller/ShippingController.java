package com.maejo.artmarket.controller;

import com.maejo.artmarket.dto.ApiResponse;
import com.maejo.artmarket.dto.ShippingQuoteResponse;
import com.maejo.artmarket.enums.ShippingCompany;
import com.maejo.artmarket.shipping.ShippingRateService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/**
 * ShippingController — ประเมินค่าจัดส่งของขนส่งทุกเจ้าจากน้ำหนักและขนาด
 *
 * GET /api/shipping/quote?weight=2.5&width=60&length=5&height=80
 *
 * ใช้ในหน้าเพิ่ม/แก้ไขงานศิลปะ ให้ผู้ขายเห็นราคาเทียบกันก่อนเลือกขนส่ง
 * เป็นราคาประเมิน (เส้นทางข้ามจังหวัด) ค่าจริงคำนวณอีกครั้งตอนยืนยันคำสั่งซื้อ
 * เมื่อรู้ที่อยู่ปลายทางของผู้ซื้อแล้ว
 */
@RestController
@RequestMapping("/api/shipping")
@RequiredArgsConstructor
public class ShippingController {

    private final ShippingRateService shippingRateService;

    @GetMapping("/quote")
    public ResponseEntity<ApiResponse<ShippingQuoteResponse>> quote(
            @RequestParam(required = false) Double weight,
            @RequestParam(required = false) Double width,
            @RequestParam(required = false) Double length,
            @RequestParam(required = false) Double height) {

        List<ShippingQuoteResponse.Option> options = ShippingQuoteResponse.allCompanies().stream()
                .map(company -> shippingRateService.estimate(company, weight, width, length, height))
                .map(ShippingQuoteResponse.Option::from)
                .toList();

        return ResponseEntity.ok(ApiResponse.ok(
                "ประเมินค่าจัดส่งสำเร็จ",
                ShippingQuoteResponse.builder().options(options).build()
        ));
    }

    /** รายชื่อขนส่งที่ระบบรองรับ ไว้ทำ dropdown ให้ผู้ขายเลือก */
    @GetMapping("/companies")
    public ResponseEntity<ApiResponse<List<CompanyOption>>> companies() {
        List<CompanyOption> list = ShippingQuoteResponse.allCompanies().stream()
                .map(c -> new CompanyOption(c.name(), c.getDisplayName(),
                        c.getMaxWeightKg(), c.getMaxDimensionSumCm()))
                .toList();
        return ResponseEntity.ok(ApiResponse.ok("ดึงรายชื่อขนส่งสำเร็จ", list));
    }

    public record CompanyOption(String code, String name,
                                Double maxWeightKg, Double maxDimensionSumCm) {}
}
