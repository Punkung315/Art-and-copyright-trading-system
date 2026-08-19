package com.maejo.artmarket.config;

import lombok.RequiredArgsConstructor;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.dao.DaoAuthenticationProvider;
import org.springframework.security.config.annotation.authentication.configuration.AuthenticationConfiguration;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;

/**
 * SecurityConfig — กำหนดสิทธิ์การเข้าถึงแต่ละ endpoint ตาม role
 *
 * Public (ไม่ต้อง login):
 *   GET  /api/artworks/**      Search Art / View Art (ยูสเคส 3.1.1-3.1.2)
 *   POST /api/auth/register    Register Buyer (ยูสเคส 3.1.3)
 *   POST /api/auth/login       Login User (ยูสเคส 3.1.4)
 *
 * BUYER + SELLER:
 *   POST /api/auth/register-seller  Register Seller (ยูสเคส 3.1.5) — ต้อง login เป็น Buyer ก่อน
 *
 * endpoint อื่นๆ ที่จะเพิ่มในอนาคต:
 *   /api/artworks (POST/PUT/DELETE) → ROLE_SELLER เท่านั้น
 *   /api/orders/**               → ROLE_BUYER / ROLE_SELLER แล้วแต่ operation
 *   /api/admin/**                → ROLE_ADMIN (Admin entity แยกออกมา — TODO)
 */
@Configuration
@EnableWebSecurity
@RequiredArgsConstructor
public class SecurityConfig {

    private final JwtAuthFilter jwtAuthFilter;
    private final UserDetailsServiceImpl userDetailsService;

    @Bean
    public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
        http
            .csrf(AbstractHttpConfigurer::disable)
            .sessionManagement(session ->
                session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
            .authorizeHttpRequests(auth -> auth
                // ==============================================================
                // สำคัญ: Spring Security จับ "กฎแรกที่ match" เป็นตัวตัดสิน
                // ต้องเรียง GET /api/artworks/{เฉพาะเจาะจง} ไว้ "ก่อน" กฎ permitAll
                // ของ /api/artworks/** ที่กว้างกว่า ไม่งั้น permitAll จะ match ก่อนเสมอ
                // ==============================================================

                // Artwork (เฉพาะเจาะจง) — SELLER เท่านั้น ต้องมาก่อน permitAll ด้านล่าง
                .requestMatchers(HttpMethod.GET, "/api/artworks/my").hasRole("SELLER")
                .requestMatchers(HttpMethod.GET, "/api/artworks/*/certificate").hasRole("SELLER")
                .requestMatchers(HttpMethod.POST,  "/api/artworks").hasRole("SELLER")
                .requestMatchers(HttpMethod.PUT,   "/api/artworks/**").hasRole("SELLER")
                .requestMatchers(HttpMethod.PATCH, "/api/artworks/**").hasRole("SELLER")

                // Public endpoints
                .requestMatchers(HttpMethod.GET, "/api/artworks", "/api/artworks/**").permitAll()
                .requestMatchers(HttpMethod.GET, "/api/users/**").permitAll()   // View Profile — ดูของใครก็ได้
                .requestMatchers("/api/auth/register", "/api/auth/login").permitAll()
                .requestMatchers("/api/health").permitAll()
                .requestMatchers("/api/admin/login").permitAll()

                // Admin endpoints — ต้อง login เป็น ADMIN
                .requestMatchers("/api/admin/**").hasRole("ADMIN")

                // Register Seller — ต้องเป็น Buyer ก่อน
                .requestMatchers("/api/auth/register-seller").hasRole("BUYER")

                // Edit Profile — ต้อง login
                .requestMatchers(HttpMethod.PUT, "/api/users/me").authenticated()

                // Seller order management — SELLER เท่านั้น
                .requestMatchers("/api/seller/**").hasRole("SELLER")

                // Cart / Confirm Order / View Order / Make Payment — BUYER เท่านั้น
                .requestMatchers("/api/cart/**").hasRole("BUYER")
                .requestMatchers("/api/orders/**").hasRole("BUYER")
                .requestMatchers("/api/payments/**").hasRole("BUYER")

                // Copyright Transfer — เฉพาะเจาะจงต้องมาก่อน ตาม pattern เดียวกับ artwork ด้านบน
                .requestMatchers(HttpMethod.GET,   "/api/copyright-transfers/sent").hasRole("BUYER")
                .requestMatchers(HttpMethod.POST,  "/api/copyright-transfers").hasRole("BUYER")
                .requestMatchers(HttpMethod.GET,   "/api/copyright-transfers/received").hasRole("SELLER")
                .requestMatchers(HttpMethod.PATCH, "/api/copyright-transfers/**").hasRole("SELLER")

                // อื่นๆ ต้อง login
                .anyRequest().authenticated()
            )
            .authenticationProvider(authenticationProvider(userDetailsService))
            .addFilterBefore(jwtAuthFilter, UsernamePasswordAuthenticationFilter.class);

        return http.build();
    }

    @Bean
    public DaoAuthenticationProvider authenticationProvider(UserDetailsService userDetailsService) {
        DaoAuthenticationProvider authProvider = new DaoAuthenticationProvider(userDetailsService);
        authProvider.setPasswordEncoder(passwordEncoder());
        return authProvider;
    }

    @Bean
    public AuthenticationManager authenticationManager(AuthenticationConfiguration config) throws Exception {
        return config.getAuthenticationManager();
    }

    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }
}
