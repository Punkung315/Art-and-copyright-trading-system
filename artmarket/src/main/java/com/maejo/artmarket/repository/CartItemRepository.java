package com.maejo.artmarket.repository;

import com.maejo.artmarket.entity.CartItem;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface CartItemRepository extends JpaRepository<CartItem, Integer> {

    /** List Cart (3.1.9) — ดึงรายการตะกร้าทั้งหมดของผู้ซื้อคนนี้ พร้อม artwork+seller ในคำสั่งเดียว */
    @Query("SELECT c FROM CartItem c " +
           "JOIN FETCH c.artwork a " +
           "JOIN FETCH a.seller s " +
           "JOIN FETCH s.user u " +
           "WHERE c.buyer.buyerId = :buyerId " +
           "ORDER BY c.addDate DESC")
    List<CartItem> findByBuyerId(@Param("buyerId") Integer buyerId);

    /** Remove Item (3.1.10) — ตรวจว่า cart item นี้เป็นของ buyer คนนี้จริงก่อนลบ (security check) */
    Optional<CartItem> findByCartItemIdAndBuyer_BuyerId(Integer cartItemId, Integer buyerId);

    /** ป้องกันใส่ของซ้ำ — ตรวจว่า artwork ชิ้นนี้อยู่ในตะกร้าของ buyer คนนี้แล้วหรือยัง */
    boolean existsByArtwork_ArtworkIdAndBuyer_BuyerId(Integer artworkId, Integer buyerId);
}
