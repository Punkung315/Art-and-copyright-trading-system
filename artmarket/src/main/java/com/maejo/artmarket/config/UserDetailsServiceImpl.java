package com.maejo.artmarket.config;

import com.maejo.artmarket.entity.Admin;
import com.maejo.artmarket.entity.User;
import com.maejo.artmarket.repository.AdminRepository;
import com.maejo.artmarket.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.stereotype.Service;

import java.util.List;

/**
 * UserDetailsServiceImpl — bridge ระหว่าง Spring Security กับ User / Admin entity
 *
 * ลำดับการค้นหา:
 *   1. ค้นใน users table ก่อน (Buyer / Seller)
 *   2. ถ้าไม่พบ → ค้นใน admin table
 *   3. ถ้าไม่พบทั้งคู่ → throw UsernameNotFoundException
 *
 * เหตุที่ต้องค้นสองตาราง: SRS กำหนดให้ Admin อยู่คนละตารางกับ User
 * ทำให้ Admin login ผ่าน endpoint เดียวกับ User ได้ แต่ได้ ROLE_ADMIN แทน
 */
@Service
@RequiredArgsConstructor
public class UserDetailsServiceImpl implements UserDetailsService {

    private final UserRepository  userRepository;
    private final AdminRepository adminRepository;

    @Override
    public UserDetails loadUserByUsername(String username) throws UsernameNotFoundException {

        // ค้นใน users table ก่อน
        User user = userRepository.findByUsername(username).orElse(null);
        if (user != null) {
            return new org.springframework.security.core.userdetails.User(
                    user.getUsername(),
                    user.getPassword(),
                    List.of(new SimpleGrantedAuthority("ROLE_" + user.getRole().name()))
            );
        }

        // ค้นใน admin table
        Admin admin = adminRepository.findByUsername(username)
                .orElseThrow(() -> new UsernameNotFoundException("ไม่พบผู้ใช้: " + username));

        return new org.springframework.security.core.userdetails.User(
                admin.getUsername(),
                admin.getPassword(),
                List.of(new SimpleGrantedAuthority("ROLE_ADMIN"))
        );
    }
}
