package com.maejo.artmarket.entity;

import com.maejo.artmarket.enums.OrderStatus;
import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "orders")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Orders {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer orderId;
    private LocalDateTime confirmDateTime;

    @Column(nullable = false)
    private LocalDateTime orderDate;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private OrderStatus orderStatus;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "buyer_id", nullable = false)
    private Buyer buyer;

    /**
     * ที่อยู่ปลายทาง บันทึกเป็นสำเนาตอนยืนยันคำสั่งซื้อ (ดูเหตุผลใน ShippingAddress)
     * ต้องมีค่าเสมอ ไม่งั้นคำนวณค่าจัดส่งไม่ได้ — CartService บังคับไว้แล้ว
     */
    @Embedded
    private ShippingAddress shippingAddress;

    @OneToMany(mappedBy = "order", cascade = CascadeType.ALL, orphanRemoval = true)
    @Builder.Default
    private List<OrderItem> orderItems = new ArrayList<>();

    @OneToOne(mappedBy = "order", cascade = CascadeType.ALL, orphanRemoval = true)
    private Payment payment;

    @OneToMany(mappedBy = "order", cascade = CascadeType.ALL, orphanRemoval = true)
    @Builder.Default
    private List<CopyrightTransfer> copyrightTransfers = new ArrayList<>();

    /** หลักฐานการโอนเงินให้ผู้ขาย — แยกรายผู้ขาย เพราะคำสั่งซื้อหนึ่งใบมีงานจากหลายร้านได้ */
    @OneToMany(mappedBy = "order", cascade = CascadeType.ALL, orphanRemoval = true)
    @Builder.Default
    private List<SellerPayout> sellerPayouts = new ArrayList<>();

    @PrePersist
    protected void onCreate() { this.orderDate = LocalDateTime.now(); }
}
