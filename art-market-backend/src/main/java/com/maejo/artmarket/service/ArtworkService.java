package com.maejo.artmarket.service;

import com.maejo.artmarket.dto.*;
import com.maejo.artmarket.entity.Address;
import com.maejo.artmarket.entity.Artwork;
import com.maejo.artmarket.entity.Seller;
import com.maejo.artmarket.enums.ArtworkStatus;
import com.maejo.artmarket.enums.PublishStatus;
import com.maejo.artmarket.repository.ArtworkRepository;
import com.maejo.artmarket.repository.CartItemRepository;
import com.maejo.artmarket.repository.OrderItemRepository;
import com.maejo.artmarket.repository.SellerRepository;
import com.maejo.artmarket.repository.UserRepository;
import com.maejo.artmarket.shipping.ShippingRateService;
import org.springframework.data.domain.Sort;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import java.util.ArrayList;
import java.util.List;
import java.util.Objects;
import java.util.Optional;

/**
 * ArtworkService — Business Logic ของยูสเคส:
 *   3.1.1  Search Art   3.1.2  View Art
 *   3.1.16 Add Art      3.1.17 List Art
 *   3.1.18 Edit Art     3.1.19 Publish Art
 */
@Service
@RequiredArgsConstructor
public class ArtworkService {

    private final ArtworkRepository   artworkRepository;
    private final SellerRepository    sellerRepository;
    private final OrderItemRepository orderItemRepository;
    private final CartItemRepository  cartItemRepository;
    private final UserRepository      userRepository;
    private final ShippingRateService shippingRateService;

    /** ค่าที่ไม่มีทางตรงกับข้อมูลจริง ใช้กันไม่ให้ IN () กลายเป็น list ว่างซึ่งทำให้ SQL พัง */
    private static final String NO_MATCH = "__NO_MATCH__";

    /**
     * คำนวณค่าส่ง "ประเมิน" ใหม่ทุกครั้งที่น้ำหนัก/ขนาด/ขนส่งเปลี่ยน
     * เก็บลง artwork.shippingCost ไว้เป็น cache สำหรับโชว์บนหน้ารายละเอียดงาน
     * ค่าส่งที่คิดเงินจริงคำนวณแยกตอนยืนยันคำสั่งซื้อ เมื่อรู้ที่อยู่ปลายทางแล้ว
     */
    private void refreshShippingEstimate(Artwork artwork) {
        artwork.setShippingCost(
                shippingRateService.estimate(
                        artwork.getShippingCompany(),
                        artwork.getWeight(),
                        artwork.getWidth(),
                        artwork.getLength(),
                        artwork.getHeight()
                ).getCost()
        );
    }

    // =========================================================================
    // ยูสเคส 3.1.1 Search Art
    // =========================================================================

    /**
     * แปลงค่า sort ที่รับมาเป็น Sort object
     *
     * ใช้ whitelist แทนการต่อสตริงเข้า ORDER BY ตรงๆ เพราะค่านี้มาจาก query string ของผู้ใช้
     * ถ้าต่อสตริงเองจะเปิดช่องให้ยิง JPQL injection เข้ามาได้
     */
    private Sort resolveSort(String sort) {
        String key = (sort == null) ? "" : sort;

        if ("price_asc".equals(key))  return Sort.by(Sort.Direction.ASC,  "price");
        if ("price_desc".equals(key)) return Sort.by(Sort.Direction.DESC, "price");
        if ("name".equals(key))       return Sort.by(Sort.Direction.ASC,  "artworkName");

        // ค่าเริ่มต้น = newest (และเป็นค่าที่ใช้เมื่อส่งค่าที่ไม่รู้จักมาด้วย)
        return Sort.by(Sort.Direction.DESC, "artworkId");
    }

    @Transactional(readOnly = true)
    public ApiResponse<List<ArtworkSummaryResponse>> searchArtworks(ArtworkSearchRequest req) {
        String keyword        = StringUtils.hasText(req.getKeyword())        ? req.getKeyword().trim()        : null;
        String artworkType    = StringUtils.hasText(req.getArtworkType())    ? req.getArtworkType().trim()    : null;
        String artworkStyle   = StringUtils.hasText(req.getArtworkStyle())   ? req.getArtworkStyle().trim()   : null;
        String artworkMediums = StringUtils.hasText(req.getArtworkMediums()) ? req.getArtworkMediums().trim() : null;

        List<Artwork> artworks = artworkRepository.searchArtworks(
                keyword, artworkType, artworkStyle, artworkMediums,
                req.getMinPrice(), req.getMaxPrice(),
                req.getMinSize(), req.getMaxSize(),
                resolveSort(req.getSort()));

        if (req.getLimit() != null && req.getLimit() > 0) {
            artworks = artworks.stream().limit(req.getLimit()).toList();
        }

        // "ค้นหาแล้วไม่เจอ" ไม่ใช่ error ของระบบ — เป็นผลลัพธ์ที่ถูกต้องคือ list ว่าง
        // เดิมคืน success=false ทำให้ frontend เด้ง toast error ทุกครั้งที่ผลการค้นหาว่าง
        // และแยกไม่ออกจากกรณี backend พังจริง (SRS Alternate Flow ให้ "แสดงข้อความ" ไม่ใช่ error)
        return ApiResponse.ok(
                artworks.isEmpty() ? "ไม่พบงานศิลปะที่ค้นหา" : "พบผลงาน " + artworks.size() + " รายการ",
                artworks.stream().map(ArtworkSummaryResponse::from).toList());
    }

    // =========================================================================
    // หน้าแรก — งานมาใหม่ล่าสุด
    // =========================================================================

    /**
     * งานที่เผยแพร่ล่าสุด เรียงจากใหม่ไปเก่า
     * เรียงด้วย artworkId แทน publishDate เพราะ publishDate เก็บเป็น String
     * (ผู้ขายกรอกเอง) เรียงตามตัวอักษรจึงไม่ตรงกับลำดับเวลาจริงเสมอไป
     */
    @Transactional(readOnly = true)
    public ApiResponse<List<ArtworkSummaryResponse>> listLatest(Integer limit) {
        ArtworkSearchRequest req = new ArtworkSearchRequest();
        req.setSort("newest");
        req.setLimit(limit != null && limit > 0 ? limit : 8);
        return searchArtworks(req);
    }

    // =========================================================================
    // หน้าแรก — แนะนำสำหรับคุณ
    // =========================================================================

    /**
     * แนะนำงานจากประเภทและสไตล์ที่ผู้ใช้เคยสั่งซื้อหรือใส่ตะกร้าไว้
     *
     * ระบบยังไม่มีตารางเก็บประวัติการดู จึงใช้ "สิ่งที่เคยสนใจจริง" (order + cart)
     * เป็นตัวแทนความชอบแทน ถ้ายังไม่มีประวัติเลยจะคืนงานล่าสุดให้แทน
     * เพื่อไม่ให้แถวนี้ว่างเปล่าสำหรับผู้ใช้ใหม่
     */
    @Transactional(readOnly = true)
    public ApiResponse<List<ArtworkSummaryResponse>> listRecommended(String username, Integer limit) {
        int max = (limit != null && limit > 0) ? limit : 8;

        if (username == null) {
            return listLatest(max);
        }

        Integer currentUserId = userRepository.findByUsername(username)
                .map(u -> u.getUserId())
                .orElse(null);
        if (currentUserId == null) {
            return listLatest(max);
        }

        // งานที่เคยซื้อ + งานที่อยู่ในตะกร้า = สิ่งที่ผู้ใช้สนใจ
        List<Integer> interestedIds = new ArrayList<>();
        interestedIds.addAll(orderItemRepository.findArtworkIdsPurchasedBy(username));
        interestedIds.addAll(cartItemRepository.findArtworkIdsInCartOf(username));

        if (interestedIds.isEmpty()) {
            return listLatest(max);
        }

        List<String> types  = artworkRepository.findTypesOfArtworks(interestedIds)
                .stream().filter(Objects::nonNull).toList();
        List<String> styles = artworkRepository.findStylesOfArtworks(interestedIds)
                .stream().filter(Objects::nonNull).toList();

        if (types.isEmpty() && styles.isEmpty()) {
            return listLatest(max);
        }

        // IN () ที่เป็น list ว่างทำให้ SQL พัง — ใส่ค่าที่ไม่มีทางตรงกันแทน
        List<String>  safeTypes  = types.isEmpty()  ? List.of(NO_MATCH) : types;
        List<String>  safeStyles = styles.isEmpty() ? List.of(NO_MATCH) : styles;

        List<Artwork> found = artworkRepository.findRecommended(
                safeTypes, safeStyles, interestedIds, currentUserId);

        if (found.isEmpty()) {
            return listLatest(max);
        }

        List<ArtworkSummaryResponse> result = found.stream()
                .limit(max)
                .map(ArtworkSummaryResponse::from)
                .toList();

        return ApiResponse.ok("แนะนำสำหรับคุณ " + result.size() + " รายการ", result);
    }

    // =========================================================================
    // หน้า Search — ตัวเลือกของตัวกรอง
    // =========================================================================

    /** อ่านค่าประเภท/สไตล์/เทคนิคที่มีอยู่จริงในฐานข้อมูล พร้อมจำนวนงานในแต่ละค่า */
    @Transactional(readOnly = true)
    public ApiResponse<ArtworkFacetsResponse> getFacets() {
        List<Object[]> priceRow = artworkRepository.priceRange();
        Double minPrice = null;
        Double maxPrice = null;
        if (!priceRow.isEmpty() && priceRow.get(0)[0] != null) {
            minPrice = (Double) priceRow.get(0)[0];
            maxPrice = (Double) priceRow.get(0)[1];
        }

        ArtworkFacetsResponse facets = ArtworkFacetsResponse.builder()
                .types(toFacetValues(artworkRepository.countByType()))
                .styles(toFacetValues(artworkRepository.countByStyle()))
                .mediums(toFacetValues(artworkRepository.countByMediums()))
                .minPrice(minPrice)
                .maxPrice(maxPrice)
                .build();

        return ApiResponse.ok("ดึงตัวเลือกตัวกรองสำเร็จ", facets);
    }

    private List<ArtworkFacetsResponse.FacetValue> toFacetValues(List<Object[]> rows) {
        return rows.stream()
                .filter(r -> r[0] != null && !((String) r[0]).isBlank())
                .map(r -> new ArtworkFacetsResponse.FacetValue((String) r[0], (Long) r[1]))
                .toList();
    }

    // =========================================================================
    // ยูสเคส 3.1.2 View Art
    // =========================================================================

    /**
     * ดูรายละเอียดงานศิลปะ
     *
     * @param currentUsername username ของคนที่ login อยู่ (null ได้ เพราะ endpoint นี้ public)
     *
     * เดิมใช้ findPublishedById() อย่างเดียว ทำให้ผู้ขาย "เปิดงาน DRAFT ของตัวเองมาแก้ไม่ได้"
     * (หน้า /seller/art/[id]/edit โหลดแล้วขึ้นไม่พบงานศิลปะ) เพราะงานที่ยังไม่ publish
     * ถูกกรองทิ้งตั้งแต่ระดับ query จึงเพิ่มทางลัดสำหรับเจ้าของงานเข้ามา
     */
    @Transactional(readOnly = true)
    public ApiResponse<ArtworkDetailResponse> getArtworkById(Integer artworkId, String currentUsername) {

        Optional<Artwork> published = artworkRepository.findPublishedById(artworkId);
        if (published.isPresent()) {
            return ApiResponse.ok("ดึงข้อมูลผลงานสำเร็จ", ArtworkDetailResponse.from(published.get()));
        }

        if (currentUsername != null) {
            Optional<Artwork> own = artworkRepository.findById(artworkId)
                    .filter(a -> a.getSeller().getUser().getUsername().equals(currentUsername));
            if (own.isPresent()) {
                return ApiResponse.ok("ดึงข้อมูลผลงานสำเร็จ", ArtworkDetailResponse.from(own.get()));
            }
        }

        return ApiResponse.error("ไม่พบงานศิลปะที่ต้องการ");
    }

    // =========================================================================
    // ยูสเคส 3.1.16 Add Art
    // =========================================================================

    @Transactional
    public ApiResponse<ArtworkDetailResponse> addArt(String username, AddArtRequest req) {

        Seller seller = sellerRepository.findByUser_Username(username).orElse(null);
        if (seller == null) return ApiResponse.error("ไม่พบข้อมูลผู้ขาย กรุณาสมัครเป็นผู้ขายก่อน");

        // ตรวจว่า Admin verify แล้วหรือยัง
        if (!seller.isVerified()) {
            return ApiResponse.error("บัญชีผู้ขายยังไม่ได้รับการตรวจสอบจากผู้ดูแลระบบ");
        }

        try {
            Artwork artwork = Artwork.builder()
                    .artworkName(req.getArtworkName())
                    .artworkImage(req.getArtworkImage())
                    .artworkType(req.getArtworkType())
                    .artworkStyle(req.getArtworkStyle())
                    .artworkMediums(req.getArtworkMediums())
                    .artworkMaterial(req.getArtworkMaterial())
                    .artworkSize(req.getArtworkSize())
                    .description(req.getDescription())
                    .price(req.getPrice())
                    .publishDate(req.getPublishDate())
                    .copyrightPrice(req.getCopyrightPrice())
                    .shippingCompany(req.getShippingCompany())
                    .weight(req.getWeight())
                    .width(req.getWidth())
                    .length(req.getLength())
                    .height(req.getHeight())
                    .publishStatus(PublishStatus.DRAFT)      // ต้อง Publish แยก
                    .artworkStatus(ArtworkStatus.AVAILABLE)  // พร้อมขายจากวันแรก
                    .seller(seller)
                    .build();

            refreshShippingEstimate(artwork);
            artworkRepository.save(artwork);
            return ApiResponse.ok("บันทึกงานศิลปะสำเร็จ", ArtworkDetailResponse.from(artwork));

        } catch (Exception e) {
            // Alternate Flow 5.1.1
            return ApiResponse.error("ไม่สามารถบันทึกงานศิลปะได้ กรุณาลองใหม่อีกครั้ง");
        }
    }

    // =========================================================================
    // ยูสเคส 3.1.17 List Art
    // =========================================================================

    @Transactional(readOnly = true)
    public ApiResponse<List<ArtworkSummaryResponse>> listMyArt(String username) {

        Seller seller = sellerRepository.findByUser_Username(username).orElse(null);
        if (seller == null) return ApiResponse.error("ไม่พบข้อมูลผู้ขาย");

        List<Artwork> artworks = artworkRepository.findBySeller_SellerId(seller.getSellerId());

        // Alternate Flow 3.1 — "ยังไม่มีรายการงานศิลปะ"
        // คืน success=true พร้อม list ว่าง เพื่อให้ frontend แสดง empty state ได้
        // แทนที่จะเด้ง error ทุกครั้งที่ผู้ขายยังไม่มีผลงาน
        return ApiResponse.ok(
                artworks.isEmpty() ? "ยังไม่มีรายการงานศิลปะ" : "พบ " + artworks.size() + " รายการ",
                artworks.stream().map(ArtworkSummaryResponse::from).toList());
    }

    // =========================================================================
    // ยูสเคส 3.1.18 Edit Art
    // =========================================================================

    @Transactional
    public ApiResponse<ArtworkDetailResponse> editArt(String username, Integer artworkId, EditArtRequest req) {

        Seller seller = sellerRepository.findByUser_Username(username).orElse(null);
        if (seller == null) return ApiResponse.error("ไม่พบข้อมูลผู้ขาย");

        Optional<Artwork> artworkOpt = artworkRepository.findById(artworkId);

        // Alternate Flow 4.1.1 — "ไม่พบข้อมูลงานศิลปะ"
        if (artworkOpt.isEmpty()) return ApiResponse.error("ไม่พบข้อมูลงานศิลปะ");

        Artwork artwork = artworkOpt.get();

        // Security check — ต้องเป็นงานของตัวเอง
        if (!artwork.getSeller().getSellerId().equals(seller.getSellerId())) {
            return ApiResponse.error("ไม่มีสิทธิ์แก้ไขงานศิลปะชิ้นนี้");
        }

        // Basic Flow ข้อ 9.1 — partial update
        if (StringUtils.hasText(req.getArtworkName()))      artwork.setArtworkName(req.getArtworkName());
        if (StringUtils.hasText(req.getArtworkImage()))     artwork.setArtworkImage(req.getArtworkImage());
        if (StringUtils.hasText(req.getArtworkType()))      artwork.setArtworkType(req.getArtworkType());
        if (StringUtils.hasText(req.getArtworkStyle()))     artwork.setArtworkStyle(req.getArtworkStyle());
        if (StringUtils.hasText(req.getArtworkMediums()))   artwork.setArtworkMediums(req.getArtworkMediums());
        if (StringUtils.hasText(req.getArtworkMaterial()))  artwork.setArtworkMaterial(req.getArtworkMaterial());
        if (req.getArtworkSize()    != null) artwork.setArtworkSize(req.getArtworkSize());
        if (StringUtils.hasText(req.getDescription()))      artwork.setDescription(req.getDescription());
        if (req.getPrice()          != null) artwork.setPrice(req.getPrice());
        if (req.getCopyrightPrice() != null) artwork.setCopyrightPrice(req.getCopyrightPrice());
        if (StringUtils.hasText(req.getPublishDate()))      artwork.setPublishDate(req.getPublishDate());
        if (req.getShippingCompany() != null) artwork.setShippingCompany(req.getShippingCompany());
        if (req.getWeight() != null) artwork.setWeight(req.getWeight());
        if (req.getWidth()  != null) artwork.setWidth(req.getWidth());
        if (req.getLength() != null) artwork.setLength(req.getLength());
        if (req.getHeight() != null) artwork.setHeight(req.getHeight());

        // ค่าส่งประเมินต้องขยับตามทุกครั้ง ไม่งั้นผู้ขายแก้น้ำหนักแล้วราคายังค้างของเดิม
        refreshShippingEstimate(artwork);

        try {
            artworkRepository.save(artwork);
            return ApiResponse.ok("แก้ไขข้อมูลงานศิลปะสำเร็จ", ArtworkDetailResponse.from(artwork));
        } catch (Exception e) {
            // Alternate Flow 9.1.1
            return ApiResponse.error("ไม่สามารถแก้ไขข้อมูลได้ กรุณาลองใหม่อีกครั้ง");
        }
    }

    // =========================================================================
    // ยูสเคส 3.1.19 Publish Art
    // =========================================================================

    @Transactional
    public ApiResponse<ArtworkDetailResponse> publishArt(String username, Integer artworkId) {

        Seller seller = sellerRepository.findByUser_Username(username).orElse(null);
        if (seller == null) return ApiResponse.error("ไม่พบข้อมูลผู้ขาย");

        Optional<Artwork> artworkOpt = artworkRepository.findById(artworkId);

        // Alternate Flow 4.1 — "ข้อมูลงานศิลปะไม่ถูกต้อง"
        if (artworkOpt.isEmpty()) {
            return ApiResponse.error("ข้อมูลงานศิลปะไม่ถูกต้อง กรุณาลองใหม่อีกครั้ง");
        }

        Artwork artwork = artworkOpt.get();

        if (!artwork.getSeller().getSellerId().equals(seller.getSellerId())) {
            return ApiResponse.error("ไม่มีสิทธิ์เผยแพร่งานศิลปะชิ้นนี้");
        }

        if (artwork.getPublishStatus() == PublishStatus.PUBLISHED) {
            return ApiResponse.error("งานศิลปะนี้ถูกเผยแพร่แล้ว");
        }

        /*
         * ต้องมีที่อยู่ต้นทางก่อน ไม่งั้นคิดค่าจัดส่งไม่ได้
         *
         * ฝั่งผู้ซื้อบังคับให้เลือกที่อยู่ปลายทางก่อนยืนยันคำสั่งซื้ออยู่แล้ว
         * ฝั่งผู้ขายก็ต้องบังคับเหมือนกัน เพราะค่าส่งใช้ "ทั้งสองปลาย" ในการคำนวณ
         * ถ้าปล่อยผ่าน ระบบจะเงียบๆ ใช้เรทข้ามจังหวัดแทน แล้วผู้ขายไม่มีทางรู้เลย
         * ว่าค่าส่งที่ลูกค้าเห็นสูงกว่าความเป็นจริงเพราะตัวเองยังไม่ได้กรอกที่อยู่
         */
        boolean hasPickupAddress = seller.getUser().getAddresses().stream()
                .anyMatch(Address::isPickupAddress);
        if (!hasPickupAddress) {
            return ApiResponse.error(
                    "กรุณาตั้งที่อยู่ต้นทางสำหรับจัดส่งในหน้าโปรไฟล์ก่อนเผยแพร่ผลงาน "
                            + "ระบบใช้จังหวัดต้นทางคำนวณค่าจัดส่ง");
        }

        try {
            // Basic Flow ข้อ 6.1 — DRAFT → PUBLISHED
            artwork.setPublishStatus(PublishStatus.PUBLISHED);
            artworkRepository.save(artwork);
            return ApiResponse.ok("เผยแพร่งานศิลปะสำเร็จ", ArtworkDetailResponse.from(artwork));
        } catch (Exception e) {
            // Alternate Flow 6.1.1
            return ApiResponse.error("ไม่สามารถแก้ไขสถานะได้ กรุณาลองใหม่อีกครั้ง");
        }
    }

    // =========================================================================
    // ยกเลิกการเผยแพร่ — PUBLISHED → DRAFT (ตรงข้ามกับ Publish Art)
    //
    // ไม่มีในยูสเคสของ SRS แต่ผู้ขายจำเป็นต้องมี ไม่งั้นงานที่เผยแพร่พลาด
    // หรืออยากถอนออกชั่วคราว (แก้ราคา, งานเสียหาย, ยังไม่พร้อมส่ง)
    // จะเอาลงไม่ได้เลยตลอดไป
    // =========================================================================

    @Transactional
    public ApiResponse<ArtworkDetailResponse> unpublishArt(String username, Integer artworkId) {

        Seller seller = sellerRepository.findByUser_Username(username).orElse(null);
        if (seller == null) return ApiResponse.error("ไม่พบข้อมูลผู้ขาย");

        Artwork artwork = artworkRepository.findById(artworkId).orElse(null);
        if (artwork == null) {
            return ApiResponse.error("ข้อมูลงานศิลปะไม่ถูกต้อง กรุณาลองใหม่อีกครั้ง");
        }

        if (!artwork.getSeller().getSellerId().equals(seller.getSellerId())) {
            return ApiResponse.error("ไม่มีสิทธิ์แก้ไขงานศิลปะชิ้นนี้");
        }

        if (artwork.getPublishStatus() == PublishStatus.DRAFT) {
            return ApiResponse.error("งานศิลปะนี้เป็นฉบับร่างอยู่แล้ว");
        }

        // กันไม่ให้ถอนงานที่มีคนสั่งซื้อไปแล้ว
        // ผู้ซื้อยังต้องเปิดดูรายละเอียดงานจากหน้าคำสั่งซื้อและใบเสนอราคาได้
        // ถ้าถอนออก งานจะหายจากทุกหน้าที่เป็นสาธารณะ แล้วคำสั่งซื้อจะอ้างของที่มองไม่เห็น
        if (artwork.getArtworkStatus() != ArtworkStatus.AVAILABLE) {
            return ApiResponse.error("ไม่สามารถยกเลิกการเผยแพร่ได้ เพราะงานชิ้นนี้อยู่ในคำสั่งซื้อแล้ว");
        }

        try {
            artwork.setPublishStatus(PublishStatus.DRAFT);
            artworkRepository.save(artwork);
            return ApiResponse.ok("ยกเลิกการเผยแพร่สำเร็จ งานกลับไปเป็นฉบับร่าง",
                    ArtworkDetailResponse.from(artwork));
        } catch (Exception e) {
            return ApiResponse.error("ไม่สามารถแก้ไขสถานะได้ กรุณาลองใหม่อีกครั้ง");
        }
    }
}
