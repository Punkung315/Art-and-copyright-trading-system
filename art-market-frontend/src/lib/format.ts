import { Artwork } from "@/types";

/** ตัดทศนิยมที่ไม่จำเป็นออก 60.0 -> "60", 42.5 -> "42.5" */
function cm(n: number): string {
  return String(Number(n.toFixed(2)));
}

/**
 * ขนาดงานศิลปะในรูปแบบ "กว้าง x ยาว ซม."
 *
 * DB เก็บมิติแยกเป็น width / length / height ตาม SRS (Size = Height x Width x Depth)
 * ด้านหน้าของชิ้นงานที่คนทั่วไปเรียกว่า "กว้าง x ยาว" จึงเป็น width x height
 * ส่วน length คือความหนา (ภาพวาดบนผ้าใบมีค่านี้แค่ 3-6 ซม.) ไม่นำมาแสดง
 *
 * งานเก่าที่ยังไม่มี width/height จะ fallback ไปใช้ artworkSize ซึ่งเป็นตัวเลขตัวเดียว
 */
export function formatArtworkSize(artwork: Artwork): string {
  const { width, height, artworkSize } = artwork;
  if (width && height) return `${cm(width)} x ${cm(height)} ซม.`;
  if (width) return `${cm(width)} ซม.`;

  const raw = String(artworkSize ?? "").trim();
  if (!raw) return "—";
  // artworkSize เป็นตัวเลขล้วน (เช่น "50") ต้องเติมหน่วยให้ ไม่งั้นจะอ่านไม่รู้เรื่อง
  return /^\d+(\.\d+)?$/.test(raw) ? `${raw} ซม.` : raw;
}
