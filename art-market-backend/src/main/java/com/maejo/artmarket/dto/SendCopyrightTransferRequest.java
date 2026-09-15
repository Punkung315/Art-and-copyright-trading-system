package com.maejo.artmarket.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import lombok.Data;

/**
 * DTO รับข้อมูลสัญญาโอนลิขสิทธิ์ (ยูสเคส 3.1.12 Send Copyright Transfer หน้า 34)
 * SRS ระบุ field ครบ: fullName, Address (houseNo, villageNo, thoroughfare, subdistrict,
 * district, province, postalCode), nationalNo
 */
@Data
public class SendCopyrightTransferRequest {

    /**
     * ระบุคำสั่งซื้อโดยตรง — หรือจะส่ง artworkId มาแทนก็ได้
     *
     * เดิมบังคับ @NotNull แต่ frontend เข้าหน้านี้จากหน้ารายละเอียดงานศิลปะ
     * (/copyright/new/[artworkId]) ซึ่งรู้แค่ artworkId ไม่รู้ orderId
     * จึงเปิดให้ส่งอย่างใดอย่างหนึ่ง แล้วให้ service หา order ให้เอง
     */
    private Integer orderId;

    /** ทางเลือกแทน orderId — ระบบจะหาคำสั่งซื้อของผู้ซื้อที่มีงานชิ้นนี้อยู่ให้เอง */
    private Integer artworkId;

    @NotBlank(message = "กรุณากรอกชื่อ-นามสกุล")
    private String fullName;

    private String houseNo;
    private String villageNo;
    private String thoroughfare;

    @NotBlank(message = "กรุณากรอกตำบล/แขวง")
    private String subdistrict;

    @NotBlank(message = "กรุณากรอกอำเภอ/เขต")
    private String district;

    @NotBlank(message = "กรุณากรอกจังหวัด")
    private String province;

    @NotBlank(message = "กรุณากรอกรหัสไปรษณีย์")
    @Pattern(regexp = "^[0-9]{5}$", message = "รหัสไปรษณีย์ต้องเป็นตัวเลข 5 หลัก")
    private String postalCode;

    @NotBlank(message = "กรุณากรอกเลขบัตรประชาชน")
    @Pattern(regexp = "^[0-9]{13}$", message = "เลขบัตรประชาชนต้องเป็นตัวเลข 13 หลัก")
    private String nationalNo;

    /**
     * รายละเอียดข้อตกลงที่ผู้ซื้อยอมรับ (ช่อง "รายละเอียดข้อตกลง" ในฟอร์ม)
     *
     * ไม่บังคับที่ชั้นนี้ (frontend ตรวจว่าห้ามว่างอยู่แล้ว) เพื่อไม่ให้ client เก่าที่ยังไม่ส่ง
     * field นี้พังไปเลย — ถ้าไม่ส่งมา service จะเติมข้อความมาตรฐานให้แทน
     */
    @Size(max = 1000, message = "รายละเอียดข้อตกลงต้องไม่เกิน 1000 ตัวอักษร")
    private String buyerAgreementDetail;
}
