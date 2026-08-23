import Link from "next/link";
import { Artwork } from "@/types";
import { ArtCard } from "@/components/ArtCard";
import { EmptyState, Spinner } from "@/components/ui";

/**
 * แถวแสดงผลงานพร้อมหัวข้อและลิงก์ "ดูทั้งหมด" — ใช้ซ้ำในหน้าแรก
 *
 * artworks = null หมายถึงกำลังโหลด (แสดง spinner)
 * artworks = [] หมายถึงโหลดเสร็จแล้วแต่ไม่มีข้อมูล (แสดง empty state)
 */
export function ArtSection({
  title,
  description,
  artworks,
  viewAllHref,
  emptyTitle = "ยังไม่มีผลงานในหมวดนี้",
}: {
  title: string;
  description?: string;
  artworks: Artwork[] | null;
  viewAllHref?: string;
  emptyTitle?: string;
}) {
  return (
    <section className="py-8">
      <div className="mb-5 flex flex-wrap items-end justify-between gap-2">
        <div>
          <h2 className="font-serif text-xl font-bold text-stone-900 sm:text-2xl">{title}</h2>
          {description && <p className="mt-1 text-sm text-stone-500">{description}</p>}
        </div>
        {viewAllHref && (
          <Link
            href={viewAllHref}
            className="text-sm font-semibold text-stone-700 underline underline-offset-4 hover:text-stone-900"
          >
            ดูทั้งหมด →
          </Link>
        )}
      </div>

      {artworks === null ? (
        <Spinner />
      ) : artworks.length === 0 ? (
        <EmptyState title={emptyTitle} />
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {artworks.map((a) => (
            <ArtCard key={a.id} artwork={a} />
          ))}
        </div>
      )}
    </section>
  );
}
