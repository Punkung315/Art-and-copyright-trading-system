"use client";

import { FormEvent, Suspense, useCallback, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  ArtworkFacets,
  ArtworkSort,
  getArtworkFacets,
  searchArtworks,
} from "@/lib/api";
import { Artwork } from "@/types";
import { ArtCard } from "@/components/ArtCard";
import { FilterSidebar, FilterState, SIZE_RANGES } from "@/components/FilterSidebar";
import { Button, Container, EmptyState, Input, Select, Spinner } from "@/components/ui";

const SORT_OPTIONS: { value: ArtworkSort; label: string }[] = [
  { value: "newest", label: "ใหม่ล่าสุด" },
  { value: "price_asc", label: "ราคา: ต่ำ → สูง" },
  { value: "price_desc", label: "ราคา: สูง → ต่ำ" },
  { value: "name", label: "ชื่อผลงาน ก - ฮ" },
];

const EMPTY_FILTERS: FilterState = {
  artworkType: "",
  artworkStyle: "",
  artworkMediums: "",
  minPrice: null,
  maxPrice: null,
  sizeIndex: -1,
};

/** อ่านตัวเลขจาก URL — คืน null ถ้าไม่มีหรือไม่ใช่ตัวเลข */
function numParam(raw: string | null): number | null {
  if (raw === null || raw.trim() === "") return null;
  const n = Number(raw);
  return Number.isFinite(n) ? n : null;
}

function SearchContent() {
  const router = useRouter();
  const params = useSearchParams();

  // อ่านสถานะตั้งต้นจาก URL เพื่อให้ผู้ใช้บุ๊กมาร์กหรือแชร์ลิงก์ผลการค้นหาได้
  // และปุ่ม back ของเบราว์เซอร์ยังทำงานถูกต้อง
  const [keyword, setKeyword] = useState(params.get("keyword") ?? "");
  const [sort, setSort] = useState<ArtworkSort>(
    (params.get("sort") as ArtworkSort) || "newest"
  );
  const [filters, setFilters] = useState<FilterState>({
    artworkType: params.get("type") ?? "",
    artworkStyle: params.get("style") ?? "",
    artworkMediums: params.get("mediums") ?? "",
    minPrice: numParam(params.get("minPrice")),
    maxPrice: numParam(params.get("maxPrice")),
    sizeIndex: Number(params.get("size") ?? -1),
  });

  const [facets, setFacets] = useState<ArtworkFacets | null>(null);
  const [results, setResults] = useState<Artwork[] | null>(null);

  useEffect(() => {
    getArtworkFacets().then(setFacets);
  }, []);

  const activeCount = useMemo(() => {
    let n = 0;
    if (filters.artworkType) n++;
    if (filters.artworkStyle) n++;
    if (filters.artworkMediums) n++;
    if (filters.minPrice !== null || filters.maxPrice !== null) n++;
    if (filters.sizeIndex >= 0) n++;
    return n;
  }, [filters]);

  // ยิงค้นหาใหม่ทุกครั้งที่ตัวกรอง/คำค้น/การเรียงเปลี่ยน แล้วอัปเดต URL ให้ตรงกัน
  useEffect(() => {
    const size = filters.sizeIndex >= 0 ? SIZE_RANGES[filters.sizeIndex] : undefined;

    let active = true;
    setResults(null);
    searchArtworks({
      q: keyword.trim() || undefined,
      artworkType: filters.artworkType || undefined,
      artworkStyle: filters.artworkStyle || undefined,
      artworkMediums: filters.artworkMediums || undefined,
      minPrice: filters.minPrice ?? undefined,
      maxPrice: filters.maxPrice ?? undefined,
      minSize: size?.min,
      maxSize: size?.max,
      sort,
    }).then((r) => {
      if (active) setResults(r);
    });

    const sp = new URLSearchParams();
    if (keyword.trim()) sp.set("keyword", keyword.trim());
    if (filters.artworkType) sp.set("type", filters.artworkType);
    if (filters.artworkStyle) sp.set("style", filters.artworkStyle);
    if (filters.artworkMediums) sp.set("mediums", filters.artworkMediums);
    if (filters.minPrice !== null) sp.set("minPrice", String(filters.minPrice));
    if (filters.maxPrice !== null) sp.set("maxPrice", String(filters.maxPrice));
    if (filters.sizeIndex >= 0) sp.set("size", String(filters.sizeIndex));
    if (sort !== "newest") sp.set("sort", sort);
    // scroll: false กันหน้าเด้งกลับไปบนสุดทุกครั้งที่ติ๊กตัวกรอง
    router.replace(sp.toString() ? `/search?${sp}` : "/search", { scroll: false });

    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [keyword, sort, filters]);

  const patchFilters = useCallback((patch: Partial<FilterState>) => {
    setFilters((f) => ({ ...f, ...patch }));
  }, []);

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    // useEffect ยิงค้นหาให้อยู่แล้วทุกครั้งที่ keyword เปลี่ยน — กัน submit ไม่ให้รีโหลดหน้า
  }

  return (
    <Container className="py-8">
      <div className="mb-6">
        <h1 className="font-serif text-2xl font-bold text-stone-900">ค้นหางานศิลปะ</h1>
        <p className="mt-1 text-sm text-stone-500">
          กรองตามประเภท สไตล์ เทคนิค ขนาด และช่วงราคา เพื่อหาผลงานที่ใช่
        </p>
      </div>

      <form onSubmit={handleSubmit} className="mb-6 flex flex-col gap-3 sm:flex-row">
        <Input
          placeholder="ค้นหาชื่อผลงาน หรือชื่อศิลปิน"
          value={keyword}
          onChange={(e) => setKeyword(e.target.value)}
          className="sm:flex-1"
          aria-label="คำค้นหา"
        />
        <Select
          value={sort}
          onChange={(e) => setSort(e.target.value as ArtworkSort)}
          className="sm:w-56"
          aria-label="เรียงลำดับ"
        >
          {SORT_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              เรียงตาม: {o.label}
            </option>
          ))}
        </Select>
      </form>

      <div className="flex flex-col gap-8 lg:flex-row">
        <FilterSidebar
          facets={facets ?? { types: [], styles: [], mediums: [], minPrice: null, maxPrice: null }}
          value={filters}
          onChange={patchFilters}
          onReset={() => setFilters(EMPTY_FILTERS)}
          activeCount={activeCount}
        />

        <div className="min-w-0 flex-1">
          <div className="mb-4 flex items-center justify-between border-b border-stone-200 pb-3">
            <p className="text-sm text-stone-600">
              {results === null ? "กำลังค้นหา..." : `พบ ${results.length} ผลงาน`}
            </p>
            {activeCount > 0 && (
              <Button variant="ghost" onClick={() => setFilters(EMPTY_FILTERS)}>
                ล้างตัวกรอง
              </Button>
            )}
          </div>

          {results === null ? (
            <Spinner />
          ) : results.length === 0 ? (
            <EmptyState
              title="ไม่พบงานศิลปะที่ตรงกับเงื่อนไข"
              description="ลองลดตัวกรองลง หรือเปลี่ยนคำค้นหาดูอีกครั้ง"
            />
          ) : (
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
              {results.map((a) => (
                <ArtCard key={a.id} artwork={a} />
              ))}
            </div>
          )}
        </div>
      </div>
    </Container>
  );
}

export default function SearchPage() {
  // useSearchParams ต้องอยู่ใต้ Suspense เมื่อหน้าถูก prerender เป็น static
  return (
    <Suspense fallback={<Spinner />}>
      <SearchContent />
    </Suspense>
  );
}
