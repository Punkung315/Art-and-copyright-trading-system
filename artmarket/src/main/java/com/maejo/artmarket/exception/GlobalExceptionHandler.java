package com.maejo.artmarket.exception;

import com.maejo.artmarket.dto.ApiResponse;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.validation.FieldError;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

import java.util.stream.Collectors;

/**
 * GlobalExceptionHandler — จับ exception ทุกประเภทและแปลงกลับเป็น ApiResponse format เดียวกัน
 * ทำให้ frontend อ่าน error ได้ง่าย ไม่ต้องไป parse structure ต่างกัน
 */
@RestControllerAdvice
public class GlobalExceptionHandler {

    /**
     * @Valid ใน Controller ตรวจไม่ผ่าน → แสดงข้อความ validation ที่เราเขียนไว้ใน DTO
     * ตรงกับ Alternate Flow 3.1 ของ Register Buyer, Login, Register Seller ใน SRS:
     * "กรณีผู้ใช้กรอกข้อมูลไม่ถูกต้องหรือไม่ครบถ้วน ระบบจะแสดงข้อความ กรุณากรอกข้อมูลให้ถูกต้อง"
     */
    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<ApiResponse<Object>> handleValidationErrors(
            MethodArgumentNotValidException ex) {

        String message = ex.getBindingResult().getFieldErrors().stream()
                .map(FieldError::getDefaultMessage)
                .collect(Collectors.joining(", "));

        return ResponseEntity
                .status(HttpStatus.BAD_REQUEST)
                .body(ApiResponse.error("กรุณากรอกข้อมูลให้ถูกต้อง: " + message));
    }

    /**
     * AuthenticationManager โยน BadCredentialsException เมื่อ password ไม่ตรง
     */
    @ExceptionHandler(BadCredentialsException.class)
    public ResponseEntity<ApiResponse<Object>> handleBadCredentials(BadCredentialsException ex) {
        return ResponseEntity.ok(ApiResponse.error("ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง"));
    }

    /** catch-all สำหรับ exception ที่ไม่ได้คาดไว้ */
    @ExceptionHandler(Exception.class)
    public ResponseEntity<ApiResponse<Object>> handleGeneral(Exception ex) {
        return ResponseEntity
                .status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(ApiResponse.error("เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง"));
    }
}
