import Link from "next/link";
import Image from "next/image";
import { PROTECTED_IMAGE_CLASS, protectedImageProps } from "@/lib/protectImage";
import { Artwork } from "@/types";
import { formatArtworkSize } from "@/lib/format";

/**
 * ป้ายบอกสถานะบนการ์ด — ขึ้นเฉพาะตอนที่ "ซื้อไม่ได้"
 *
 * จงใจไม่มีป้าย "พร้อมจำหน่าย" เพราะงานส่วนใหญ่ในระบบพร้อมขายอยู่แล้ว
 * ถ้าติดป้ายให้ทุกใบ ป้ายจะกลายเป็นสิ่งที่ตาข้ามไป แล้วใบที่ซื้อไม่ได้จริง ๆ
 * ก็จะไม่สะดุดตาอีกต่อไป — ป้ายมีค่าก็ต่อเมื่อมันเป็นข้อยกเว้น
 */
const SALES_BADGE: Record<string, { label: string; className: string }> = {
  sold: { label: "ขายแล้ว", className: "bg-stone-900 text-white" },
  reserved: { label: "อยู่ในคำสั่งซื้อแล้ว", className: "bg-amber-500 text-white" },
};

export function ArtCard({
  artwork,
  priceBasis = "artwork",
}: {
  artwork: Artwork;
  /**
   * ราคาที่ให้เด่นบนการ์ด — ตามฐานราคาที่ผู้ใช้กำลังกรองอยู่ในหน้าค้นหา
   * ถ้าผู้ใช้กรองด้วยราคาลิขสิทธิ์แล้วการ์ดยังโชว์ราคาขายชิ้นงาน
   * ตัวเลขที่เห็นจะไม่ใช่ตัวเลขที่เพิ่งกรองไป ซึ่งอ่านแล้วสับสนทันที
   */
  priceBasis?: "artwork" | "copyright";
}) {
  const badge = SALES_BADGE[artwork.salesStatus ?? "available"];
  const size = formatArtworkSize(artwork);
  // โชว์ราคาลิขสิทธิ์เป็นตัวหลักได้เฉพาะตอนที่งานชิ้นนั้นมีราคาลิขสิทธิ์จริง
  const showCopyrightPrice = priceBasis === "copyright" && !!artwork.copyrightPrice;

  return (
    <Link
      href={`/art/${artwork.id}`}
      className="group flex flex-col overflow-hidden rounded-xl border border-stone-200 bg-white shadow-sm transition hover:shadow-md"
    >
      <div className="relative aspect-[4/5] w-full overflow-hidden bg-stone-100">
        <Image
          src={artwork.artworkImage}
          alt={artwork.artworkName}
          fill
          unoptimized
          {...protectedImageProps}
          className={`object-cover transition duration-300 group-hover:scale-105 ${PROTECTED_IMAGE_CLASS}`}
        />
        {/*
          ผลงานที่ขายแล้วจะจางลง เพื่อให้แยกออกจากงานที่ยังซื้อได้ตั้งแต่ยังไม่ทันอ่านป้าย
          (เห็นชัดเป็นพิเศษในหน้าโปรไฟล์ศิลปินที่งานเก่ากับงานใหม่อยู่ปนกัน)
        */}
        {artwork.salesStatus === "sold" && (
          <div className="absolute inset-0 z-10 bg-white/45" aria-hidden="true" />
        )}

        <div className="absolute left-2 top-2 z-20 flex flex-col items-start gap-1">
          {badge && (
            <span
              className={`rounded-full px-2.5 py-1 text-[11px] font-semibold shadow-sm ${badge.className}`}
            >
              {badge.label}
            </span>
          )}
          {artwork.copyrightAvailable && (
            <span className="rounded-full bg-white/90 px-2 py-1 text-[11px] font-medium text-stone-700 shadow">
              รับซื้อลิขสิทธิ์ได้
            </span>
          )}
        </div>
      </div>
      <div className="flex flex-1 flex-col gap-1 p-3">
        <p className="line-clamp-1 text-sm font-semibold text-stone-900">{artwork.artworkName}</p>
        <p className="text-xs text-stone-500">{artwork.sellerName}</p>
        {/* ขนาดจริงของชิ้นงาน — เดิมต้องกดเข้าไปในแต่ละชิ้นถึงจะเห็น */}
        {size !== "—" && <p className="text-xs text-stone-500">{size}</p>}
        <div className="mt-auto flex items-end justify-between gap-2 pt-2">
          <span className="text-xs rounded-full bg-stone-100 px-2 py-0.5 text-stone-600">
            {artwork.artworkType}
          </span>
          <span className="text-right">
            {showCopyrightPrice ? (
              <>
                <span className="block text-[10px] leading-tight text-stone-400">ลิขสิทธิ์</span>
                <span className="text-sm font-semibold text-stone-900">
                  {artwork.copyrightPrice!.toLocaleString()} บาท
                </span>
                <span className="block text-[10px] leading-tight text-stone-400">
                  ชิ้นงาน {artwork.price.toLocaleString()} บาท
                </span>
              </>
            ) : (
              <span className="text-sm font-semibold text-stone-900">
                {artwork.price.toLocaleString()} บาท
              </span>
            )}
          </span>
        </div>
      </div>
    </Link>
  );
}
