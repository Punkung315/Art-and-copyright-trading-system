package com.maejo.artmarket.entity;

import com.maejo.artmarket.enums.ArtworkStatus;
import com.maejo.artmarket.enums.PublishStatus;
import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "artwork")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Artwork {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer artworkId;
    @Column(nullable = false)
    private String artworkName;
    // รูปงานศิลปะเก็บเป็น data URL (base64) ได้ ซึ่งยาวเกิน VARCHAR(255) มาก
    // ถ้าไม่ระบุ columnDefinition Hibernate จะสร้างเป็น varchar(255) แล้ว insert พังทันที
    @Column(columnDefinition = "LONGTEXT")
    private String artworkImage;
    private String artworkType;
    private String artworkStyle;
    private String artworkMediums;
    private String artworkMaterial;
    private Double artworkSize;

    @Column(length = 1000)
    private String description;

    @Column(nullable = false)
    private Double price;
    private Double copyrightPrice;
    private Double shippingCost;
    private Double weight;
    private Double width;
    private Double length;
    private Double height;

    @Column(nullable = false)
    private String publishDate;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private ArtworkStatus artworkStatus;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private PublishStatus publishStatus;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "seller_id", nullable = false)
    private Seller seller;
}
