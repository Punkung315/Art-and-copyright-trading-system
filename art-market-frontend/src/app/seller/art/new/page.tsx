"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { RequireSeller } from "@/components/RoleGuard";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/context/ToastContext";
import { addArtwork, ApiError } from "@/lib/api";
import { Button, Card, Container, Field, Input, Select, Textarea } from "@/components/ui";
import { validateImageFile, validateNotEmpty } from "@/lib/validation";
import { fileToDataUrl } from "@/lib/storage";

function AddArtContent() {
  const { user } = useAuth();
  const { notify } = useToast();
  const router = useRouter();

  const [artworkName, setArtworkName] = useState("");
  const [artworkImage, setArtworkImage] = useState("");
  const [artworkType, setArtworkType] = useState("Painting");
  const [artworkStyle, setArtworkStyle] = useState("");
  const [artworkMediums, setArtworkMediums] = useState("");
  const [artworkMaterial, setArtworkMaterial] = useState("");
  const [artworkSize, setArtworkSize] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");
  const [copyrightAvailable, setCopyrightAvailable] = useState(true);
  const [copyrightPrice, setCopyrightPrice] = useState("");
  const [errors, setErrors] = useState<Record<string, string | null>>({});
  const [submitting, setSubmitting] = useState(false);

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0] ?? null;
    const err = validateImageFile(file);
    if (err) {
      setErrors((prev) => ({ ...prev, artworkImage: err }));
      return;
    }
    setErrors((prev) => ({ ...prev, artworkImage: null }));
    setArtworkImage(await fileToDataUrl(file!));
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!user) return;
    const nextErrors = {
      artworkName: validateNotEmpty(artworkName, "ชื่อผลงาน"),
      artworkImage: artworkImage ? null : "กรุณาแนบไฟล์รูปภาพ",
      artworkType: validateNotEmpty(artworkType, "ประเภทงานศิลปะ"),
      artworkStyle: validateNotEmpty(artworkStyle, "สไตล์งานศิลปะ"),
      artworkMediums: validateNotEmpty(artworkMediums, "เทคนิคงานศิลปะ"),
      description: validateNotEmpty(description, "คำอธิบายงานศิลปะ"),
      price: !price || Number(price) <= 0 ? "กรุณากรอกราคาที่ถูกต้อง" : null,
    };
    setErrors(nextErrors);
    if (Object.values(nextErrors).some(Boolean)) {
      notify("กรุณากรอกข้อมูลให้ครบถ้วน", "error");
      return;
    }

    setSubmitting(true);
    try {
      const artwork = await addArtwork(user.id, user.fullName || user.username, {
        artworkName,
        artworkImage,
        artworkType,
        artworkStyle,
        artworkMediums,
        artworkMaterial,
        artworkSize,
        description,
        price: Number(price),
        copyrightAvailable,
        copyrightPrice: copyrightAvailable && copyrightPrice ? Number(copyrightPrice) : undefined,
      });
      notify("บันทึกข้อมูลงานศิลปะสำเร็จ", "success");
      router.push(`/seller/art/${artwork.id}/edit`);
    } catch (err) {
      notify(err instanceof ApiError ? err.message : "ไม่สามารถบันทึกงานศิลปะได้ กรุณาลองใหม่อีกครั้ง", "error");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Container className="flex justify-center py-10">
      <Card className="w-full max-w-2xl p-8">
        <h1 className="font-serif text-2xl font-bold text-stone-900">เพิ่มผลงานศิลปะ</h1>
        <p className="mt-1 text-sm text-stone-500">
          ผลงานจะถูกบันทึกเป็นฉบับร่างก่อน กด &quot;เผยแพร่ผลงาน&quot; ในหน้าแก้ไขเพื่อให้พร้อมจำหน่าย
        </p>

        <form onSubmit={handleSubmit} className="mt-6 grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <Field label="รูปผลงาน (artworkImage)" error={errors.artworkImage}>
              <input type="file" accept="image/png,image/jpeg" onChange={handleFile} />
            </Field>
            {artworkImage && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={artworkImage} alt="preview" className="mt-3 h-40 w-40 rounded-lg object-cover" />
            )}
          </div>

          <Field label="ชื่อผลงาน (artworkName)" error={errors.artworkName}>
            <Input value={artworkName} onChange={(e) => setArtworkName(e.target.value)} />
          </Field>
          <Field label="ประเภทงานศิลปะ (artworkType)" error={errors.artworkType}>
            <Select value={artworkType} onChange={(e) => setArtworkType(e.target.value)}>
              <option>Painting</option>
              <option>Digital Art</option>
              <option>Photography</option>
              <option>Sculpture</option>
            </Select>
          </Field>
          <Field label="สไตล์งานศิลปะ (artworkStyle)" error={errors.artworkStyle}>
            <Input value={artworkStyle} onChange={(e) => setArtworkStyle(e.target.value)} placeholder="เช่น Impressionism" />
          </Field>
          <Field label="เทคนิคงานศิลปะ (artworkMediums)" error={errors.artworkMediums}>
            <Input value={artworkMediums} onChange={(e) => setArtworkMediums(e.target.value)} placeholder="เช่น Oil on canvas" />
          </Field>
          <Field label="วัสดุงานศิลปะ (artworkMaterial)">
            <Input value={artworkMaterial} onChange={(e) => setArtworkMaterial(e.target.value)} placeholder="เช่น Canvas" />
          </Field>
          <Field label="ขนาดงานศิลปะ (artworkSize)">
            <Input value={artworkSize} onChange={(e) => setArtworkSize(e.target.value)} placeholder="เช่น 60x80 cm" />
          </Field>
          <Field label="ราคา (price)" error={errors.price}>
            <Input type="number" min={0} value={price} onChange={(e) => setPrice(e.target.value)} />
          </Field>

          <div className="flex items-center gap-2 pt-6">
            <input
              id="copyrightAvailable"
              type="checkbox"
              checked={copyrightAvailable}
              onChange={(e) => setCopyrightAvailable(e.target.checked)}
            />
            <label htmlFor="copyrightAvailable" className="text-sm text-stone-700">
              เปิดให้ซื้อลิขสิทธิ์ของผลงานนี้
            </label>
          </div>

          {copyrightAvailable && (
            <Field label="ราคาลิขสิทธิ์ (copyrightPrice)">
              <Input
                type="number"
                min={0}
                value={copyrightPrice}
                onChange={(e) => setCopyrightPrice(e.target.value)}
                placeholder="ถ้าไม่ระบุ ระบบจะคำนวณให้อัตโนมัติ"
              />
            </Field>
          )}

          <div className="sm:col-span-2">
            <Field label="คำอธิบายงานศิลปะ (description)" error={errors.description}>
              <Textarea rows={4} value={description} onChange={(e) => setDescription(e.target.value)} />
            </Field>
          </div>

          <Button type="submit" disabled={submitting} className="mt-2 sm:col-span-2">
            {submitting ? "กำลังบันทึก..." : "บันทึกงานศิลปะ"}
          </Button>
        </form>
      </Card>
    </Container>
  );
}

export default function AddArtPage() {
  return (
    <RequireSeller>
      <AddArtContent />
    </RequireSeller>
  );
}
