package com.maejo.artmarket.repository;

import com.maejo.artmarket.entity.User;
import com.maejo.artmarket.enums.Role;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface UserRepository extends JpaRepository<User, Integer> {
    Optional<User> findByUsername(String username);
    Optional<User> findByEmail(String email);
    boolean existsByUsername(String username);
    boolean existsByEmail(String email);

    /** ใช้ตอน seed บัญชีผู้ดูแลระบบ — เช็คว่ามีอยู่แล้วหรือยัง */
    boolean existsByRole(Role role);

    /**
     * รายชื่อผู้ใช้สำหรับหน้า List User ของผู้ดูแลระบบ
     * ตัดบัญชี ADMIN ออก เพราะหน้านั้นมีไว้จัดการผู้ซื้อ/ผู้ขาย
     * ถ้าไม่ตัด ผู้ดูแลระบบจะเห็นบัญชีตัวเองปนอยู่ในรายการพร้อมปุ่มระงับการใช้งาน
     */
    List<User> findByRoleNot(Role role);
}
