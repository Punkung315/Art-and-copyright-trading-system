"use client";

import { FormEvent, use, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { RequireSeller } from "@/components/RoleGuard";
import { useToast } from "@/context/ToastContext";
import { getArtwork, updateArtwork, publishArtwork, ApiError } from "@/lib/api";
import { Artwork } from "@/types";
import { Button, Card, Container, Field, Input, Select, Spinner, Textarea } from "@/components/ui";
import { StatusBadge } from "@/components/StatusBadge";
import { validateNotEmpty } from "@/lib/validation";
import { fileToDataUrl } from "@/lib/storage";

function EditArtContent({ id }: { id: string }) {
  const { notify } = useToast();
  const router = useRouter();
  const [artwork, setArtwork] = useState<Artwork | null | undefined>(undefined);
  const [form, setForm] = useState<Partial<Artwork>>({});
  const [errors, setErrors] = useState<Record<string, string | null>>({});
  const [submitting, setSubmitting] = useState(false);
  const [publishing, setPublishing] = useState(false);

  useEffect(() => {
    getArtwork(id).then((a) => {
      setArtwork(a ?? null);
      if (a) setForm(a);
    });
  }, [id]);

  if (artwork === undefined) return <Spinner />;
  if (artwork === null) {
    return <Container className="py-16 text-center text-stone-600">ไม่พบข้อมูลงานศิลปะ</Container>;
  }

  function set<K extends keyof Artwork>(key: K, value: Artwork[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    set("artworkImage", await fileToDataUrl(file));
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const nextErrors = {
      artworkName: validateNotEmpty(form.artworkName ?? "", "ชื่อผลงาน"),
      description: validateNotEmpty(form.description ?? "", "คำอธิบายงานศิลปะ"),
      price: !form.price || form.price <= 0 ? "กรุณากรอกราคาที่ถูกต้อง" : null,
    };
    setErrors(nextErrors);
    if (Object.values(nextErrors).some(Boolean)) {
      notify("กรุณากรอกข้อมูลให้ถูกต้อง", "error");
      return;
    }
    setSubmitting(true);
    try {
      const updated = await updateArtwork(id, form);
      setArtwork(updated);
      notify("แก้ไขรายการงานศิลปะสำเร็จ", "success");
    } catch (err) {
      notify(err instanceof ApiError ? err.message : "ไม่สามารถแก้ไขข้อมูลได้ กรุณาลองใหม่อีกครั้ง", "error");
    } finally {
      setSubmitting(false);
    }
  }

  async function handlePublish() {
    setPublishing(true);
    try {
      const updated = await publishArtwork(id);
      setArtwork(updated);
      setForm(updated);
      notify("เผยแพร่ผลงานศิลปะสำเร็จ", "success");
    } catch (err) {
      notify(err instanceof ApiError ? err.message : "ไม่สามารถแก้ไขสถานะได้ กรุณาลองใหม่อีกครั้ง", "error");
    } finally {
      setPublishing(false);
    }
  }

  return (
    <Container className="flex justify-center py-10">
      <Card className="w-full max-w-2xl p-8">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="font-serif text-2xl font-bold text-stone-900">แก้ไขงานศิลปะ</h1>
            <div className="mt-2">
              <StatusBadge status={artwork.artworkStatus} domain="artwork" />
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="secondary" onClick={() => router.push(`/seller/art/${id}/certificate`)}>
              ใบรับรองผลงาน
            </Button>
            {artwork.artworkStatus === "draft" && (
              <Button onClick={handlePublish} disabled={publishing}>
                {publishing ? "กำลังเผยแพร่..." : "เผยแพร่ผลงาน"}
              </Button>
            )}
          </div>
        </div>

        <form onSubmit={handleSubmit} className="grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <Field label="รูปผลงาน (artworkImage)">
              <input type="file" accept="image/png,image/jpeg" onChange={handleFile} />
            </Field>
            {form.artworkImage && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={form.artworkImage} alt="" className="mt-3 h-40 w-40 rounded-lg object-cover" />
            )}
          </div>

          <Field label="ชื่อผลงาน (artworkName)" error={errors.artworkName}>
            <Input value={form.artworkName ?? ""} onChange={(e) => set("artworkName", e.target.value)} />
          </Field>
          <Field label="ประเภทงานศิลปะ (artworkType)">
            <Select value={form.artworkType ?? ""} onChange={(e) => set("artworkType", e.target.value)}>
              <option>Painting</option>
              <option>Digital Art</option>
              <option>Photography</option>
              <option>Sculpture</option>
            </Select>
          </Field>
          <Field label="สไตล์งานศิลปะ (artworkStyle)">
            <Input value={form.artworkStyle ?? ""} onChange={(e) => set("artworkStyle", e.target.value)} />
          </Field>
          <Field label="เทคนิคงานศิลปะ (artworkMediums)">
            <Input value={form.artworkMediums ?? ""} onChange={(e) => set("artworkMediums", e.target.value)} />
          </Field>
          <Field label="วัสดุงานศิลปะ (artworkMaterial)">
            <Input value={form.artworkMaterial ?? ""} onChange={(e) => set("artworkMaterial", e.target.value)} />
          </Field>
          <Field label="ขนาดงานศิลปะ (artworkSize)">
            <Input value={form.artworkSize ?? ""} onChange={(e) => set("artworkSize", e.target.value)} />
          </Field>
          <Field label="ราคา (price)" error={errors.price}>
            <Input
              type="number"
              min={0}
              value={form.price ?? 0}
              onChange={(e) => set("price", Number(e.target.value))}
            />
          </Field>

          <div className="flex items-center gap-2 pt-6">
            <input
              id="copyrightAvailable"
              type="checkbox"
              checked={form.copyrightAvailable ?? false}
              onChange={(e) => set("copyrightAvailable", e.target.checked)}
            />
            <label htmlFor="copyrightAvailable" className="text-sm text-stone-700">
              เปิดให้ซื้อลิขสิทธิ์ของผลงานนี้
            </label>
          </div>

          {form.copyrightAvailable && (
            <Field label="ราคาลิขสิทธิ์ (copyrightPrice)">
              <Input
                type="number"
                min={0}
                value={form.copyrightPrice ?? 0}
                onChange={(e) => set("copyrightPrice", Number(e.target.value))}
              />
            </Field>
          )}

          <div className="sm:col-span-2">
            <Field label="คำอธิบายงานศิลปะ (description)" error={errors.description}>
              <Textarea rows={4} value={form.description ?? ""} onChange={(e) => set("description", e.target.value)} />
            </Field>
          </div>

          <Button type="submit" disabled={submitting} className="mt-2 sm:col-span-2">
            {submitting ? "กำลังบันทึก..." : "บันทึกการแก้ไข"}
          </Button>
        </form>
      </Card>
    </Container>
  );
}

export default function EditArtPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  return (
    <RequireSeller>
      <EditArtContent id={id} />
    </RequireSeller>
  );
}
