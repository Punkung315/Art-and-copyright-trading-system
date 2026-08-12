package com.maejo.artmarket.controller;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * Controller ทดสอบเฉยๆ ว่า backend รันขึ้นจริง ก่อนเริ่มเขียน Controller ของยูสเคสจริง
 * ลองรันแล้วเข้า http://localhost:8080/api/health ควรเห็นข้อความตอบกลับ
 */
@RestController
@RequestMapping("/api")
public class HealthCheckController {

    @GetMapping("/health")
    public String health() {
        return "Artmarket backend is running";
    }
}
