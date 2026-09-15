package com.maejo.artmarket.config;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.stereotype.Component;

import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;
import java.util.Date;
import java.util.HashMap;
import java.util.Map;

/**
 * JwtUtil — สร้าง, parse และตรวจสอบ JWT token
 * token เก็บ: sub=username, role=BUYER/SELLER, iat, exp
 */
@Component
public class JwtUtil {

    @Value("${app.jwt.secret}")
    private String secret;

    @Value("${app.jwt.expiration-ms}")
    private long expirationMs;

    private SecretKey getSigningKey() {
        return Keys.hmacShaKeyFor(secret.getBytes(StandardCharsets.UTF_8));
    }

    public String generateToken(UserDetails userDetails, String role) {
        return generateToken(userDetails.getUsername(), role);
    }

    /**
     * สร้าง token จากชื่อผู้ใช้ตรงๆ โดยไม่ต้องโหลด UserDetails ก่อน
     *
     * ใช้ตอนผู้ใช้เปลี่ยนชื่อผู้ใช้ของตัวเอง (Edit Profile) — ตอนนั้นชื่อใหม่เพิ่งถูกบันทึก
     * และยังอยู่ใน transaction เดียวกัน การไปเรียก loadUserByUsername() ซ้ำ
     * จะเป็นการยิง query เพิ่มโดยไม่จำเป็น และต้องพึ่งจังหวะ flush ของ Hibernate
     */
    public String generateToken(String username, String role) {
        Map<String, Object> claims = new HashMap<>();
        claims.put("role", role);
        return Jwts.builder()
                .claims(claims)
                .subject(username)
                .issuedAt(new Date())
                .expiration(new Date(System.currentTimeMillis() + expirationMs))
                .signWith(getSigningKey())
                .compact();
    }

    public String extractUsername(String token) {
        return extractAllClaims(token).getSubject();
    }

    public String extractRole(String token) {
        return extractAllClaims(token).get("role", String.class);
    }

    public boolean isTokenValid(String token, UserDetails userDetails) {
        final String username = extractUsername(token);
        return username.equals(userDetails.getUsername()) && !isTokenExpired(token);
    }

    private boolean isTokenExpired(String token) {
        return extractAllClaims(token).getExpiration().before(new Date());
    }

    private Claims extractAllClaims(String token) {
        return Jwts.parser()
                .verifyWith(getSigningKey())
                .build()
                .parseSignedClaims(token)
                .getPayload();
    }
}
