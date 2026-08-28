package com.maejo.artmarket.shipping;

import com.maejo.artmarket.enums.ShippingCompany;
import com.maejo.artmarket.enums.ShippingRoute;
import org.springframework.stereotype.Service;

import java.util.List;

/**
 * คำนวณค่าจัดส่งจากน้ำหนักและขนาดจริงของชิ้นงาน ตามเกณฑ์ของขนส่งแต่ละเจ้า
 *
 * ---------------------------------------------------------------------------
 * ทำไมตารางราคาถึง hardcode ไว้ในโค้ด ไม่เก็บลง DB
 * ---------------------------------------------------------------------------
 * ตารางราคาขนส่งเปลี่ยนปีละครั้งสองครั้ง และเปลี่ยนทั้งชุดพร้อมกัน ไม่ได้แก้ทีละแถว
 * การเก็บเป็นค่าคงที่พร้อมเลขเวอร์ชันจึงตรวจสอบย้อนหลังได้ง่ายกว่า และไม่ต้องมี
 * หน้าแอดมินสำหรับแก้ราคาที่จะกลายเป็นช่องให้กรอกผิดโดยไม่มีใครรู้
 *
 * สิ่งที่สำคัญกว่าคือ **ค่าส่งที่คิดเงินไปแล้วต้องไม่เปลี่ยนตามตาราง** จึงบันทึก
 * ทั้งราคาและ rateVersion ลง order_item ตอนยืนยันคำสั่งซื้อ (ดู CartService)
 * เหตุผลเดียวกับที่ order_item.price แยกจาก artwork.price อยู่แล้ว
 *
 * ---------------------------------------------------------------------------
 * ที่มาของตัวเลข
 * ---------------------------------------------------------------------------
 * Flash Express  — ตาราง 3/2568-1/2569 คิดตาม น้ำหนัก x ลิมิตขนาด x เส้นทาง
 * Kerry Express  — แบ่งกล่อง S/M/L/XL ตามผลบวกสามด้าน เรทเดียวทั้งประเทศ
 * ไปรษณีย์ไทย     — EMS ในประเทศ (อัตราตั้งแต่ 1 ก.ค. 2561) คิดตามน้ำหนักล้วน
 * J&T Express    — คิดตามน้ำหนัก แยกโซน กทม.+ปริมณฑล กับต่างจังหวัด
 *
 * พิกัดที่ผู้ให้บริการไม่ได้ประกาศตัวเลขรายกิโลไว้ครบ ถูกประมาณแบบเชิงเส้นระหว่าง
 * พิกัดที่ประกาศจริง และทำเครื่องหมาย INTERPOLATED ไว้ในตารางด้านล่าง
 * ระบบนี้ใช้ประเมินราคาเพื่อการศึกษา ไม่ใช่การออกใบเสร็จแทนขนส่ง
 */
@Service
public class ShippingRateService {

    /**
     * ตัวหารน้ำหนักปริมาตร (dimensional weight) ที่ขนส่งไทยใช้กันเป็นมาตรฐาน
     * น้ำหนักที่คิดเงิน = max(น้ำหนักชั่งจริง, กว้าง x ยาว x สูง / 5000)
     * ทำให้กล่องใหญ่แต่เบา เช่น ภาพวาดใส่กรอบ ไม่ถูกคิดถูกเกินจริง
     */
    private static final double VOLUMETRIC_DIVISOR = 5000.0;

    /** ค่าธรรมเนียมพื้นที่ห่างไกล อ้างอิงอัตราที่ Flash ประกาศ */
    private static final double REMOTE_SURCHARGE = 50.0;

    /** ค่าธรรมเนียมปลายทางเป็นเกาะ */
    private static final double ISLAND_SURCHARGE = 30.0;

    // =========================================================================
    // API หลัก
    // =========================================================================

    /**
     * คำนวณค่าส่งจริง ใช้ตอนยืนยันคำสั่งซื้อเมื่อรู้ที่อยู่ปลายทางแล้ว
     *
     * @param originProvince      จังหวัดของผู้ขาย null ได้ (จะถือเป็นเส้นทางแพงสุด)
     * @param destinationProvince จังหวัดปลายทาง ต้องมีค่า
     */
    public ShippingQuote quote(ShippingCompany company,
                               Double weightKg, Double widthCm, Double lengthCm, Double heightCm,
                               String originProvince, String destinationProvince) {

        ShippingRoute route = ThaiProvinces.route(originProvince, destinationProvince);
        double surcharge = areaSurcharge(destinationProvince);
        return compute(company, weightKg, widthCm, lengthCm, heightCm, route, surcharge, false);
    }

    /**
     * ราคาประเมิน ใช้โชว์บนหน้ารายละเอียดงานตอนที่ยังไม่รู้ปลายทาง
     * ตั้งใจให้ประเมินสูงไว้ก่อน (เส้นทางข้ามจังหวัด ไม่บวกค่าพื้นที่พิเศษ)
     */
    public ShippingQuote estimate(ShippingCompany company,
                                  Double weightKg, Double widthCm, Double lengthCm, Double heightCm) {

        return compute(company, weightKg, widthCm, lengthCm, heightCm,
                ShippingRoute.METRO_TO_PROVINCE, 0.0, true);
    }

    private double areaSurcharge(String destinationProvince) {
        double surcharge = 0.0;
        if (ThaiProvinces.isRemote(destinationProvince)) surcharge += REMOTE_SURCHARGE;
        if (ThaiProvinces.isIsland(destinationProvince)) surcharge += ISLAND_SURCHARGE;
        return surcharge;
    }

    private ShippingQuote compute(ShippingCompany company,
                                  Double weightKg, Double widthCm, Double lengthCm, Double heightCm,
                                  ShippingRoute route, double surcharge, boolean estimated) {

        ShippingCompany carrier = company != null ? company : ShippingCompany.FLASH;

        double w = positiveOr(widthCm, 30.0);
        double l = positiveOr(lengthCm, 5.0);
        double h = positiveOr(heightCm, 40.0);
        double dimensionSum = w + l + h;

        double actualWeight = positiveOr(weightKg, 1.0);
        double volumetricWeight = (w * l * h) / VOLUMETRIC_DIVISOR;
        double billable = Math.max(actualWeight, volumetricWeight);

        // เกินพิกัดที่ขนส่งรับ — คืนราคาของพิกัดสูงสุดไว้ พร้อมหมายเหตุเตือน
        String note = null;
        if (billable > carrier.getMaxWeightKg() || dimensionSum > carrier.getMaxDimensionSumCm()) {
            note = "ชิ้นงานเกินพิกัดที่ " + carrier.getDisplayName()
                    + " รับได้ กรุณาติดต่อขนส่งโดยตรงหรือเลือกขนส่งเจ้าอื่น";
        }

        double base = switch (carrier) {
            case FLASH -> flashRate(billable, dimensionSum, route);
            case KERRY -> kerryRate(billable, dimensionSum);
            case THAILAND_POST -> thailandPostRate(billable);
            case JT -> jtRate(billable, route);
        };

        return ShippingQuote.builder()
                .company(carrier)
                .cost(round(base + surcharge))
                .rateVersion(rateVersion(carrier))
                .billableWeightKg(round(billable))
                .dimensionSumCm(round(dimensionSum))
                .route(route)
                .areaSurcharge(round(surcharge))
                .estimated(estimated)
                .note(note)
                .build();
    }

    private String rateVersion(ShippingCompany company) {
        return switch (company) {
            case FLASH -> "FLASH-2569-Q1";
            case KERRY -> "KERRY-2569";
            case THAILAND_POST -> "THP-EMS-2561";
            case JT -> "JT-2569";
        };
    }

    // =========================================================================
    // Flash Express — น้ำหนัก x ลิมิตขนาด x เส้นทาง
    // =========================================================================

    /**
     * แต่ละพิกัดกำหนดทั้งน้ำหนักและผลบวกสามด้านสูงสุด พัสดุจะตกพิกัดไหนต้อง
     * ผ่าน "ทั้งสองเงื่อนไข" กล่องใหญ่แต่เบาจึงถูกดันขึ้นพิกัดที่แพงกว่าโดยอัตโนมัติ
     */
    private record FlashTier(double maxKg, double maxDimSum,
                             double withinMetro, double metroToProvince,
                             double sameProvince, double provinceToMetro) {}

    private static final List<FlashTier> FLASH_TIERS = List.of(
            new FlashTier(0.5, 40,  25, 30, 25, 30),
            new FlashTier(1.0, 40,  30, 34, 30, 34),
            new FlashTier(2.0, 50,  34, 34, 34, 34),
            new FlashTier(3.0, 60,  35, 38, 38, 35),
            new FlashTier(4.0, 70,  50, 55, 45, 55),
            new FlashTier(5.0, 80,  61, 67, 55, 67),
            new FlashTier(6.0, 85,  77, 77, 61, 72),
            new FlashTier(7.0, 90,  89, 89, 67, 89)
    );

    /** อัตราส่วนเพิ่มต่อกิโลกรัมสำหรับพิกัดเกิน 7 กก. (INTERPOLATED) */
    private static final double FLASH_PER_KG_OVER_7 = 18.0;

    private double flashRate(double kg, double dimSum, ShippingRoute route) {
        for (FlashTier tier : FLASH_TIERS) {
            if (kg <= tier.maxKg() && dimSum <= tier.maxDimSum()) {
                return switch (route) {
                    case WITHIN_METRO -> tier.withinMetro();
                    case SAME_PROVINCE -> tier.sameProvince();
                    case PROVINCE_TO_METRO -> tier.provinceToMetro();
                    // ต่างจังหวัดไปต่างจังหวัด Flash ไม่ได้แยกคอลัมน์ไว้
                    // ใช้เรทข้ามโซนที่แพงกว่าเป็นค่าตั้งต้น จะได้ไม่ประเมินต่ำกว่าจริง
                    case METRO_TO_PROVINCE, CROSS_PROVINCE -> tier.metroToProvince();
                };
            }
        }

        // เกินพิกัด 7 กก. หรือ 90 ซม. — ประมาณแบบเชิงเส้นจากพิกัดสุดท้าย
        FlashTier last = FLASH_TIERS.get(FLASH_TIERS.size() - 1);
        double baseOfLast = switch (route) {
            case WITHIN_METRO -> last.withinMetro();
            case SAME_PROVINCE -> last.sameProvince();
            case PROVINCE_TO_METRO -> last.provinceToMetro();
            case METRO_TO_PROVINCE, CROSS_PROVINCE -> last.metroToProvince();
        };

        // ขนาดที่เกิน 90 ซม. ก็ดันพิกัดขึ้นเหมือนกัน (ตารางจริงเพิ่มลิมิต 5 ซม. ต่อ 1 กก.)
        double effectiveKg = Math.max(kg, 7.0 + Math.max(0, dimSum - 90.0) / 5.0);
        return baseOfLast + Math.ceil(effectiveKg - 7.0) * FLASH_PER_KG_OVER_7;
    }

    // =========================================================================
    // Kerry Express — กล่อง S/M/L/XL ตามผลบวกสามด้าน เรทเดียวทั้งประเทศ
    // =========================================================================

    private double kerryRate(double kg, double dimSum) {
        if (dimSum <= 60) {
            if (kg <= 5) return 70;
            if (kg <= 10) return 90;
        }
        if (dimSum <= 90) {
            if (kg <= 10) return 90;
            if (kg <= 15) return 170;
        }
        if (dimSum <= 120) {
            if (kg <= 15) return 170;
            if (kg <= 20) return 250;
        }
        if (dimSum <= 150 && kg <= 20) return 250;

        // เกินกล่อง XL — Kerry ต้องตีราคาหน้าเคาน์เตอร์ ประมาณให้เห็นภาพไว้ก่อน
        return 250 + Math.ceil(Math.max(0, kg - 20)) * 25;
    }

    // =========================================================================
    // ไปรษณีย์ไทย EMS ในประเทศ — คิดตามน้ำหนักล้วน เรทเดียวทั้งประเทศ
    // =========================================================================

    /** {น้ำหนักสูงสุดของพิกัด (กก.), ราคา (บาท)} ตามประกาศอัตรา EMS ในประเทศ */
    private static final double[][] EMS_TIERS = {
            {0.02, 32}, {0.10, 37}, {0.25, 42}, {0.50, 52}, {1.00, 67},
            {1.50, 82}, {2.00, 97}, {2.50, 122}, {3.00, 132}, {3.50, 142},
            {4.00, 152}, {4.50, 162}, {5.00, 172}, {5.50, 192}, {6.00, 212},
            {6.50, 232}, {7.00, 252}, {7.50, 272}, {8.00, 292}, {8.50, 312},
            {9.00, 332}, {9.50, 352}, {10.00, 372}, {11.00, 452}, {12.00, 492},
            {13.00, 507}, {14.00, 522}, {15.00, 537}, {16.00, 552}, {17.00, 567},
            {18.00, 582}, {19.00, 597}, {20.00, 612}
    };

    private double thailandPostRate(double kg) {
        for (double[] tier : EMS_TIERS) {
            if (kg <= tier[0]) return tier[1];
        }
        // EMS ในประเทศรับสูงสุด 20 กก. เกินกว่านั้นต้องใช้บริการอื่น
        return EMS_TIERS[EMS_TIERS.length - 1][1] + Math.ceil(kg - 20) * 30;
    }

    // =========================================================================
    // J&T Express — คิดตามน้ำหนัก แยกโซน กทม.+ปริมณฑล กับต่างจังหวัด
    // =========================================================================

    /**
     * {น้ำหนักสูงสุด (กก.), ราคาโซน กทม.+ปริมณฑล, ราคาต่างจังหวัด}
     * พิกัด 1, 2, 5, 10, 15, 20, 30, 40, 50 กก. เป็นตัวเลขที่ประกาศจริง
     * พิกัดที่เหลือ INTERPOLATED แบบเชิงเส้นระหว่างพิกัดที่ประกาศ
     */
    private static final double[][] JT_TIERS = {
            {1, 23, 30},   {2, 39, 49},   {3, 49, 55},   {4, 57, 60},   {5, 65, 65},
            {6, 72, 72},   {7, 79, 79},   {8, 86, 86},   {9, 93, 93},   {10, 100, 100},
            {11, 117, 117}, {12, 134, 134}, {13, 151, 151}, {14, 168, 168}, {15, 185, 185},
            {16, 206, 206}, {17, 227, 227}, {18, 248, 248}, {19, 269, 269}, {20, 290, 290},
            {30, 390, 390}, {40, 490, 490}, {50, 590, 590}
    };

    private double jtRate(double kg, ShippingRoute route) {
        boolean metroZone = route == ShippingRoute.WITHIN_METRO
                || route == ShippingRoute.SAME_PROVINCE;
        int column = metroZone ? 1 : 2;

        for (double[] tier : JT_TIERS) {
            if (kg <= tier[0]) return tier[column];
        }
        return JT_TIERS[JT_TIERS.length - 1][column];
    }

    // =========================================================================

    private double positiveOr(Double value, double fallback) {
        return value != null && value > 0 ? value : fallback;
    }

    private double round(double value) {
        return Math.round(value * 100.0) / 100.0;
    }
}
