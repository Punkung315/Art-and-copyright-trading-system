package com.maejo.artmarket.dto;

import com.maejo.artmarket.enums.ShippingCompany;
import com.maejo.artmarket.shipping.ShippingQuote;
import lombok.Builder;
import lombok.Data;

import java.util.Arrays;
import java.util.List;

/**
 * ราคาประเมินของขนส่งทุกเจ้า สำหรับชิ้นงานขนาด/น้ำหนักหนึ่งๆ
 *
 * หน้าเพิ่ม/แก้ไขงานศิลปะเรียก endpoint นี้เพื่อให้ผู้ขายเห็นราคาเทียบกันทุกเจ้า
 * ก่อนตัดสินใจเลือก — ดีกว่าให้เลือกไปก่อนแล้วค่อยรู้ราคาทีหลัง
 */
@Data
@Builder
public class ShippingQuoteResponse {

    private List<Option> options;

    @Data
    @Builder
    public static class Option {
        private ShippingCompany company;
        private String companyName;
        private Double cost;
        private String rateVersion;
        private Double billableWeightKg;
        private Double dimensionSumCm;

        /** ไม่ null เมื่อชิ้นงานเกินพิกัดที่ขนส่งเจ้านี้รับได้ */
        private String note;

        /** false = เกินพิกัด เลือกเจ้านี้ไม่ได้ */
        private boolean available;

        public static Option from(ShippingQuote quote) {
            return Option.builder()
                    .company(quote.getCompany())
                    .companyName(quote.getCompany().getDisplayName())
                    .cost(quote.getCost())
                    .rateVersion(quote.getRateVersion())
                    .billableWeightKg(quote.getBillableWeightKg())
                    .dimensionSumCm(quote.getDimensionSumCm())
                    .note(quote.getNote())
                    .available(quote.getNote() == null)
                    .build();
        }
    }

    public static List<ShippingCompany> allCompanies() {
        return Arrays.asList(ShippingCompany.values());
    }
}
