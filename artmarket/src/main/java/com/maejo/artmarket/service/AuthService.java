package com.maejo.artmarket.service;

import com.maejo.artmarket.config.JwtUtil;
import com.maejo.artmarket.dto.*;
import com.maejo.artmarket.entity.*;
import com.maejo.artmarket.enums.Role;
import com.maejo.artmarket.dto.AdminLoginRequest;
import com.maejo.artmarket.entity.Admin;
import com.maejo.artmarket.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * AuthService — Business Logic ของยูสเคส:
 *   3.1.3 Register Buyer
 *   3.1.4 Login User
 *   3.1.5 Register Seller
 */
@Service
@RequiredArgsConstructor
@Transactional
public class AuthService {

    private final UserRepository     userRepository;
    private final BuyerRepository    buyerRepository;
    private final SellerRepository   sellerRepository;
    private final AddressRepository  addressRepository;
    private final PasswordEncoder    passwordEncoder;
    private final AuthenticationManager authenticationManager;
    private final UserDetailsService userDetailsService;
    private final AdminRepository    adminRepository;
    private final JwtUtil            jwtUtil;

    // =========================================================================
    // ยูสเคส 3.1.3 Register Buyer
    // =========================================================================

    public ApiResponse<AuthResponse> registerBuyer(RegisterBuyerRequest req) {

        // Alternate Flow 5.1.1 — ตรวจ username/email ซ้ำ
        if (userRepository.existsByUsername(req.getUsername())) {
            return ApiResponse.error("ข้อมูลผู้ใช้ซ้ำ กรุณาลองใหม่อีกครั้ง");
        }
        if (userRepository.existsByEmail(req.getEmail())) {
            return ApiResponse.error("อีเมลนี้ถูกใช้งานแล้ว กรุณาใช้อีเมลอื่น");
        }

        // Basic Flow ข้อ 5.1 — บันทึก User + Buyer ลง DB
        User user = User.builder()
                .username(req.getUsername())
                .password(passwordEncoder.encode(req.getPassword()))  // hash ก่อนเก็บ
                .email(req.getEmail())
                .fullName("")   // Buyer ยังไม่จำเป็นต้องกรอก fullName ตาม SRS
                .role(Role.BUYER)
                .build();
        userRepository.save(user);

        Buyer buyer = Buyer.builder().user(user).build();
        buyerRepository.save(buyer);

        // คืน token ทันที (login อัตโนมัติหลัง register สำเร็จ)
        return ApiResponse.ok("สมัครสมาชิกสำเร็จ", buildAuthResponse(user));
    }

    // =========================================================================
    // ยูสเคส 3.1.4 Login User
    // =========================================================================

    public ApiResponse<AuthResponse> login(LoginRequest req) {

        // ค้นหา user จาก username หรือ email (SRS ระบุว่าทำได้ทั้งสองแบบ)
        User user = userRepository.findByUsername(req.getUsernameOrEmail())
                .or(() -> userRepository.findByEmail(req.getUsernameOrEmail()))
                .orElse(null);

        if (user == null) {
            // Alternate Flow 5.1.1 — "ไม่พบข้อมูลผู้ใช้"
            return ApiResponse.error("ไม่พบข้อมูลผู้ใช้");
        }

        // Basic Flow ข้อ 5 — ตรวจสอบ username + password กับ DB
        // AuthenticationManager จัดการตรวจ password hash ให้เอง
        authenticationManager.authenticate(
                new UsernamePasswordAuthenticationToken(user.getUsername(), req.getPassword())
        );

        return ApiResponse.ok("เข้าสู่ระบบสำเร็จ", buildAuthResponse(user));
    }

    // =========================================================================
    // ยูสเคส 3.1.5 Register Seller
    // =========================================================================

    public ApiResponse<AuthResponse> registerSeller(String username, RegisterSellerRequest req) {

        User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new RuntimeException("ไม่พบผู้ใช้"));

        // ตรวจว่าเป็น Seller อยู่แล้วหรือยัง
        if (sellerRepository.findByUser_UserId(user.getUserId()).isPresent()) {
            return ApiResponse.error("คุณเป็นผู้ขายอยู่แล้ว");
        }

        // อัปเดต fullName และ phoneNumber ใน User
        user.setFullName(req.getFullName());
        user.setPhoneNumber(req.getPhoneNumber());
        user.setRole(Role.SELLER);  // เปลี่ยน role จาก BUYER → SELLER
        userRepository.save(user);

        // บันทึก Seller (verified=false รอ Admin ตรวจสอบ)
        Seller seller = Seller.builder().user(user).verified(false).build();
        sellerRepository.save(seller);

        // บันทึกที่อยู่
        RegisterSellerRequest.AddressRequest addrReq = req.getAddress();
        Address address = Address.builder()
                .houseNo(addrReq.getHouseNo())
                .villageNo(addrReq.getVillageNo())
                .thoroughfare(addrReq.getThoroughfare())
                .subdistrict(addrReq.getSubdistrict())
                .district(addrReq.getDistrict())
                .province(addrReq.getProvince())
                .postalCode(addrReq.getPostalCode())
                .user(user)
                .build();
        addressRepository.save(address);

        return ApiResponse.ok("สมัครเป็นผู้ขายสำเร็จ รอการตรวจสอบจากผู้ดูแลระบบ", buildAuthResponse(user));
    }

    // =========================================================================
    // Admin Login
    // =========================================================================

    public ApiResponse<AuthResponse> loginAdmin(AdminLoginRequest req) {
        Admin admin = adminRepository.findByUsername(req.getUsername()).orElse(null);
        if (admin == null) {
            return ApiResponse.error("ไม่พบข้อมูล Admin");
        }

        // ตรวจสอบ password
        if (!passwordEncoder.matches(req.getPassword(), admin.getPassword())) {
            return ApiResponse.error("ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง");
        }

        // สร้าง token พร้อม role ADMIN
        UserDetails userDetails = userDetailsService.loadUserByUsername(admin.getUsername());
        String token = jwtUtil.generateToken(userDetails, "ADMIN");

        return ApiResponse.ok("เข้าสู่ระบบสำเร็จ", AuthResponse.builder()
                .token(token)
                .userId(admin.getUserId())
                .username(admin.getUsername())
                .email(null)
                .role(null)
                .build());
    }

    // =========================================================================
    // Helper
    // =========================================================================

    private AuthResponse buildAuthResponse(User user) {
        UserDetails userDetails = userDetailsService.loadUserByUsername(user.getUsername());
        String token = jwtUtil.generateToken(userDetails, user.getRole().name());
        return AuthResponse.builder()
                .token(token)
                .userId(user.getUserId())
                .username(user.getUsername())
                .email(user.getEmail())
                .role(user.getRole())
                .build();
    }
}
