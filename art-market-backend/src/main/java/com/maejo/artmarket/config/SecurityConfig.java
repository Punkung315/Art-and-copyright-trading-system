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
import org.springframework.web.cors.CorsConfigurationSource;

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
    private final CorsConfigurationSource corsConfigurationSource;

    @Bean
    public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
        http
            // CORS ต้องเปิดตรงนี้ด้วย ไม่ใช่แค่ประกาศ bean CorsConfigurationSource เฉยๆ
            // ไม่งั้น Spring Security จะ reject preflight (OPTIONS) ก่อนถึง MVC layer
            .cors(cors -> cors.configurationSource(corsConfigurationSource))
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

                // GET /api/users/me ต้อง login และต้องมาก่อน permitAll ของ /api/users/**
                // ไม่งั้น "me" จะถูก match เป็น {id} แบบ public แล้ว @AuthenticationPrincipal จะเป็น null
                .requestMatchers(HttpMethod.GET, "/api/users/me").authenticated()
                .requestMatchers(HttpMethod.PUT, "/api/users/me").authenticated()

                // สมุดที่อยู่ของตัวเอง — ต้องอยู่เหนือ permitAll ของ GET /api/users/** เช่นกัน
                // ไม่งั้น GET /api/users/me/addresses จะกลายเป็น public แล้วใครก็อ่านได้
                .requestMatchers("/api/users/me/addresses", "/api/users/me/addresses/**").authenticated()

                // Public endpoints
                .requestMatchers(HttpMethod.GET, "/api/artworks", "/api/artworks/**").permitAll()
                .requestMatchers(HttpMethod.GET, "/api/users/**").permitAll()   // View Profile — ดูของใครก็ได้
                .requestMatchers("/api/auth/register", "/api/auth/login").permitAll()
                .requestMatchers("/api/health").permitAll()
                .requestMatchers("/api/admin/login").permitAll()
                // ประเมินค่าจัดส่ง — เป็นแค่การคำนวณจากตัวเลขที่ส่งมา ไม่แตะข้อมูลใคร
                .requestMatchers(HttpMethod.GET, "/api/shipping/**").permitAll()

                // Admin endpoints — ต้อง login เป็น ADMIN
                .requestMatchers("/api/admin/**").hasRole("ADMIN")

                // Register Seller — ต้องเป็น Buyer ก่อน
                .requestMatchers("/api/auth/register-seller").hasRole("BUYER")

                // Seller order management — SELLER เท่านั้น
                .requestMatchers("/api/seller/**").hasRole("SELLER")

                // ==============================================================
                // Cart / Order / Payment — เดิมล็อกไว้ที่ hasRole("BUYER") อย่างเดียว
                // แต่ registerSeller() เปลี่ยน user.role จาก BUYER → SELLER ทับไปเลย
                // ทำให้คนที่สมัครเป็นผู้ขายแล้ว "ซื้อของไม่ได้อีกต่อไป" (403 ทุก endpoint)
                // ทั้งที่ record Buyer ของเขายังอยู่ครบและ SRS ไม่ได้ห้ามผู้ขายซื้องานคนอื่น
                // จึงเปิดให้ทั้งสอง role เข้าได้ ส่วนการตรวจสิทธิ์ระดับข้อมูล
                // (เป็นเจ้าของ order นั้นจริงไหม) service layer ตรวจอยู่แล้ว
                // ==============================================================
                .requestMatchers("/api/cart/**").hasAnyRole("BUYER", "SELLER")
                .requestMatchers("/api/orders/**").hasAnyRole("BUYER", "SELLER")
                .requestMatchers("/api/payments/**").hasAnyRole("BUYER", "SELLER")

                // Copyright Transfer — เฉพาะเจาะจงต้องมาก่อน ตาม pattern เดียวกับ artwork ด้านบน
                .requestMatchers(HttpMethod.GET,   "/api/copyright-transfers/sent").hasAnyRole("BUYER", "SELLER")
                .requestMatchers(HttpMethod.POST,  "/api/copyright-transfers").hasAnyRole("BUYER", "SELLER")
                .requestMatchers(HttpMethod.GET,   "/api/copyright-transfers/received").hasRole("SELLER")
                // ผู้ซื้อเป็นคนเซ็นสัญญากลับ (Sign Agreement 3.1.16) จึงต้องเข้าได้ด้วย
                .requestMatchers(HttpMethod.PATCH, "/api/copyright-transfers/*/sign").hasAnyRole("BUYER", "SELLER")
                // ชำระค่าลิขสิทธิ์ — ผู้ซื้อเป็นคนจ่าย (ผู้ขายก็ซื้อลิขสิทธิ์งานคนอื่นได้)
                // ต้องประกาศไว้ตรงนี้ ไม่งั้น POST /{id}/payment จะตกไปที่ anyRequest()
                // ซึ่งเปิดให้ทุก role ที่ login แล้วยิงได้ รวมถึง ADMIN
                .requestMatchers(HttpMethod.GET,  "/api/copyright-transfers/*/payment").hasAnyRole("BUYER", "SELLER")
                .requestMatchers(HttpMethod.POST, "/api/copyright-transfers/*/payment").hasAnyRole("BUYER", "SELLER")
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
