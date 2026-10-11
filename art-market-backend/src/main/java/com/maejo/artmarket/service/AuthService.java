package com.maejo.artmarket.service;

import com.maejo.artmarket.config.JwtUtil;
import com.maejo.artmarket.dto.*;
import com.maejo.artmarket.entity.*;
import com.maejo.artmarket.enums.Role;
import com.maejo.artmarket.dto.AdminLoginRequest;
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
        //
        // fullName / phoneNumber / nationalNo รับมาตั้งแต่สมัครแล้ว (ดูหมายเหตุใน DTO)
        // ของเดิมตั้ง fullName เป็นสตริงว่าง แล้วไปขอทีหลังตอนผู้ซื้อจะทำสัญญาลิขสิทธิ์
        User user = User.builder()
                .username(req.getUsername())
                .password(passwordEncoder.encode(req.getPassword()))  // hash ก่อนเก็บ
                .email(req.getEmail())
                .fullName(req.getFullName())
                .phoneNumber(req.getPhoneNumber())
                .nationalNo(req.getNationalNo())
                .role(Role.BUYER)
                .build();
        userRepository.save(user);

        Buyer buyer = Buyer.builder().user(user).build();
        buyerRepository.save(buyer);

        // ที่อยู่รายการแรกของผู้ซื้อ — เป็นที่อยู่จัดส่งตั้งต้น เพิ่ม/เลือกอันอื่นทีหลังได้
        addressRepository.save(toAddress(req.getAddress(), user));

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

        // ผู้ดูแลระบบต้องเข้าทางหน้า login ของแอดมินเท่านั้น
        // ตอนที่ admin ยังอยู่คนละตาราง endpoint นี้หาไม่เจออยู่แล้วโดยปริยาย
        // พอยุบมารวมใน users จึงต้องกันเองที่นี่ ไม่งั้นบัญชีแอดมินจะหลุดเข้า
        // หน้าผู้ซื้อซึ่งไม่มีทั้ง buyer และ seller record รองรับ
        if (user.getRole() == Role.ADMIN) {
            return ApiResponse.error("บัญชีผู้ดูแลระบบ กรุณาเข้าสู่ระบบผ่านหน้าสำหรับผู้ดูแลระบบ");
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

        // ตรวจบัญชีรับเงินก่อนแตะข้อมูลใดๆ — ถ้าบัญชีไม่ผ่าน ต้องไม่เหลือสถานะสมัครค้างครึ่งทาง
        Seller seller = Seller.builder().user(user).verified(false).build();
        String bankErr = SellerBankAccountService.apply(seller, req.getBankAccount());
        if (bankErr != null) {
            return ApiResponse.error(bankErr);
        }

        // อัปเดต fullName และ phoneNumber ใน User
        user.setFullName(req.getFullName());
        user.setPhoneNumber(req.getPhoneNumber());
        // เลขบัตรประชาชนใช้ในใบสัญญาโอนลิขสิทธิ์และหน้า Verify Seller ของ Admin
        // เดิม DTO ไม่มี field นี้ ทำให้ SellerVerifyResponse.nationalNo เป็น null เสมอ
        if (req.getNationalNo() != null && !req.getNationalNo().isBlank()) {
            user.setNationalNo(req.getNationalNo());
        }
        user.setRole(Role.SELLER);  // เปลี่ยน role จาก BUYER → SELLER
        userRepository.save(user);

        // ผู้ขายยังคงเป็นผู้ซื้อได้ตามเดิม — ถ้า record Buyer หายไป (เช่นข้อมูลเก่า) สร้างคืนให้
        if (buyerRepository.findByUser_UserId(user.getUserId()).isEmpty()) {
            buyerRepository.save(Buyer.builder().user(user).build());
        }

        // บันทึก Seller (verified=false รอ Admin ตรวจสอบ) พร้อมบัญชีรับเงินที่ตรวจแล้วด้านบน
        sellerRepository.save(seller);

        /*
         * บันทึกที่อยู่ — แต่เฉพาะเมื่อผู้ใช้ยังไม่มีที่อยู่ในสมุดเท่านั้น
         *
         * ตั้งแต่ผู้ซื้อกรอกที่อยู่ตั้งแต่สมัคร คนที่มาสมัครเป็นผู้ขายต่อจะมีที่อยู่อยู่แล้ว
         * ถ้าบันทึกเพิ่มทุกครั้งจะได้ที่อยู่ซ้ำสองรายการในสมุดตั้งแต่วันแรก
         * และผู้ใช้จะงงว่าทำไมตอนสั่งซื้อมีที่อยู่เดียวกันให้เลือกสองอัน
         */
        if (addressRepository.findByUser_UserId(user.getUserId()).isEmpty()) {
            addressRepository.save(toAddress(req.getAddress(), user));
        }

        return ApiResponse.ok("สมัครเป็นผู้ขายสำเร็จ รอการตรวจสอบจากผู้ดูแลระบบ", buildAuthResponse(user));
    }

    /** แปลง AddressRequest เป็น Address ของผู้ใช้คนหนึ่ง — ใช้ร่วมกันทั้งสมัครผู้ซื้อและผู้ขาย */
    private Address toAddress(RegisterSellerRequest.AddressRequest req, User user) {
        return Address.builder()
                .houseNo(req.getHouseNo())
                .villageNo(req.getVillageNo())
                .thoroughfare(req.getThoroughfare())
                .subdistrict(req.getSubdistrict())
                .district(req.getDistrict())
                .province(req.getProvince())
                .postalCode(req.getPostalCode())
                .user(user)
                .build();
    }

    // =========================================================================
    // Admin Login
    // =========================================================================

    public ApiResponse<AuthResponse> loginAdmin(AdminLoginRequest req) {
        // ผู้ดูแลระบบเป็นแถวใน users ที่ role = ADMIN แล้ว ไม่ใช่ตารางแยก
        User admin = userRepository.findByUsername(req.getUsername()).orElse(null);

        // ข้อความเดียวกันทั้งกรณี "ไม่มีบัญชีนี้" และ "ไม่ใช่ผู้ดูแลระบบ"
        // ไม่งั้นหน้า login ฝั่งแอดมินจะกลายเป็นเครื่องมือเดาว่า username ไหนมีอยู่จริง
        if (admin == null || admin.getRole() != Role.ADMIN) {
            return ApiResponse.error("ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง");
        }

        if (!passwordEncoder.matches(req.getPassword(), admin.getPassword())) {
            return ApiResponse.error("ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง");
        }

        UserDetails userDetails = userDetailsService.loadUserByUsername(admin.getUsername());
        String token = jwtUtil.generateToken(userDetails, Role.ADMIN.name());

        return ApiResponse.ok("เข้าสู่ระบบสำเร็จ", AuthResponse.builder()
                .token(token)
                .userId(admin.getUserId())
                .username(admin.getUsername())
                .email(admin.getEmail())
                .role(Role.ADMIN)
                .roleName(Role.ADMIN.name())
                .fullName(admin.getFullName())
                .build());
    }

    // =========================================================================
    // Helper
    // =========================================================================

    private AuthResponse buildAuthResponse(User user) {
        UserDetails userDetails = userDetailsService.loadUserByUsername(user.getUsername());
        String token = jwtUtil.generateToken(userDetails, user.getRole().name());

        // อ่านสถานะการอนุมัติผู้ขายจาก DB ตรงๆ แทนการพึ่ง user.getSeller()
        // เพราะใน transaction เดียวกับ registerSeller() ตัว user entity ที่ถืออยู่
        // อาจยังไม่เห็น Seller ที่เพิ่ง save ไป (ความสัมพันธ์ฝั่ง inverse ยังไม่ refresh)
        boolean sellerVerified = sellerRepository.findByUser_UserId(user.getUserId())
                .map(Seller::isVerified)
                .orElse(false);

        return AuthResponse.builder()
                .token(token)
                .userId(user.getUserId())
                .username(user.getUsername())
                .email(user.getEmail())
                .role(user.getRole())
                .roleName(user.getRole().name())
                .fullName(user.getFullName())
                .profileImage(user.getProfileImage())
                .sellerVerified(sellerVerified)
                .build();
    }
}
