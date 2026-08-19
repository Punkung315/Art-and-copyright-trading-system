package com.maejo.artmarket.config;

import com.maejo.artmarket.entity.Admin;
import com.maejo.artmarket.repository.AdminRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.CommandLineRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

/**
 * DataSeeder — สร้างบัญชี Admin เริ่มต้นให้อัตโนมัติตอนแอปสตาร์ทครั้งแรก
 *
 * เหตุผลที่ทำแบบนี้แทนการ INSERT SQL ตรงๆ: password ต้องเป็น BCrypt hash เท่านั้น
 * ถ้า hash เองด้วยมือเสี่ยงพิมพ์ผิดหรือ salt/rounds ไม่ตรงกับที่ BCryptPasswordEncoder
 * ของแอปคาดหวัง ทำให้ login ไม่ได้ ให้แอปสร้างเองผ่าน PasswordEncoder ตัวเดียวกับตอน login จึงชัวร์กว่า
 *
 * ทำงานแค่ตอนตาราง admin ยังว่างอยู่เท่านั้น (idempotent) — รันซ้ำกี่ครั้งก็ไม่สร้างซ้ำ
 * ปิดได้ด้วย property app.seed-admin.enabled=false ใน application.yml
 */
@Component
@RequiredArgsConstructor
@Slf4j
public class DataSeeder implements CommandLineRunner {

    private final AdminRepository adminRepository;
    private final PasswordEncoder passwordEncoder;

    @Value("${app.seed-admin.enabled:true}")
    private boolean seedAdminEnabled;

    @Value("${app.seed-admin.username:admin}")
    private String seedUsername;

    @Value("${app.seed-admin.password:Admin1234!}")
    private String seedPassword;

    @Override
    public void run(String... args) {
        if (!seedAdminEnabled) {
            log.info("app.seed-admin.enabled=false — ข้าม DataSeeder");
            return;
        }

        if (adminRepository.count() > 0) {
            log.info("มีบัญชี Admin อยู่แล้วในระบบ — ข้าม DataSeeder");
            return;
        }

        Admin admin = Admin.builder()
                .username(seedUsername)
                .password(passwordEncoder.encode(seedPassword))
                .build();

        adminRepository.save(admin);

        log.info("==============================================================");
        log.info(" สร้างบัญชี Admin เริ่มต้นสำเร็จ");
        log.info(" username: {}", seedUsername);
        log.info(" password: {}", seedPassword);
        log.info(" (ตั้งค่าใหม่ได้ที่ app.seed-admin ใน application.yml)");
        log.info("==============================================================");
    }
}
