package com.maejo.artmarket.controller;

import com.maejo.artmarket.dto.*;
import com.maejo.artmarket.service.ArtworkService;
import com.maejo.artmarket.service.SellerOrderService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/**
 * ArtworkController — REST endpoint สำหรับยูสเคสทั้งหมดที่เกี่ยวกับ Artwork
 *
 * Public (ไม่ต้อง login):
 *   GET  /api/artworks              Search Art    (ยูสเคส 3.1.1)
 *   GET  /api/artworks/{id}         View Art      (ยูสเคส 3.1.2)
 *
 * SELLER เท่านั้น:
 *   GET  /api/artworks/my           List Art      (ยูสเคส 3.1.17)
 *   POST /api/artworks              Add Art       (ยูสเคส 3.1.16)
 *   PUT  /api/artworks/{id}         Edit Art      (ยูสเคส 3.1.18)
 *   PATCH /api/artworks/{id}/publish Publish Art  (ยูสเคส 3.1.19)
 */
@RestController
@RequestMapping("/api/artworks")
@RequiredArgsConstructor
public class ArtworkController {

    private final ArtworkService artworkService;
    private final SellerOrderService sellerOrderService;

    // -----------------------------------------------------------------------
    // Public endpoints
    // -----------------------------------------------------------------------

    /** ยูสเคส 3.1.1 Search Art — GET /api/artworks?keyword=&artworkType=&minPrice= */
    @GetMapping
    public ResponseEntity<ApiResponse<List<ArtworkSummaryResponse>>> searchArtworks(
            @ModelAttribute ArtworkSearchRequest request) {
        return ResponseEntity.ok(artworkService.searchArtworks(request));
    }

    /** ยูสเคส 3.1.2 View Art — GET /api/artworks/{id} */
    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<ArtworkDetailResponse>> getArtworkById(
            @PathVariable Integer id) {
        return ResponseEntity.ok(artworkService.getArtworkById(id));
    }

    // -----------------------------------------------------------------------
    // Seller-only endpoints
    // -----------------------------------------------------------------------

    /**
     * ยูสเคส 3.1.17 List Art — GET /api/artworks/my
     * ดูงานทั้งหมดของตัวเอง (DRAFT + PUBLISHED)
     *
     * หมายเหตุ: /my ต้องอยู่ก่อน /{id} ใน class เพื่อป้องกัน Spring ตีความ "my" ว่าเป็น id
     */
    @GetMapping("/my")
    public ResponseEntity<ApiResponse<List<ArtworkSummaryResponse>>> listMyArt(
            @AuthenticationPrincipal UserDetails userDetails) {
        return ResponseEntity.ok(artworkService.listMyArt(userDetails.getUsername()));
    }

    /**
     * ยูสเคส 3.1.16 Add Art — POST /api/artworks
     * Body: AddArtRequest (artworkName, artworkImage, artworkType, ... ครบตาม SRS)
     * Response 200: { success: true, data: ArtworkDetailResponse }
     */
    @PostMapping
    public ResponseEntity<ApiResponse<ArtworkDetailResponse>> addArt(
            @AuthenticationPrincipal UserDetails userDetails,
            @Valid @RequestBody AddArtRequest request) {
        return ResponseEntity.ok(artworkService.addArt(userDetails.getUsername(), request));
    }

    /**
     * ยูสเคส 3.1.18 Edit Art — PUT /api/artworks/{id}
     * Body: EditArtRequest (partial update — ส่งแค่ field ที่ต้องการเปลี่ยน)
     */
    @PutMapping("/{id}")
    public ResponseEntity<ApiResponse<ArtworkDetailResponse>> editArt(
            @AuthenticationPrincipal UserDetails userDetails,
            @PathVariable Integer id,
            @Valid @RequestBody EditArtRequest request) {
        return ResponseEntity.ok(artworkService.editArt(userDetails.getUsername(), id, request));
    }

    /**
     * ยูสเคส 3.1.19 Publish Art — PATCH /api/artworks/{id}/publish
     * ไม่มี body — แค่ระบุ artworkId ใน URL แล้วกด publish ได้เลย
     * ใช้ PATCH เพราะเป็นการเปลี่ยนแค่ publishStatus field เดียว ไม่ใช่ update ทั้ง resource
     */
    @PatchMapping("/{id}/publish")
    public ResponseEntity<ApiResponse<ArtworkDetailResponse>> publishArt(
            @AuthenticationPrincipal UserDetails userDetails,
            @PathVariable Integer id) {
        return ResponseEntity.ok(artworkService.publishArt(userDetails.getUsername(), id));
    }

    /**
     * ยูสเคส 3.1.20 Print Certificate — GET /api/artworks/{id}/certificate
     * คืนรายละเอียดงานศิลปะให้ frontend เอาไปใส่ในฟอร์มใบรับรอง (แล้ว frontend เป็นคน render เป็น PDF)
     * ต้องเป็นเจ้าของงานชิ้นนั้นเท่านั้นถึงจะพิมพ์ได้
     */
    @GetMapping("/{id}/certificate")
    public ResponseEntity<ApiResponse<ArtworkDetailResponse>> getCertificateData(
            @AuthenticationPrincipal UserDetails userDetails,
            @PathVariable Integer id) {
        return ResponseEntity.ok(sellerOrderService.getCertificateData(userDetails.getUsername(), id));
    }
}
