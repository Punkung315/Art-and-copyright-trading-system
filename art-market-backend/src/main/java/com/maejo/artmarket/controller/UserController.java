package com.maejo.artmarket.controller;

import com.maejo.artmarket.dto.ApiResponse;
import com.maejo.artmarket.dto.EditProfileRequest;
import com.maejo.artmarket.dto.ProfileResponse;
import com.maejo.artmarket.service.UserService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

/**
 * UserController — REST endpoint สำหรับยูสเคส View Profile และ Edit Profile
 *
 * GET  /api/users/{id}      View Profile (ยูสเคส 3.1.6) — ไม่ต้อง login (Pre Condition ว่าง)
 * PUT  /api/users/me        Edit Profile (ยูสเคส 3.1.7) — ต้อง login (แก้ได้เฉพาะตัวเอง)
 *
 * หมายเหตุการออกแบบ endpoint:
 *   - GET /api/users/{id}  รับ userId ตาม Basic Flow ข้อ 3 ที่ระบุว่า "รับค่ารหัสผู้ใช้งานจากพารามิเตอร์"
 *   - PUT /api/users/me    ใช้ /me แทน /{id} เพื่อความปลอดภัย ผู้ใช้ไม่ต้องรู้ userId ตัวเองก็แก้ได้
 *     และป้องกันไม่ให้ผู้ใช้แก้ข้อมูลคนอื่นโดยเปลี่ยน id ใน URL
 */
@RestController
@RequestMapping("/api/users")
@RequiredArgsConstructor
public class UserController {

    private final UserService userService;

    /**
     * ยูสเคส 3.1.6 View Profile
     *
     * GET /api/users/{id}
     *
     * ถ้า login อยู่และ id ตรงกับตัวเอง → เห็น email, phoneNumber ด้วย
     * ถ้าไม่ login หรือดูของคนอื่น → ซ่อน email, phoneNumber
     *
     * @AuthenticationPrincipal จะเป็น null ถ้าผู้ใช้ยังไม่ login (เพราะ endpoint นี้ permitAll)
     */
    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<ProfileResponse>> viewProfile(
            @PathVariable Integer id,
            @AuthenticationPrincipal UserDetails userDetails) {

        String currentUsername = userDetails != null ? userDetails.getUsername() : null;
        ApiResponse<ProfileResponse> response = userService.viewProfile(id, currentUsername);
        return ResponseEntity.ok(response);
    }

    /**
     * GET /api/users/me — โปรไฟล์ของคนที่ login อยู่
     *
     * เพิ่มเข้ามาเพราะ frontend ต้อง "คืนสถานะ session" ตอน refresh หน้า
     * โดยมีแค่ token ในมือ ไม่รู้ userId ของตัวเอง (JWT เก็บแค่ username)
     *
     * หมายเหตุ: Spring จับ @GetMapping("/{id}") ก่อน ถ้า path เป็นตัวเลข
     * ส่วน "/me" เป็น literal path ที่ specific กว่า Spring จึงเลือกอันนี้ให้เอง
     * แต่ต้องประกาศใน SecurityConfig ให้ GET /api/users/me เป็น authenticated
     * มาก่อนกฎ permitAll ของ /api/users/** ด้วย
     */
    @GetMapping("/me")
    public ResponseEntity<ApiResponse<ProfileResponse>> myProfile(
            @AuthenticationPrincipal UserDetails userDetails) {
        return ResponseEntity.ok(userService.myProfile(userDetails.getUsername()));
    }

    /**
     * ยูสเคส 3.1.7 Edit Profile
     *
     * PUT /api/users/me
     * Header: Authorization: Bearer <token>
     * Body: { "username": "...", "fullName": "...", "email": "...",
     *         "phoneNumber": "...", "profileImage": "..." }
     *
     * ส่งมาแค่ field ที่ต้องการเปลี่ยนก็พอ (partial update) ไม่ต้องส่งทุก field
     * ตัวอย่าง: { "phoneNumber": "0812345678" }  → เปลี่ยนแค่เบอร์โทร
     */
    @PutMapping("/me")
    public ResponseEntity<ApiResponse<ProfileResponse>> editProfile(
            @AuthenticationPrincipal UserDetails userDetails,
            @Valid @RequestBody EditProfileRequest request) {

        ApiResponse<ProfileResponse> response = userService.editProfile(
                userDetails.getUsername(), request);
        return ResponseEntity.ok(response);
    }
}
