package com.maejo.artmarket.config;

import com.maejo.artmarket.entity.User;
import com.maejo.artmarket.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.stereotype.Service;

import java.util.List;

/**
 * UserDetailsServiceImpl — bridge ระหว่าง Spring Security กับ User entity
 *
 * ค้นตารางเดียวคือ users แล้วอ่านสิทธิ์จาก users.role (BUYER / SELLER / ADMIN)
 *
 * เดิมต้องค้นสองตาราง เพราะผู้ดูแลระบบอยู่ในตาราง admin แยกต่างหาก
 * ซึ่งมี username/password ของตัวเองซ้ำกับ users ทั้งชุด ผลคือมีเส้นทาง
 * ยืนยันตัวตนสองเส้นที่ต้องดูแลให้ตรงกันตลอด ทั้งที่ทำงานเหมือนกันทุกอย่าง
 */
@Service
@RequiredArgsConstructor
public class UserDetailsServiceImpl implements UserDetailsService {

    private final UserRepository userRepository;

    @Override
    public UserDetails loadUserByUsername(String username) throws UsernameNotFoundException {
        User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new UsernameNotFoundException("ไม่พบผู้ใช้: " + username));

        return new org.springframework.security.core.userdetails.User(
                user.getUsername(),
                user.getPassword(),
                List.of(new SimpleGrantedAuthority("ROLE_" + user.getRole().name()))
        );
    }
}
