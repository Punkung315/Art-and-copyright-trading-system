import { Container } from "./ui";

export function Footer() {
  return (
    <footer className="mt-16 border-t border-stone-200 bg-stone-50 py-8">
      <Container className="flex flex-col items-center justify-between gap-3 text-sm text-stone-500 sm:flex-row">
        <p>© 2026 Artmara — ระบบซื้อขายงานศิลปะและโอนลิขสิทธิ์ผลงานศิลปะ</p>
        <p>โปรเจกต์จบการศึกษา · สาขาเทคโนโลยีสารสนเทศ · มหาวิทยาลัยแม่โจ้</p>
      </Container>
    </footer>
  );
}
