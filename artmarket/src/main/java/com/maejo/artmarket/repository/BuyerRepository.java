package com.maejo.artmarket.repository;

import com.maejo.artmarket.entity.Buyer;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface BuyerRepository extends JpaRepository<Buyer, Integer> {
    Optional<Buyer> findByUser_UserId(Integer userId);
    Optional<Buyer> findByUser_Username(String username);
}
