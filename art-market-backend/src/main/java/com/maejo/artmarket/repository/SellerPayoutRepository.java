package com.maejo.artmarket.repository;

import com.maejo.artmarket.entity.SellerPayout;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface SellerPayoutRepository extends JpaRepository<SellerPayout, Integer> {
    Optional<SellerPayout> findByOrder_OrderIdAndSeller_SellerId(Integer orderId, Integer sellerId);
}
