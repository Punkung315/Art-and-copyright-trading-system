package com.maejo.artmarket.dto;

import jakarta.validation.constraints.*;
import lombok.Data;

/**
 * DTO รับข้อมูลแก้ไขโปรไฟล์ (ยูสเคส 3.1.7 Edit Profile หน้า 29-30)
 *
 * ทุก field เป็น optional — ถ้าส่งมาเฉพาะบางฟิลด์จะอัปเดตแค่ฟิลด์นั้น (partial update)
 * SRS ไม่ได้บังคับให้กรอกทุกอันพร้อมกัน แค่ฟิลด์ที่ส่งมาต้องถูก validation rules
 *
 * หมายเหตุ: profileImage ใน SRS ระบุว่าต้องเป็น .png หรือ .jpg
 * การตรวจสอบประเภทไฟล์ทำใน Service ตอนรับ MultipartFile จริง
 * ใน DTO นี้ profileImagePath ใช้รับ path หลังจากบันทึกไฟล์แล้ว
 * (flow อัปโหลดไฟล์จะใช้ endpoint แยกต่างหาก หรือส่งมาพร้อมกันเป็น multipart/form-data)
 */
@Data
public class EditProfileRequest {

    /**
     * username — SRS กำหนด:
     * 1. ภาษาอังกฤษหรือตัวเลขเท่านั้น
     * 2. ยาว 8-20 ตัวอักษร
     * 3. ไม่มีช่องว่าง
     * 4. ไม่ว่าง (ถ้าส่งมา)
     */
    @Pattern(regexp = "^[a-zA-Z0-9]{8,20}$",
             message = "ชื่อผู้ใช้ต้องเป็นภาษาอังกฤษหรือตัวเลข ความยาว 8-20 ตัวอักษร ไม่มีช่องว่าง")
    private String username;

    /**
     * fullName — SRS กำหนด:
     * 1. ภาษาอังกฤษ
     * 2. ต้องมีช่องว่างระหว่างชื่อ-นามสกุล
     * 3. ไม่ว่าง (ถ้าส่งมา)
     */
    @Pattern(regexp = "^[a-zA-Z]+ [a-zA-Z]+.*$",
             message = "ชื่อ-นามสกุลต้องเป็นภาษาอังกฤษและมีช่องว่างระหว่างชื่อกับนามสกุล")
    private String fullName;

    /**
     * email — SRS กำหนด:
     * 1. รูปแบบ email ที่ถูกต้อง (@gmail.com, @hotmail.com เป็นต้น)
     * 2. ไม่มีช่องว่าง
     * 3. ไม่ว่าง (ถ้าส่งมา)
     */
    @Email(message = "รูปแบบอีเมลไม่ถูกต้อง")
    private String email;

    /**
     * phoneNumber — SRS กำหนด:
     * 1. ตัวเลข
     * 2. ยาวพอดี 10 หลัก
     * 3. ไม่มีช่องว่าง, ไม่ว่าง (ถ้าส่งมา)
     */
    @Pattern(regexp = "^[0-9]{10}$",
             message = "เบอร์โทรศัพท์ต้องเป็นตัวเลข 10 หลัก ไม่มีช่องว่าง")
    private String phoneNumber;

    /**
     * profileImage — path รูปที่อัปโหลดแล้ว
     * SRS กำหนดว่าต้องเป็น .png หรือ .jpg เท่านั้น
     * ตรวจสอบนามสกุลไฟล์ด้วย @Pattern ป้องกัน path traversal เบื้องต้น
     */
    @Pattern(regexp = "^.+\\.(png|jpg|jpeg|PNG|JPG|JPEG)$",
             message = "รูปภาพต้องเป็นไฟล์ .png หรือ .jpg เท่านั้น")
    private String profileImage;
}
