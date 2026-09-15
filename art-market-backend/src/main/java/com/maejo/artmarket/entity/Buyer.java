package com.maejo.artmarket.entity;

import jakarta.persistence.*;
import lombok.*;
import java.util.ArrayList;
import java.util.List;

/**
 * ผู้ซื้อ — ใช้คีย์ร่วมกับ users (shared primary key)
 *
 * buyer.buyer_id เป็นทั้ง PK และ FK ชี้ไป users.user_id พร้อมกัน
 * แปลว่า buyerId กับ userId ของคนคนเดียวกัน "เป็นเลขเดียวกันเสมอ" ตามนิยาม
 * ไม่ใช่แค่บังเอิญตรงกันเพราะ AUTO_INCREMENT เดินคู่กันมา
 *
 * ทำไมต้องเปลี่ยน: เดิมตารางนี้มี buyer_id ของตัวเองที่ generate แยก แล้วมี
 * user_id เป็นคอลัมน์ FK ต่างหาก ผลคือมีเลขสองชุดที่หมายถึงคนคนเดียวกัน
 * โค้ดฝั่งหน้าเว็บรู้จักผู้ใช้ผ่าน userId อย่างเดียว เวลาเทียบว่า
 * "คำสั่งซื้อ/สัญญาใบนี้ของฉันไหม" จึงเทียบ userId กับ buyerId แล้ว
 * ไม่มีวันตรงกัน — ปุ่มที่ควรขึ้นก็ไม่ขึ้น โดยไม่มี error ให้เห็นเลยสักนิด
 * (เคยแก้ด้วยการเพิ่ม buyerUserId/sellerUserId ลง DTO ถึง 7 ตัว
 *  ซึ่งเป็นการปะรอยรั่ว ไม่ได้แก้ที่ต้นเหตุว่าทำไมถึงมีเลขสองชุด)
 *
 * ข้อควรระวังตอนสร้าง: ไม่มี @GeneratedValue แล้ว id มาจาก user ที่ผูกไว้
 * จึงต้อง save() ตัว User ให้มี id ก่อนเสมอ แล้วค่อยสร้าง Buyer
 */
@Entity
@Table(name = "buyer")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Buyer {

    @Id
    private Integer buyerId;

    @MapsId
    @OneToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "buyer_id")
    private User user;

    @OneToMany(mappedBy = "buyer", cascade = CascadeType.ALL, orphanRemoval = true)
    @Builder.Default
    private List<Orders> orders = new ArrayList<>();

    @OneToMany(mappedBy = "buyer", cascade = CascadeType.ALL, orphanRemoval = true)
    @Builder.Default
    private List<CopyrightTransfer> copyrightTransfers = new ArrayList<>();
}
