-- =============================================================================
--  artmarket_db — ข้อมูลตัวอย่างสำหรับทดสอบระบบซื้อขายงานศิลปะ (Artmara)
--  Maejo University — Information Technology 2026
-- =============================================================================
--
--  วิธีใช้
--  ------
--  1. รัน Spring Boot หนึ่งครั้งก่อน (ddl-auto: update จะสร้างตารางให้ครบเอง)
--     แล้วปิดแอปลง
--  2. นำเข้าไฟล์นี้:
--        mysql -u root -p artmarket_db < artmarket-seed.sql
--     หรือใน MySQL Workbench: File > Open SQL Script > Execute
--  3. เปิดแอปขึ้นมาใหม่
--
--  หมายเหตุสำคัญ
--  -------------
--  * รหัสผ่านทุกบัญชีคือ  password1   (ยกเว้น admin ที่เป็น Admin1234!)
--    เก็บเป็น BCrypt hash เพราะ Spring Security เทียบด้วย BCryptPasswordEncoder
--    ถ้าใส่รหัสผ่านเป็นข้อความธรรมดาจะ login ไม่ได้เด็ดขาด
--  * สคริปต์นี้ "ลบข้อมูลเดิมทั้งหมด" ก่อนใส่ชุดใหม่ รันซ้ำได้เรื่อยๆ
--    (ไม่ลบโครงสร้างตาราง — แค่ล้างข้อมูล)
--  * ตั้ง AUTO_INCREMENT ใหม่ทุกตาราง เพื่อให้ id ตรงกับที่อ้างถึงในสคริปต์เสมอ
--
--  ชุดข้อมูลนี้ครอบคลุมทุกยูสเคสที่ต้องทดสอบ
--  -----------------------------------------
--   ผู้ใช้      punchapong (ผู้ซื้อ) | nichaart, somsakart (ผู้ขายอนุมัติแล้ว)
--               pendingartist (ผู้ขายรออนุมัติ — ใช้ทดสอบ Verify Seller)
--   งานศิลปะ    9 ชิ้น (8 เผยแพร่แล้ว + 1 ฉบับร่างไว้ทดสอบ Publish Art)
--   ตะกร้า      2 ชิ้นค้างอยู่ในตะกร้าของ punchapong (ทดสอบ List Cart / Confirm Order)
--   คำสั่งซื้อ   5 รายการ ครอบคลุมทุกสถานะตั้งแต่รอผู้ขายยืนยันจนถึงจัดส่งแล้ว
--   ลิขสิทธิ์    3 สัญญา (รอผู้ขายตอบ / ผู้ขายรับแล้วรอเซ็น / เสร็จสมบูรณ์)
-- =============================================================================

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

-- -----------------------------------------------------------------------------
-- ล้างข้อมูลเดิม (เรียงจากตารางลูกไปตารางแม่)
-- -----------------------------------------------------------------------------
DELETE FROM copyright_transfer;
DELETE FROM payment;
DELETE FROM order_item;
DELETE FROM orders;
DELETE FROM cart_item;
DELETE FROM artwork;
DELETE FROM seller;
DELETE FROM buyer;
DELETE FROM address;
DELETE FROM users;
DELETE FROM admin;

ALTER TABLE copyright_transfer AUTO_INCREMENT = 1;
ALTER TABLE payment            AUTO_INCREMENT = 1;
ALTER TABLE order_item         AUTO_INCREMENT = 1;
ALTER TABLE orders             AUTO_INCREMENT = 1;
ALTER TABLE cart_item          AUTO_INCREMENT = 1;
ALTER TABLE artwork            AUTO_INCREMENT = 1;
ALTER TABLE seller             AUTO_INCREMENT = 1;
ALTER TABLE buyer              AUTO_INCREMENT = 1;
ALTER TABLE address            AUTO_INCREMENT = 1;
ALTER TABLE users              AUTO_INCREMENT = 1;
ALTER TABLE admin              AUTO_INCREMENT = 1;

-- =============================================================================
-- 1. ผู้ดูแลระบบ
--    username: admin   password: Admin1234!
--    (DataSeeder.java จะสร้างให้เองถ้าตารางว่าง — ใส่ไว้ตรงนี้เผื่อกรณีปิด seeder)
-- =============================================================================
INSERT INTO admin (user_id, username, password) VALUES
(1, 'admin', '$2a$10$0Vt/BG6Ez1FRXedYRdwwh.CDbNgvw9Mr0A3aRQH7DKKiRJzxx4MlO');

-- =============================================================================
-- 2. ผู้ใช้งาน — รหัสผ่านทุกคนคือ password1
-- =============================================================================
INSERT INTO users (user_id, username, password, email, full_name, national_no, phone_number, profile_image, role, created_at) VALUES
(1, 'punchapong',    '$2a$10$3m/A.tSjlvR3QGDcFY8lq.mf9c//K80uJZBNFak3fiu3ecUQYlEbu', 'punchapong@example.com',    'Punchapong Sukjai',  '1509900123456', '0812345671', NULL, 'BUYER',  '2026-06-01 09:00:00'),
(2, 'nichaart',      '$2a$10$3m/A.tSjlvR3QGDcFY8lq.mf9c//K80uJZBNFak3fiu3ecUQYlEbu', 'nicha@example.com',         'Nicha Wongsiri',     '1509900223456', '0812345672', NULL, 'SELLER', '2026-06-02 09:00:00'),
(3, 'pendingartist', '$2a$10$3m/A.tSjlvR3QGDcFY8lq.mf9c//K80uJZBNFak3fiu3ecUQYlEbu', 'pending@example.com',       'Kittipong Meesuk',   '1509900323456', '0812345673', NULL, 'SELLER', '2026-08-10 09:00:00'),
(4, 'somsakart',     '$2a$10$3m/A.tSjlvR3QGDcFY8lq.mf9c//K80uJZBNFak3fiu3ecUQYlEbu', 'somsak@example.com',        'Somsak Chaiyo',      '1509900423456', '0812345674', NULL, 'SELLER', '2026-06-05 09:00:00'),
(5, 'buyersuda',     '$2a$10$3m/A.tSjlvR3QGDcFY8lq.mf9c//K80uJZBNFak3fiu3ecUQYlEbu', 'suda@example.com',          'Suda Pimchan',       '1509900523456', '0812345675', NULL, 'BUYER',  '2026-06-08 09:00:00');

-- =============================================================================
-- 3. ที่อยู่
--    ใบเสนอราคา (View Quotation) หยิบที่อยู่แถวแรกของผู้ซื้อและผู้ขายมาแสดง
--    ถ้าไม่มีข้อมูลตรงนี้ ช่องที่อยู่ในใบเสนอราคาจะว่างเปล่า
-- =============================================================================
INSERT INTO address (address_id, house_no, village_no, thoroughfare, subdistrict, district, province, postal_code, user_id) VALUES
(1, '99/1',  '4', 'ถนนเชียงใหม่-พร้าว', 'หนองหาร',   'สันทราย',   'เชียงใหม่', '50290', 1),
(2, '128',   '2', 'ถนนนิมมานเหมินท์',   'สุเทพ',      'เมือง',      'เชียงใหม่', '50200', 2),
(3, '45/7',  '1', 'ถนนช้างคลาน',        'ช้างคลาน',   'เมือง',      'เชียงใหม่', '50100', 3),
(4, '7',     '9', 'ถนนมหิดล',           'หายยา',      'เมือง',      'เชียงใหม่', '50100', 4),
(5, '210/3', '6', 'ถนนสุขุมวิท',        'คลองตัน',    'คลองเตย',    'กรุงเทพมหานคร', '10110', 5);

-- =============================================================================
-- 4. ผู้ซื้อ
--    ผู้ขายก็มี record Buyer ด้วย เพราะระบบเปิดให้ผู้ขายซื้องานของคนอื่นได้
--    (AuthService.registerBuyer สร้าง Buyer ให้ทุกคนตั้งแต่ตอนสมัคร)
-- =============================================================================
INSERT INTO buyer (buyer_id, user_id) VALUES
(1, 1),
(2, 2),
(3, 3),
(4, 4),
(5, 5);

-- =============================================================================
-- 5. ผู้ขาย
--    seller_id 2 (pendingartist) ตั้ง verified = 0 ไว้ทดสอบยูสเคส Verify Seller
-- =============================================================================
INSERT INTO seller (seller_id, user_id, verified) VALUES
(1, 2, 1),
(2, 3, 0),
(3, 4, 1);

-- =============================================================================
-- 6. งานศิลปะ
--    artwork_status : AVAILABLE (ว่าง) | RESERVED (อยู่ในคำสั่งซื้อ) | SOLD (ขายแล้ว)
--    publish_status : DRAFT (ฉบับร่าง) | PUBLISHED (เผยแพร่แล้ว)
--    artwork_id 9 เป็น DRAFT ไว้ทดสอบยูสเคส Publish Art
-- =============================================================================
INSERT INTO artwork
(artwork_id, artwork_name, artwork_image, artwork_type, artwork_style, artwork_mediums, artwork_material, artwork_size, description, price, copyright_price, shipping_cost, weight, width, length, height, publish_date, artwork_status, publish_status, seller_id) VALUES
(1, 'ทุ่งข้าวยามเช้า',      NULL, 'จิตรกรรม',   'อิมเพรสชันนิสม์', 'สีน้ำมัน',   'ผ้าใบ',      60,  'ภาพทุ่งนาเชียงใหม่ยามแสงแรก สีอบอุ่น เก็บรายละเอียดหมอกบางบนยอดข้าว', 12000, 25000, 300, 2.5, 60, 5,  80, '2026-06-10', 'AVAILABLE', 'PUBLISHED', 1),
(2, 'สายน้ำปิงยามค่ำ',     NULL, 'จิตรกรรม',   'เรียลลิสม์',      'สีอะคริลิก', 'ผ้าใบ',      50,  'แสงไฟริมแม่น้ำปิงสะท้อนผิวน้ำ โทนน้ำเงินเข้มตัดกับแสงส้ม',          9500,  18000, 300, 2.0, 50, 5,  70, '2026-06-12', 'AVAILABLE', 'PUBLISHED', 1),
(3, 'ดอกไม้ในความเงียบ',   NULL, 'ภาพวาด',     'มินิมอล',         'สีน้ำ',      'กระดาษ',     40,  'ภาพดอกไม้เดี่ยวบนพื้นขาว เว้นพื้นที่ว่างให้สายตาได้พัก',              4500,  9000,  150, 0.5, 40, 3,  55, '2026-06-15', 'AVAILABLE', 'PUBLISHED', 1),
(4, 'เงาเมืองเก่า',        NULL, 'ภาพถ่าย',    'ขาวดำ',           'ภาพพิมพ์',   'กระดาษอัด',  45,  'ภาพถ่ายกำแพงเมืองเชียงใหม่ ขาวดำ คอนทราสต์สูง',                     6800,  12000, 200, 0.8, 45, 3,  60, '2026-06-18', 'RESERVED',  'PUBLISHED', 1),
(5, 'ป่าฝนภาคเหนือ',       NULL, 'จิตรกรรม',   'เอ็กซ์เพรสชันนิสม์','สีน้ำมัน',  'ผ้าใบ',      70,  'พู่กันหนักแน่น สื่ออารมณ์ความชุ่มชื้นของป่าดิบเขา',                  15500, 30000, 400, 3.2, 70, 6,  90, '2026-06-20', 'RESERVED',  'PUBLISHED', 3),
(6, 'ประติมากรรมสายลม',    NULL, 'ประติมากรรม','นามธรรม',         'งานหล่อ',    'ทองเหลือง',  35,  'รูปทรงบิดเกลียวสื่อการเคลื่อนที่ของลม ผิวรมดำ',                     22000, 45000, 600, 6.0, 35, 35, 60, '2026-06-22', 'RESERVED',  'PUBLISHED', 3),
(7, 'บทสนทนาของสี',        NULL, 'จิตรกรรม',   'นามธรรม',         'สีอะคริลิก', 'ผ้าใบ',      55,  'การปะทะกันของแม่สีสามสีบนพื้นเทา',                                   8800,  16000, 300, 2.1, 55, 5,  75, '2026-06-25', 'AVAILABLE', 'PUBLISHED', 3),
(8, 'ภาพเหมือนของยาย',     NULL, 'ภาพวาด',     'เรียลลิสม์',      'ดินสอ',      'กระดาษ',     30,  'ภาพเหมือนดินสอ เก็บรายละเอียดริ้วรอยและแววตา',                       5200,  NULL,  150, 0.4, 30, 3,  42, '2026-06-28', 'AVAILABLE', 'PUBLISHED', 1),
(9, 'ฉบับร่าง — ขุนเขายามหลับ', NULL, 'จิตรกรรม','อิมเพรสชันนิสม์','สีน้ำมัน',  'ผ้าใบ',      65,  'งานที่ยังไม่เผยแพร่ ใช้ทดสอบยูสเคส Publish Art',                     13500, 26000, 350, 2.8, 65, 5,  85, '2026-08-15', 'AVAILABLE', 'DRAFT',     1);

-- =============================================================================
-- 7. ตะกร้าสินค้าของ punchapong (buyer_id = 1)
--    ใช้ทดสอบยูสเคส List Cart / Remove Item / Confirm Order
-- =============================================================================
INSERT INTO cart_item (cart_item_id, add_date, price_at_add, artwork_id, buyer_id) VALUES
(1, '2026-08-18 10:15:00', 12000, 1, 1),
(2, '2026-08-18 10:16:30', 4500,  3, 1);

-- =============================================================================
-- 8. คำสั่งซื้อ
--
--    order 1  รอผู้ขายยืนยันความพร้อม   → ทดสอบ Confirm Availability (ผู้ขาย nichaart)
--    order 2  ยืนยันแล้ว รอชำระเงิน      → ทดสอบ Make Payment (ผู้ซื้อ punchapong)
--    order 3  อัปสลิปแล้ว รอ Admin ตรวจ  → ทดสอบ Confirm Payment (admin)
--    order 4  ชำระเงินแล้ว กำลังจัดส่ง    → ทดสอบ Update Order + สัญญาลิขสิทธิ์
--    order 5  เสร็จสมบูรณ์ + ผู้ขายรับสัญญาแล้ว → ทดสอบ Sign Agreement (ผู้ซื้อ buyersuda)
-- =============================================================================
INSERT INTO orders (order_id, confirm_date_time, order_date, order_status, buyer_id) VALUES
(1, '2026-08-17 14:05:00', '2026-08-17 14:05:00', 'PENDING',   1),
(2, '2026-08-16 11:20:00', '2026-08-16 11:20:00', 'PENDING',   1),
(3, '2026-08-15 16:40:00', '2026-08-15 16:40:00', 'PENDING',   1),
(4, '2026-08-12 09:30:00', '2026-08-12 09:30:00', 'COMPLETED', 1),
(5, '2026-08-05 13:10:00', '2026-08-05 13:10:00', 'COMPLETED', 5);

-- availability_status : PENDING_CONFIRMATION | AVAILABLE | UNAVAILABLE
-- shipping_status     : NULL | PREPARING | SHIPPED | DELIVERED
INSERT INTO order_item (order_item_id, availability_status, shipping_status, price, artwork_id, order_id) VALUES
(1, 'PENDING_CONFIRMATION', NULL,        6800,  4, 1),
(2, 'AVAILABLE',            NULL,        8800,  7, 2),
(3, 'AVAILABLE',            NULL,        15500, 5, 3),
(4, 'AVAILABLE',            'SHIPPED',   22000, 6, 4),
(5, 'AVAILABLE',            'DELIVERED', 9500,  2, 5);

-- =============================================================================
-- 9. การชำระเงิน
--    transfer_status : AWAITING_PROOF | PENDING_CONFIRMATION | COMPLETED | REJECTED
--    grand_total = ราคางาน + ค่าจัดส่ง (ตรงกับที่ PaymentService.buildPreview คำนวณ)
-- =============================================================================
INSERT INTO payment (payment_id, grand_total, shipping_cost, slip_transfer, transfer_status, order_id) VALUES
(1, 15900, 400, 'slip_order3.jpg', 'PENDING_CONFIRMATION', 3),
(2, 22600, 600, 'slip_order4.jpg', 'COMPLETED',            4),
(3, 9800,  300, 'slip_order5.jpg', 'COMPLETED',            5);

-- =============================================================================
-- 10. สัญญาโอนลิขสิทธิ์
--     transfer_status : PENDING (รอผู้ขายตอบ) | SIGNED (ผู้ขายรับแล้ว รอผู้ซื้อลงนาม)
--                       COMPLETED (ลงนามครบ) | REJECTED (ผู้ขายปฏิเสธ)
-- =============================================================================
INSERT INTO copyright_transfer
(copyright_id, document_file, transfer_date, transfer_status, seller_signature, full_name, house_no, village_no, thoroughfare, subdistrict, district, province, postal_code, national_no, seller_response_detail, buyer_id, seller_id, order_id) VALUES
(1, NULL,                  '2026-08-13 10:00:00', 'PENDING',   NULL, 'Punchapong Sukjai', '99/1',  '4', 'ถนนเชียงใหม่-พร้าว', 'หนองหาร', 'สันทราย', 'เชียงใหม่',      '50290', '1509900123456', NULL,                                       1, 3, 4),
(2, NULL,                  '2026-08-06 09:00:00', 'SIGNED',    NULL, 'Suda Pimchan',      '210/3', '6', 'ถนนสุขุมวิท',        'คลองตัน', 'คลองเตย', 'กรุงเทพมหานคร', '10110', '1509900523456', 'ยินดีโอนลิขสิทธิ์ตามเงื่อนไขที่เสนอมา',      5, 1, 5),
(3, 'contract_signed.pdf', '2026-07-20 15:30:00', 'COMPLETED', NULL, 'Punchapong Sukjai', '99/1',  '4', 'ถนนเชียงใหม่-พร้าว', 'หนองหาร', 'สันทราย', 'เชียงใหม่',      '50290', '1509900123456', 'ตกลงโอนลิขสิทธิ์เต็มจำนวน',                  1, 1, 2);

SET FOREIGN_KEY_CHECKS = 1;

-- =============================================================================
-- ตรวจผลหลังนำเข้า
-- =============================================================================
SELECT 'admin'              AS table_name, COUNT(*) AS rows_inserted FROM admin
UNION ALL SELECT 'users',              COUNT(*) FROM users
UNION ALL SELECT 'address',            COUNT(*) FROM address
UNION ALL SELECT 'buyer',              COUNT(*) FROM buyer
UNION ALL SELECT 'seller',             COUNT(*) FROM seller
UNION ALL SELECT 'artwork',            COUNT(*) FROM artwork
UNION ALL SELECT 'cart_item',          COUNT(*) FROM cart_item
UNION ALL SELECT 'orders',             COUNT(*) FROM orders
UNION ALL SELECT 'order_item',         COUNT(*) FROM order_item
UNION ALL SELECT 'payment',            COUNT(*) FROM payment
UNION ALL SELECT 'copyright_transfer', COUNT(*) FROM copyright_transfer;
