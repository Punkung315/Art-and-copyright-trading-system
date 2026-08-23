package com.maejo.artmarket.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

import java.util.List;

/**
 * CorsConfig — อนุญาตให้ frontend (Next.js ที่ localhost:3000) เรียก API ข้าม origin ได้
 *
 * เหตุผลที่ต้องมี: เบราว์เซอร์บังคับใช้ Same-Origin Policy
 * frontend อยู่ http://localhost:3000 ส่วน backend อยู่ http://localhost:8080
 * ถือเป็นคนละ origin เบราว์เซอร์จึงยิง preflight (OPTIONS) มาก่อน
 * ถ้า backend ไม่ตอบ header Access-Control-Allow-* กลับไป request จริงจะถูกบล็อกทั้งหมด
 * (เห็นเป็น "CORS error" ใน console โดยที่ backend ไม่มี log อะไรเลย)
 *
 * เปลี่ยน origin ที่อนุญาตได้ที่ property app.cors.allowed-origins ใน application.yaml
 */
@Configuration
public class CorsConfig {

    @Value("${app.cors.allowed-origins:http://localhost:3000}")
    private String allowedOrigins;

    @Bean
    public CorsConfigurationSource corsConfigurationSource() {
        CorsConfiguration config = new CorsConfiguration();

        // ใช้ AllowedOriginPatterns แทน AllowedOrigins เพื่อรองรับ pattern เช่น http://localhost:*
        config.setAllowedOriginPatterns(List.of(allowedOrigins.split("\\s*,\\s*")));
        config.setAllowedMethods(List.of("GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"));
        config.setAllowedHeaders(List.of("*"));
        config.setExposedHeaders(List.of("Authorization"));
        config.setAllowCredentials(true);
        config.setMaxAge(3600L);   // cache preflight ไว้ 1 ชั่วโมง ลดจำนวน OPTIONS request

        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", config);
        return source;
    }
}
