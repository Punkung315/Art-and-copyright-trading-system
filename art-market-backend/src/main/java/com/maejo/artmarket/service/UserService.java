package com.maejo.artmarket.service;

import com.maejo.artmarket.config.JwtUtil;
import com.maejo.artmarket.dto.*;
import com.maejo.artmarket.entity.Address;
import com.maejo.artmarket.entity.Artwork;
import com.maejo.artmarket.entity.User;
import com.maejo.artmarket.enums.PublishStatus;
import com.maejo.artmarket.enums.Role;
import com.maejo.artmarket.repository.ArtworkRepository;
import com.maejo.artmarket.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import java.util.List;
import java.util.Optional;

/**
 * UserService — Business Logic ของยูสเคส:
 *   3.1.6 View Profile
 *   3.1.7 Edit Profile
 */
@Service
@RequiredArgsConstructor
public class UserService {

    private final UserRepository    userRepository;
    private final ArtworkRepository artworkRepository;
    private final JwtUtil           jwtUtil;

    // =========================================================================
    // ยูสเคส 3.1.6 View Profile
    // Basic Flow: รับ userId → ค้นหาใน DB → คืนข้อมูล + รายการผลงาน (ถ้าเป็น Seller)
    // Alternate Flow 4.1.1: ไม่พบ → "ไม่พบข้อมูลผู้ใช้งาน"
    // =========================================================================

    /**
     * โปรไฟล์ของตัวเอง — ใช้คืนสถานะ session ให้ frontend ตอน refresh หน้า
     * เรียกซ้ำ viewProfile() เพื่อไม่ให้ logic การซ่อน/แสดง field แตกออกเป็นสองที่
     */
    @Transactional(readOnly = true)
    public ApiResponse<ProfileResponse> myProfile(String currentUsername) {
        return userRepository.findByUsername(currentUsername)
                .map(u -> viewProfile(u.getUserId(), currentUsername))
                .orElse(ApiResponse.error("ไม่พบข้อมูลผู้ใช้งาน"));
    }

    @Transactional(readOnly = true)
    public ApiResponse<ProfileResponse> viewProfile(Integer targetUserId, String currentUsername) {

        // Basic Flow ข้อ 4.1 — ค้นหาผู้ใช้จากฐานข้อมูล
        Optional<User> userOpt = userRepository.findById(targetUserId);

        // Alternate Flow 4.1.1 — "ไม่พบข้อมูลผู้ใช้งาน"
        if (userOpt.isEmpty()) {
            return ApiResponse.error("ไม่พบข้อมูลผู้ใช้งาน");
        }

        User targetUser = userOpt.get();

        // ตรวจว่ากำลังดูโปรไฟล์ตัวเองหรือคนอื่น
        // ถ้าดูของตัวเอง → แสดง email, phoneNumber ด้วย
        // ถ้าดูของคนอื่น → ซ่อน email, phoneNumber (privacy)
        boolean isSelf = currentUsername != null
                && currentUsername.equals(targetUser.getUsername());

        // ดึงผลงาน — เฉพาะ Seller เท่านั้นที่มี artwork
        // และถ้าดูโปรไฟล์คนอื่น → เห็นแค่งานที่ PUBLISHED แล้ว
        // ถ้าดูโปรไฟล์ตัวเอง → เห็นทุกงาน (ทั้ง DRAFT และ PUBLISHED)
        List<ArtworkSummaryResponse> artworks = List.of();
        if (targetUser.getRole() == Role.SELLER) {
            List<Artwork> artworkEntities;
            if (isSelf) {
                // ดูของตัวเอง → เห็นทุกงาน
                artworkEntities = artworkRepository.findBySeller_User_UserId(targetUserId);
            } else {
                // ดูของคนอื่น → เห็นเฉพาะ published
                artworkEntities = artworkRepository.findBySeller_User_UserIdAndPublishStatus(
                        targetUserId, PublishStatus.PUBLISHED);
            }
            artworks = artworkEntities.stream()
                    .map(ArtworkSummaryResponse::from)
                    .toList();
        }

        // Basic Flow ข้อ 5 — คืนค่าข้อมูล
        return ApiResponse.ok("ดึงข้อมูลผู้ใช้งานสำเร็จ",
                ProfileResponse.from(targetUser, artworks, isSelf));
    }

    // =========================================================================
    // ยูสเคส 3.1.7 Edit Profile
    // Basic Flow: รับข้อมูลใหม่ → validate → อัปเดตใน DB → คืนโปรไฟล์ที่อัปเดตแล้ว
    // Alternate Flow 3.1: validation ไม่ผ่าน → จัดการโดย GlobalExceptionHandler
    // Alternate Flow 5.1.1: แก้ไขไม่สำเร็จ → "ไม่สามารถแก้ไขได้ กรุณาลองอีกครั้ง"
    // =========================================================================

    @Transactional
    public ApiResponse<ProfileResponse> editProfile(String currentUsername, EditProfileRequest req) {

        User user = userRepository.findByUsername(currentUsername)
                .orElseThrow(() -> new RuntimeException("ไม่พบผู้ใช้"));

        // ตรวจ username ใหม่ซ้ำกับคนอื่นไหม (ถ้าส่ง username มาและไม่ใช่อันเดิม)
        if (StringUtils.hasText(req.getUsername())
                && !req.getUsername().equals(user.getUsername())
                && userRepository.existsByUsername(req.getUsername())) {
            return ApiResponse.error("ชื่อผู้ใช้นี้ถูกใช้งานแล้ว กรุณาใช้ชื่ออื่น");
        }

        // ตรวจ email ใหม่ซ้ำกับคนอื่นไหม
        if (StringUtils.hasText(req.getEmail())
                && !req.getEmail().equals(user.getEmail())
                && userRepository.existsByEmail(req.getEmail())) {
            return ApiResponse.error("อีเมลนี้ถูกใช้งานแล้ว กรุณาใช้อีเมลอื่น");
        }

        // จำไว้ก่อนว่าชื่อผู้ใช้เปลี่ยนไหม — ต้องเช็คก่อน setUsername() ไม่งั้นเทียบไม่ได้แล้ว
        boolean usernameChanged = StringUtils.hasText(req.getUsername())
                && !req.getUsername().equals(user.getUsername());

        // Basic Flow ข้อ 5.1 — อัปเดตเฉพาะ field ที่ส่งมา (partial update)
        // ถ้า field ไหนเป็น null หรือ blank → คงค่าเดิมไว้
        if (StringUtils.hasText(req.getUsername()))    user.setUsername(req.getUsername());
        if (StringUtils.hasText(req.getFullName()))    user.setFullName(req.getFullName());
        if (StringUtils.hasText(req.getEmail()))       user.setEmail(req.getEmail());
        if (StringUtils.hasText(req.getPhoneNumber())) user.setPhoneNumber(req.getPhoneNumber());
        if (StringUtils.hasText(req.getNationalNo()))  user.setNationalNo(req.getNationalNo());
        if (StringUtils.hasText(req.getProfileImage())) user.setProfileImage(req.getProfileImage());

        try {
            userRepository.save(user);
        } catch (Exception e) {
            // Alternate Flow 5.1.1 — "ไม่สามารถแก้ไขได้ กรุณาลองอีกครั้ง"
            return ApiResponse.error("ไม่สามารถแก้ไขได้ กรุณาลองอีกครั้ง");
        }

        // คืนโปรไฟล์ที่อัปเดตแล้ว (isSelf=true เพราะแก้ข้อมูลตัวเอง)
        ProfileResponse profile = ProfileResponse.from(user, List.of(), true);

        /*
         * เปลี่ยนชื่อผู้ใช้ = token ใบเดิมใช้ไม่ได้อีกต่อไป
         *
         * JWT เก็บ username ไว้ใน subject และ JwtAuthFilter ใช้ค่านั้นไปหา user ในฐานข้อมูล
         * พอชื่อเปลี่ยน ชื่อเดิมก็ไม่มีในฐานข้อมูลแล้ว request ถัดไปจึงล้มทุกครั้ง
         * ผู้ใช้จะรู้สึกเหมือนถูกเตะออกจากระบบทั้งที่แค่กดบันทึกโปรไฟล์
         *
         * จึงออก token ใบใหม่ให้ทันทีในคำตอบเดียวกัน frontend จะได้สลับไปใช้ใบใหม่
         * โดยผู้ใช้ไม่ต้องล็อกอินซ้ำ
         */
        if (usernameChanged) {
            profile.setToken(jwtUtil.generateToken(user.getUsername(), user.getRole().name()));
        }

        return ApiResponse.ok("แก้ไขข้อมูลสำเร็จ", profile);
    }

    // =========================================================================
    // สมุดที่อยู่ของผู้ใช้ — เพิ่ม / แก้ไข / ลบ ได้หลายรายการ
    //
    // แยกออกมาจาก Edit Profile เพราะผู้ใช้หนึ่งคนมีที่อยู่ได้หลายแห่ง
    // (ที่อยู่จัดส่ง, ที่อยู่ตามบัตรประชาชน ฯลฯ) ถ้ารวมอยู่ในฟอร์มโปรไฟล์
    // จะแก้ได้แค่รายการเดียวและไม่มีทางลบรายการอื่นเลย
    //
    // ทุกเมธอดคืน ProfileResponse ฉบับล่าสุดกลับไป เพื่อให้ frontend
    // อัปเดตรายการที่อยู่ได้ในครั้งเดียว ไม่ต้องยิงถามใหม่แล้วเสี่ยงเห็นข้อมูลค้าง
    // =========================================================================

    @Transactional
    public ApiResponse<ProfileResponse> addAddress(String username, AddressRequest req) {
        User user = userRepository.findByUsername(username).orElse(null);
        if (user == null) return ApiResponse.error("ไม่พบข้อมูลผู้ใช้งาน");

        Address address = new Address();
        address.setUser(user);
        applyAddress(address, req);
        // ที่อยู่แรกของผู้ใช้ให้เป็นที่อยู่ต้นทางไปเลย ผู้ขายส่วนใหญ่มีที่เดียว
        // จะได้ไม่ต้องไปกดเลือกซ้ำ และไม่มีช่วงที่ระบบไม่รู้ว่าจะคิดค่าส่งจากไหน
        if (user.getAddresses().isEmpty()) {
            address.setPickupAddress(true);
        }

        // User.addresses ตั้ง cascade = ALL ไว้ การ add เข้า list แล้ว save(user) จึงบันทึกให้เอง
        user.getAddresses().add(address);

        try {
            userRepository.save(user);
        } catch (Exception e) {
            return ApiResponse.error("ไม่สามารถบันทึกที่อยู่ได้ กรุณาลองอีกครั้ง");
        }
        return ApiResponse.ok("เพิ่มที่อยู่สำเร็จ", ProfileResponse.from(user, List.of(), true));
    }

    @Transactional
    public ApiResponse<ProfileResponse> updateAddress(String username, Integer addressId, AddressRequest req) {
        User user = userRepository.findByUsername(username).orElse(null);
        if (user == null) return ApiResponse.error("ไม่พบข้อมูลผู้ใช้งาน");

        // ต้องหาจากรายการของ "ผู้ใช้คนนี้" เท่านั้น
        // ถ้าไปหาจาก addressRepository.findById ตรงๆ ใครก็แก้ที่อยู่คนอื่นได้ด้วยการเดา id
        Address target = user.getAddresses().stream()
                .filter(a -> a.getAddressId().equals(addressId))
                .findFirst().orElse(null);
        if (target == null) return ApiResponse.error("ไม่พบที่อยู่ที่ต้องการแก้ไข");

        applyAddress(target, req);

        try {
            userRepository.save(user);
        } catch (Exception e) {
            return ApiResponse.error("ไม่สามารถบันทึกที่อยู่ได้ กรุณาลองอีกครั้ง");
        }
        return ApiResponse.ok("แก้ไขที่อยู่สำเร็จ", ProfileResponse.from(user, List.of(), true));
    }

    @Transactional
    public ApiResponse<ProfileResponse> deleteAddress(String username, Integer addressId) {
        User user = userRepository.findByUsername(username).orElse(null);
        if (user == null) return ApiResponse.error("ไม่พบข้อมูลผู้ใช้งาน");

        Address target = user.getAddresses().stream()
                .filter(a -> a.getAddressId().equals(addressId))
                .findFirst().orElse(null);
        if (target == null) return ApiResponse.error("ไม่พบที่อยู่ที่ต้องการลบ");

        // ลบด้วยการเอาออกจาก list ให้ orphanRemoval จัดการ
        // ถ้าไปเรียก addressRepository.delete() ตรงๆ ตัวที่ค้างอยู่ใน list ของ user
        // จะถูก merge กลับเข้ามาตอน flush แล้วพังแบบเดียวกับบั๊กปฏิเสธผู้ขาย
        boolean wasPickup = target.isPickupAddress();
        user.getAddresses().remove(target);
        target.setUser(null);

        // ถ้าเพิ่งลบที่อยู่ต้นทางทิ้ง ต้องยกให้รายการที่เหลือแทนทันที
        // ไม่งั้นผู้ขายจะเหลือที่อยู่อยู่แต่ระบบคิดค่าส่งไม่ได้ โดยไม่มีอะไรบอก
        if (wasPickup && !user.getAddresses().isEmpty()) {
            user.getAddresses().get(0).setPickupAddress(true);
        }

        try {
            userRepository.saveAndFlush(user);
        } catch (Exception e) {
            return ApiResponse.error("ไม่สามารถลบที่อยู่ได้ กรุณาลองอีกครั้ง");
        }
        return ApiResponse.ok("ลบที่อยู่สำเร็จ", ProfileResponse.from(user, List.of(), true));
    }

    /**
     * ตั้งที่อยู่ต้นทางสำหรับส่งของ — มีได้ทีละ 1 รายการเท่านั้น
     * เคลียร์ของเดิมก่อนเสมอ ไม่งั้นจะมีหลายรายการที่ติด flag แล้วไม่รู้ว่าอันไหนจริง
     */
    @Transactional
    public ApiResponse<ProfileResponse> setPickupAddress(String username, Integer addressId) {
        User user = userRepository.findByUsername(username).orElse(null);
        if (user == null) return ApiResponse.error("ไม่พบข้อมูลผู้ใช้งาน");

        // ต้องเป็นที่อยู่ของผู้ใช้คนนี้เท่านั้น กันการเดา id ไปตั้งของคนอื่น
        Address target = user.getAddresses().stream()
                .filter(a -> a.getAddressId().equals(addressId))
                .findFirst().orElse(null);
        if (target == null) return ApiResponse.error("ไม่พบที่อยู่ที่ต้องการตั้งเป็นที่อยู่ต้นทาง");

        user.getAddresses().forEach(a -> a.setPickupAddress(false));
        target.setPickupAddress(true);

        try {
            userRepository.save(user);
        } catch (Exception e) {
            return ApiResponse.error("ไม่สามารถบันทึกที่อยู่ต้นทางได้ กรุณาลองอีกครั้ง");
        }
        return ApiResponse.ok("ตั้งที่อยู่ต้นทางสำเร็จ", ProfileResponse.from(user, List.of(), true));
    }

    private static void applyAddress(Address address, AddressRequest req) {
        address.setHouseNo(trimToNull(req.getHouseNo()));
        address.setVillageNo(trimToNull(req.getVillageNo()));
        address.setThoroughfare(trimToNull(req.getThoroughfare()));
        address.setSubdistrict(req.getSubdistrict().trim());
        address.setDistrict(req.getDistrict().trim());
        address.setProvince(req.getProvince().trim());
        address.setPostalCode(req.getPostalCode().trim());
    }

    /** ช่องที่อยู่ที่ไม่บังคับ ถ้าเว้นว่างให้เก็บเป็น null ไม่ใช่สตริงว่าง จะได้แสดงผลเป็น "—" ได้ถูก */
    private static String trimToNull(String s) {
        return (s == null || s.isBlank()) ? null : s.trim();
    }
}
