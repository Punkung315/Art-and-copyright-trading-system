package com.maejo.artmarket.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Generic wrapper สำหรับ JSON response ทุกอัน ทำให้ frontend อ่าน format เดียวกันได้เสมอ
 *
 * ตัวอย่าง response สำเร็จ:
 * { "success": true, "message": "พบผลงาน 5 รายการ", "data": [...] }
 *
 * ตัวอย่าง response ล้มเหลว:
 * { "success": false, "message": "ไม่พบงานศิลปะที่ค้นหา", "data": null }
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ApiResponse<T> {

    private boolean success;
    private String message;
    private T data;

    public static <T> ApiResponse<T> ok(String message, T data) {
        return ApiResponse.<T>builder()
                .success(true)
                .message(message)
                .data(data)
                .build();
    }

    public static <T> ApiResponse<T> error(String message) {
        return ApiResponse.<T>builder()
                .success(false)
                .message(message)
                .data(null)
                .build();
    }
}
