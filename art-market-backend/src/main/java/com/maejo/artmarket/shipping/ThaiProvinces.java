package com.maejo.artmarket.shipping;

import com.maejo.artmarket.enums.ShippingRoute;

import java.util.Set;

/**
 * ข้อมูลจังหวัดที่ใช้ตัดสินเส้นทางและค่าธรรมเนียมพื้นที่
 *
 * เก็บเป็นค่าคงที่ในโค้ดแทนตารางใน DB เพราะเป็นข้อมูลภูมิศาสตร์ที่แทบไม่เปลี่ยน
 * ถ้าวันหนึ่งต้องแก้บ่อย ค่อยย้ายไปเป็นตาราง province ทีหลังได้โดยไม่กระทบสูตรคิดราคา
 */
public final class ThaiProvinces {

    private ThaiProvinces() {}

    /** กรุงเทพฯ และปริมณฑล 5 จังหวัด — ขนส่งทุกเจ้านับเป็นโซนเดียวกัน */
    private static final Set<String> METRO = Set.of(
            "กรุงเทพมหานคร", "กรุงเทพ", "นนทบุรี", "ปทุมธานี",
            "สมุทรปราการ", "สมุทรสาคร", "นครปฐม"
    );

    /**
     * จังหวัดที่มีพื้นที่ห่างไกล/พื้นที่พิเศษเป็นวงกว้าง — คิดค่าธรรมเนียมเพิ่ม
     * ของจริงขนส่งแบ่งละเอียดถึงระดับตำบล แต่ระดับจังหวัดพอสำหรับการประเมินราคา
     */
    private static final Set<String> REMOTE = Set.of(
            "แม่ฮ่องสอน", "น่าน", "ตาก", "บึงกาฬ", "นราธิวาส", "ยะลา", "ปัตตานี"
    );

    /** จังหวัดที่ปลายทางเป็นเกาะ — ขนส่งคิดค่าข้ามเรือเพิ่ม */
    private static final Set<String> ISLAND = Set.of(
            "ภูเก็ต", "กระบี่", "พังงา", "ตราด", "ระนอง", "สตูล"
    );

    public static boolean isMetro(String province) {
        return province != null && METRO.contains(province.trim());
    }

    public static boolean isRemote(String province) {
        return province != null && REMOTE.contains(province.trim());
    }

    public static boolean isIsland(String province) {
        return province != null && ISLAND.contains(province.trim());
    }

    /**
     * ตัดสินเส้นทางจากจังหวัดต้นทาง-ปลายทาง
     * ถ้าไม่รู้ต้นทาง (ผู้ขายยังไม่ได้ใส่ที่อยู่) ให้ถือเป็นเส้นทางแพงสุดไว้ก่อน
     * จะได้ไม่ประเมินค่าส่งต่ำกว่าจริงแล้วผู้ขายต้องจ่ายส่วนต่างเอง
     */
    public static ShippingRoute route(String originProvince, String destinationProvince) {
        if (originProvince == null || originProvince.isBlank()
                || destinationProvince == null || destinationProvince.isBlank()) {
            return ShippingRoute.METRO_TO_PROVINCE;
        }

        String origin = originProvince.trim();
        String dest = destinationProvince.trim();

        if (origin.equals(dest)) return ShippingRoute.SAME_PROVINCE;

        boolean originMetro = isMetro(origin);
        boolean destMetro = isMetro(dest);

        if (originMetro && destMetro) return ShippingRoute.WITHIN_METRO;
        if (originMetro) return ShippingRoute.METRO_TO_PROVINCE;
        if (destMetro) return ShippingRoute.PROVINCE_TO_METRO;
        return ShippingRoute.CROSS_PROVINCE;
    }
}
