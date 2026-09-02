"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { RequireSeller } from "@/components/RoleGuard";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/context/ToastContext";
import { addArtwork, ApiError } from "@/lib/api";
import { ShippingCompanyCode } from "@/types";
import { Button, Card, Container, Field, Input, Select, Textarea } from "@/components/ui";
import { ImageUploadField } from "@/components/ImageUploadField";
import { ShippingPicker } from "@/components/ShippingPicker";
import { CopyrightPriceField } from "@/components/CopyrightPriceField";
import { validateNotEmpty } from "@/lib/validation";

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
  // เก็บเป็น string เพราะช่องว่างต้องแยกจาก 0 ได้ (backend บังคับ artworkSize > 0)
  const [width, setWidth] = useState("");
  const [height, setHeight] = useState("");
  const [length, setLength] = useState("");
  const [weight, setWeight] = useState("");
  const [shippingCompany, setShippingCompany] = useState<ShippingCompanyCode | undefined>(undefined);
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");
  const [copyrightAvailable, setCopyrightAvailable] = useState(true);
  // คำนวณอัตโนมัติเป็นค่าเริ่มต้น ผู้ขายส่วนใหญ่ไม่อยากมานั่งคิดเอง
  const [copyrightAutoPrice, setCopyrightAutoPrice] = useState(true);
  const [copyrightPrice, setCopyrightPrice] = useState("");
  const [errors, setErrors] = useState<Record<string, string | null>>({});
  const [submitting, setSubmitting] = useState(false);

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
      width: !width || Number(width) <= 0 ? "กรุณากรอกความกว้างเป็นตัวเลขมากกว่า 0" : null,
      height: !height || Number(height) <= 0 ? "กรุณากรอกความยาวเป็นตัวเลขมากกว่า 0" : null,
      length: !length || Number(length) <= 0 ? "กรุณากรอกความหนาเป็นตัวเลขมากกว่า 0" : null,
      weight: !weight || Number(weight) <= 0 ? "กรุณากรอกน้ำหนักเป็นตัวเลขมากกว่า 0" : null,
      shippingCompany: shippingCompany ? null : "กรุณาเลือกบริษัทขนส่ง",
      // บังคับกรอกเฉพาะตอนปิดโหมดอัตโนมัติ ไม่งั้นระบบคิดให้อยู่แล้ว
      copyrightPrice:
        copyrightAvailable && !copyrightAutoPrice && (!copyrightPrice || Number(copyrightPrice) <= 0)
          ? "กรุณากรอกราคาลิขสิทธิ์ หรือเปิดให้ระบบคำนวณให้"
          : null,
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
        artworkSize: width,
        width: Number(width),
        height: Number(height),
        length: Number(length),
        weight: Number(weight),
        shippingCompany,
        description,
        price: Number(price),
        copyrightAvailable,
        copyrightAutoPrice,
        copyrightPrice:
          copyrightAvailable && !copyrightAutoPrice && copyrightPrice
            ? Number(copyrightPrice)
            : undefined,
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
            <ImageUploadField
              label="รูปผลงาน (artworkImage)"
              value={artworkImage}
              onChange={(dataUrl) => {
                setArtworkImage(dataUrl);
                setErrors((prev) => ({ ...prev, artworkImage: null }));
              }}
              onError={(message) => setErrors((prev) => ({ ...prev, artworkImage: message }))}
            />
            {errors.artworkImage && (
              <p className="mt-1 text-xs text-rose-600">{errors.artworkImage}</p>
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
          <Field label="ความกว้าง (ซม.)" error={errors.width}>
            <Input
              type="number"
              min={0}
              step="0.1"
              value={width}
              onChange={(e) => setWidth(e.target.value)}
              placeholder="เช่น 60"
            />
          </Field>
          <Field label="ความยาว (ซม.)" error={errors.height}>
            <Input
              type="number"
              min={0}
              step="0.1"
              value={height}
              onChange={(e) => setHeight(e.target.value)}
              placeholder="เช่น 80"
            />
          </Field>
          {/* ขนส่งคิดราคาจากผลบวกสามด้าน (ก+ย+ส) จึงต้องมีความหนาด้วย */}
          <Field label="ความหนา (ซม.)" error={errors.length}>
            <Input
              type="number"
              min={0}
              step="0.1"
              value={length}
              onChange={(e) => setLength(e.target.value)}
              placeholder="เช่น 5"
            />
          </Field>
          <Field label="น้ำหนักพร้อมแพ็ค (กก.)" error={errors.weight}>
            <Input
              type="number"
              min={0}
              step="0.1"
              value={weight}
              onChange={(e) => setWeight(e.target.value)}
              placeholder="เช่น 2.5"
            />
          </Field>
          <Field label="ราคา (price)" error={errors.price}>
            <Input type="number" min={0} value={price} onChange={(e) => setPrice(e.target.value)} />
          </Field>

          <ShippingPicker
            value={shippingCompany}
            onChange={setShippingCompany}
            weight={Number(weight) || undefined}
            width={Number(width) || undefined}
            length={Number(length) || undefined}
            height={Number(height) || undefined}
            error={errors.shippingCompany}
          />

          <CopyrightPriceField
            available={copyrightAvailable}
            onAvailableChange={setCopyrightAvailable}
            autoPrice={copyrightAutoPrice}
            onAutoPriceChange={setCopyrightAutoPrice}
            price={Number(price) || undefined}
            manualPrice={copyrightPrice}
            onManualPriceChange={setCopyrightPrice}
            error={errors.copyrightPrice}
          />

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
