package com.maejo.artmarket.repository;

import com.maejo.artmarket.entity.Payment;
import com.maejo.artmarket.enums.PaymentStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.Optional;

public interface PaymentRepository extends JpaRepository<Payment, Integer> {
    Optional<Payment> findByOrder_OrderId(Integer orderId);
    List<Payment> findByPaymentStatus(PaymentStatus status);
}
