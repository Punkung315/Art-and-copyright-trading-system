package com.maejo.artmarket.entity;

import com.maejo.artmarket.enums.PaymentStatus;
import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "payment")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Payment {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer paymentId;

    @Column(nullable = false)
    private Double grandTotal;
    private Double shippingCost;
    private String slipTransfer;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private PaymentStatus transferStatus;

    @OneToOne
    @JoinColumn(name = "order_id", nullable = false, unique = true)
    private Orders order;
}
