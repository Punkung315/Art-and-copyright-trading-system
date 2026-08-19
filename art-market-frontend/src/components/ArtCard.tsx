import Link from "next/link";
import Image from "next/image";
import { Artwork } from "@/types";

export function ArtCard({ artwork }: { artwork: Artwork }) {
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
          className="object-cover transition duration-300 group-hover:scale-105"
        />
        {artwork.copyrightAvailable && (
          <span className="absolute left-2 top-2 rounded-full bg-white/90 px-2 py-1 text-[11px] font-medium text-stone-700 shadow">
            รับซื้อลิขสิทธิ์ได้
          </span>
        )}
      </div>
      <div className="flex flex-1 flex-col gap-1 p-3">
        <p className="line-clamp-1 text-sm font-semibold text-stone-900">{artwork.artworkName}</p>
        <p className="text-xs text-stone-500">{artwork.sellerName}</p>
        <div className="mt-auto flex items-center justify-between pt-2">
          <span className="text-xs rounded-full bg-stone-100 px-2 py-0.5 text-stone-600">
            {artwork.artworkType}
          </span>
          <span className="text-sm font-semibold text-stone-900">
            ฿{artwork.price.toLocaleString()}
          </span>
        </div>
      </div>
    </Link>
  );
}
