package com.maejo.artmarket.service;

import com.maejo.artmarket.dto.*;
import com.maejo.artmarket.entity.Artwork;
import com.maejo.artmarket.entity.Seller;
import com.maejo.artmarket.enums.ArtworkStatus;
import com.maejo.artmarket.enums.PublishStatus;
import com.maejo.artmarket.repository.ArtworkRepository;
import com.maejo.artmarket.repository.SellerRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import java.util.List;
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

    private final ArtworkRepository artworkRepository;
    private final SellerRepository  sellerRepository;

    // =========================================================================
    // ยูสเคส 3.1.1 Search Art
    // =========================================================================

    @Transactional(readOnly = true)
    public ApiResponse<List<ArtworkSummaryResponse>> searchArtworks(ArtworkSearchRequest req) {
        String keyword      = StringUtils.hasText(req.getKeyword())      ? req.getKeyword().trim()      : null;
        String artworkType  = StringUtils.hasText(req.getArtworkType())  ? req.getArtworkType().trim()  : null;
        String artworkStyle = StringUtils.hasText(req.getArtworkStyle()) ? req.getArtworkStyle().trim() : null;

        List<Artwork> artworks = artworkRepository.searchArtworks(
                keyword, artworkType, artworkStyle, req.getMinPrice(), req.getMaxPrice());

        if (artworks.isEmpty()) return ApiResponse.error("ไม่พบงานศิลปะที่ค้นหา");
        return ApiResponse.ok("พบผลงาน " + artworks.size() + " รายการ",
                artworks.stream().map(ArtworkSummaryResponse::from).toList());
    }

    // =========================================================================
    // ยูสเคส 3.1.2 View Art
    // =========================================================================

    @Transactional(readOnly = true)
    public ApiResponse<ArtworkDetailResponse> getArtworkById(Integer artworkId) {
        return artworkRepository.findPublishedById(artworkId)
                .map(a -> ApiResponse.ok("ดึงข้อมูลผลงานสำเร็จ", ArtworkDetailResponse.from(a)))
                .orElse(ApiResponse.error("ไม่พบงานศิลปะที่ต้องการ"));
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
                    .shippingCost(req.getShippingCost())
                    .weight(req.getWeight())
                    .width(req.getWidth())
                    .length(req.getLength())
                    .height(req.getHeight())
                    .publishStatus(PublishStatus.DRAFT)      // ต้อง Publish แยก
                    .artworkStatus(ArtworkStatus.AVAILABLE)  // พร้อมขายจากวันแรก
                    .seller(seller)
                    .build();

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
        if (artworks.isEmpty()) return ApiResponse.error("ยังไม่มีรายการงานศิลปะ");

        return ApiResponse.ok("พบ " + artworks.size() + " รายการ",
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
        if (req.getShippingCost()   != null) artwork.setShippingCost(req.getShippingCost());
        if (StringUtils.hasText(req.getPublishDate()))      artwork.setPublishDate(req.getPublishDate());
        if (req.getWeight() != null) artwork.setWeight(req.getWeight());
        if (req.getWidth()  != null) artwork.setWidth(req.getWidth());
        if (req.getLength() != null) artwork.setLength(req.getLength());
        if (req.getHeight() != null) artwork.setHeight(req.getHeight());

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
}
