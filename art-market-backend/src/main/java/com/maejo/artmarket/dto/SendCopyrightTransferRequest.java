package com.maejo.artmarket.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import lombok.Data;

/**
 * DTO รับข้อมูลสัญญาโอนลิขสิทธิ์ (ยูสเคส 3.1.12 Send Copyright Transfer หน้า 34)
 * SRS ระบุ field ครบ: fullName, Address (houseNo, villageNo, thoroughfare, subdistrict,
 * district, province, postalCode), nationalNo
 */
@Data
public class SendCopyrightTransferRequest {

    @NotNull(message = "กรุณาระบุคำสั่งซื้อ")
    private Integer orderId;

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
}
