package com.maejo.artmarket.config;

import com.maejo.artmarket.entity.User;
import com.maejo.artmarket.enums.Role;
import com.maejo.artmarket.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.CommandLineRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

/**
 * DataSeeder — สร้างบัญชีผู้ดูแลระบบเริ่มต้นให้อัตโนมัติตอนแอปสตาร์ทครั้งแรก
 *
 * ตอนนี้ผู้ดูแลระบบเป็นแถวหนึ่งในตาราง users ที่มี role = ADMIN
 * ไม่ใช่ตาราง admin แยกอีกต่อไป
 *
 * เหตุผลที่ทำแบบนี้แทนการ INSERT SQL ตรงๆ: password ต้องเป็น BCrypt hash เท่านั้น
 * ถ้า hash เองด้วยมือเสี่ยงพิมพ์ผิดหรือ salt/rounds ไม่ตรงกับที่ BCryptPasswordEncoder
 * ของแอปคาดหวัง ทำให้ login ไม่ได้ ให้แอปสร้างเองผ่าน PasswordEncoder ตัวเดียวกับตอน login จึงชัวร์กว่า
 *
 * ทำงานแค่ตอนยังไม่มีบัญชี ADMIN อยู่เท่านั้น (idempotent) — รันซ้ำกี่ครั้งก็ไม่สร้างซ้ำ
 * ปิดได้ด้วย property app.seed-admin.enabled=false ใน application.yaml
 */
@Component
@RequiredArgsConstructor
@Slf4j
public class DataSeeder implements CommandLineRunner {

    private final UserRepository   userRepository;
    private final PasswordEncoder  passwordEncoder;

    @Value("${app.seed-admin.enabled:true}")
    private boolean seedAdminEnabled;

    @Value("${app.seed-admin.username:admin}")
    private String seedUsername;

    @Value("${app.seed-admin.password:Admin1234!}")
    private String seedPassword;

    /**
     * users.email เป็น NOT NULL UNIQUE จึงต้องมีค่าให้บัญชีผู้ดูแลระบบด้วย
     * ตั้งเป็นโดเมน .local ที่ส่งเมลจริงไม่ได้โดยตั้งใจ กันการเผลอใช้รีเซ็ตรหัสผ่าน
     */
    @Value("${app.seed-admin.email:admin@artmarket.local}")
    private String seedEmail;

    @Override
    public void run(String... args) {
        if (!seedAdminEnabled) {
            log.info("app.seed-admin.enabled=false — ข้าม DataSeeder");
            return;
        }

        if (userRepository.existsByRole(Role.ADMIN)) {
            log.info("มีบัญชีผู้ดูแลระบบอยู่แล้ว — ข้าม DataSeeder");
            return;
        }

        // กันเคสที่มี username/email ชนกับผู้ใช้ทั่วไปที่สมัครไว้ก่อน
        // ถ้าชนแล้ว save ไปจะพัง unique constraint ตอน flush ซึ่งเป็น error
        // ที่หลุดออกมาหลังเมธอดนี้จบไปแล้ว ดีบั๊กยากกว่าที่ควร
        if (userRepository.existsByUsername(seedUsername) || userRepository.existsByEmail(seedEmail)) {
            log.warn("มีผู้ใช้ชื่อ '{}' หรืออีเมล '{}' อยู่แล้วแต่ไม่ใช่ ADMIN — ข้ามการสร้างบัญชีผู้ดูแลระบบ",
                    seedUsername, seedEmail);
            return;
        }

        User admin = User.builder()
                .username(seedUsername)
                .password(passwordEncoder.encode(seedPassword))
                .email(seedEmail)
                .fullName("ผู้ดูแลระบบ")
                .role(Role.ADMIN)
                .build();

        userRepository.save(admin);

        log.info("==============================================================");
        log.info(" สร้างบัญชีผู้ดูแลระบบเริ่มต้นสำเร็จ (users.role = ADMIN)");
        log.info(" username: {}", seedUsername);
        log.info(" password: {}", seedPassword);
        log.info(" (ตั้งค่าใหม่ได้ที่ app.seed-admin ใน application.yaml)");
        log.info("==============================================================");
    }
}
