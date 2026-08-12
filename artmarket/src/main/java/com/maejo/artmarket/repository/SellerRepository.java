package com.maejo.artmarket.repository;

import com.maejo.artmarket.entity.Seller;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface SellerRepository extends JpaRepository<Seller, Integer> {

    Optional<Seller> findByUser_UserId(Integer userId);

    /** ใช้ใน ArtworkService และ AuthService — หา Seller จาก username */
    Optional<Seller> findByUser_Username(String username);

    /** ใช้ใน Verify Seller (Admin) — ดูรายการที่รออนุมัติ */
    List<Seller> findByVerifiedFalse();
}
