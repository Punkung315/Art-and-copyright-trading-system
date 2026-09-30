"use client";

import { FormEvent, use, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { RequireSeller } from "@/components/RoleGuard";
import { useToast } from "@/context/ToastContext";
import {
  getArtwork,
  getArtworkFacets,
  updateArtwork,
  publishArtwork,
  unpublishArtwork,
  ApiError,
} from "@/lib/api";
import { Artwork } from "@/types";
import { useAuth } from "@/context/AuthContext";
import { Button, Card, Container, Field, Input, Select, Spinner, Textarea } from "@/components/ui";
import { StatusBadge } from "@/components/StatusBadge";
import { ImageUploadField } from "@/components/ImageUploadField";
import { ShippingPicker } from "@/components/ShippingPicker";
import { CopyrightPriceField } from "@/components/CopyrightPriceField";
import { validateNotEmpty } from "@/lib/validation";
import { Combobox } from "@/components/Combobox";
import {
  ARTWORK_TYPES,
  ARTWORK_STYLES,
  ARTWORK_MEDIUMS,
  ARTWORK_MATERIALS,
  mergeOptions,
  normalizeOption,
} from "@/lib/artworkOptions";

function EditArtContent({ id }: { id: string }) {
  const { notify } = useToast();
  const { user } = useAuth();
  const router = useRouter();
  const [artwork, setArtwork] = useState<Artwork | null | undefined>(undefined);
  const [form, setForm] = useState<Partial<Artwork>>({});
  const [errors, setErrors] = useState<Record<string, string | null>>({});
  const [submitting, setSubmitting] = useState(false);
  const [publishing, setPublishing] = useState(false);

  const [dataStyles, setDataStyles] = useState<string[]>([]);
  const [dataMediums, setDataMediums] = useState<string[]>([]);

  useEffect(() => {
    getArtwork(id).then((a) => {
      setArtwork(a ?? null);
      if (a) setForm(a);
    });
  }, [id]);

  // รายการแนะนำ = ค่าตั้งต้นในโค้ด + ค่าที่มีอยู่จริงในระบบ (เดียวกับตัวกรองหน้าค้นหา)
  useEffect(() => {
    getArtworkFacets()
      .then((f) => {
        setDataStyles(f.styles.map((v) => v.value));
        setDataMediums(f.mediums.map((v) => v.value));
      })
      .catch(() => {});
  }, []);

  const styleOptions = useMemo(() => mergeOptions(ARTWORK_STYLES, dataStyles), [dataStyles]);
  const mediumOptions = useMemo(() => mergeOptions(ARTWORK_MEDIUMS, dataMediums), [dataMediums]);
  const materialOptions = useMemo(() => mergeOptions(ARTWORK_MATERIALS), []);
  /*
    ผลงานเดิมอาจมีประเภทที่ไม่อยู่ในรายการปัจจุบัน (ข้อมูลเก่า หรือรายการถูกแก้ทีหลัง)
    ต้องใส่ค่าเดิมเข้าไปในตัวเลือกด้วย ไม่งั้น <select> จะเด้งไปค่าแรกแล้วเขียนทับของเดิมตอนกดบันทึก
  */
  const typeOptions = useMemo(
    () => mergeOptions(ARTWORK_TYPES, form.artworkType ? [form.artworkType] : []),
    [form.artworkType]
  );

  if (artwork === undefined) return <Spinner />;
  if (artwork === null) {
    return <Container className="py-16 text-center text-stone-600">ไม่พบข้อมูลงานศิลปะ</Container>;
  }

  function set<K extends keyof Artwork>(key: K, value: Artwork[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }


  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const nextErrors = {
      artworkName: validateNotEmpty(form.artworkName ?? "", "ชื่อผลงาน"),
      description: validateNotEmpty(form.description ?? "", "คำอธิบายงานศิลปะ"),
      price: !form.price || form.price <= 0 ? "กรุณากรอกราคาที่ถูกต้อง" : null,
      width: !form.width || form.width <= 0 ? "กรุณากรอกความกว้างเป็นตัวเลขมากกว่า 0" : null,
      height: !form.height || form.height <= 0 ? "กรุณากรอกความยาวเป็นตัวเลขมากกว่า 0" : null,
      length: !form.length || form.length <= 0 ? "กรุณากรอกความหนาเป็นตัวเลขมากกว่า 0" : null,
      weight: !form.weight || form.weight <= 0 ? "กรุณากรอกน้ำหนักเป็นตัวเลขมากกว่า 0" : null,
      shippingCompany: form.shippingCompany ? null : "กรุณาเลือกบริษัทขนส่ง",
      // บังคับกรอกเฉพาะตอนปิดโหมดคำนวณอัตโนมัติ
      copyrightPrice:
        form.copyrightAvailable && form.copyrightAutoPrice === false && !form.copyrightPrice
          ? "กรุณากรอกราคาลิขสิทธิ์ หรือเปิดให้ระบบคำนวณให้"
          : null,
    };
    setErrors(nextErrors);
    if (Object.values(nextErrors).some(Boolean)) {
      notify("กรุณากรอกข้อมูลให้ถูกต้อง", "error");
      return;
    }
    setSubmitting(true);
    try {
      // ล้างช่องว่างส่วนเกินของค่าที่ถูกนำไปสร้างตัวกรองในหน้าค้นหา
      const updated = await updateArtwork(id, {
        ...form,
        artworkStyle: normalizeOption(form.artworkStyle ?? ""),
        artworkMediums: normalizeOption(form.artworkMediums ?? ""),
        artworkMaterial: normalizeOption(form.artworkMaterial ?? ""),
      });
      setArtwork(updated);
      notify("แก้ไขรายการงานศิลปะสำเร็จ", "success");
    } catch (err) {
      notify(err instanceof ApiError ? err.message : "ไม่สามารถแก้ไขข้อมูลได้ กรุณาลองใหม่อีกครั้ง", "error");
    } finally {
      setSubmitting(false);
    }
  }

  /** ใช้ร่วมกันทั้งเผยแพร่และยกเลิกเผยแพร่ เพราะขั้นตอนจัดการสถานะเหมือนกันทุกอย่าง */
  async function changePublishState(
    action: () => Promise<Artwork>,
    successMessage: string
  ) {
    setPublishing(true);
    try {
      const updated = await action();
      setArtwork(updated);
      setForm(updated);
      notify(successMessage, "success");
    } catch (err) {
      notify(
        err instanceof ApiError ? err.message : "ไม่สามารถแก้ไขสถานะได้ กรุณาลองใหม่อีกครั้ง",
        "error"
      );
    } finally {
      setPublishing(false);
    }
  }

  function handlePublish() {
    return changePublishState(() => publishArtwork(id), "เผยแพร่ผลงานศิลปะสำเร็จ");
  }

  function handleUnpublish() {
    return changePublishState(
      () => unpublishArtwork(id),
      "ยกเลิกการเผยแพร่แล้ว งานกลับไปเป็นฉบับร่าง"
    );
  }

  /*
   * ค่าจัดส่งคิดจากจังหวัดต้นทาง ผู้ขายจึงต้องตั้งที่อยู่ต้นทางก่อนเผยแพร่
   * backend ปฏิเสธอยู่แล้ว แต่ต้องบอกล่วงหน้าตรงนี้ด้วย ไม่ใช่ปล่อยให้กดแล้วเด้ง error
   */
  const hasPickupAddress = (user?.addresses ?? []).some((a) => a.pickupAddress);

  // งานที่ RESERVED/SOLD ถอนออกไม่ได้ เพราะผู้ซื้อยังต้องเปิดดูจากคำสั่งซื้อของเขา
  const canUnpublish =
    artwork.artworkStatus === "published" && (artwork.salesStatus ?? "available") === "available";

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
          <div className="flex flex-wrap justify-end gap-2">
            <Button variant="secondary" onClick={() => router.push(`/seller/art/${id}/certificate`)}>
              ใบรับรองผลงาน
            </Button>
            {artwork.artworkStatus === "draft" && (
              <Button onClick={handlePublish} disabled={publishing || !hasPickupAddress}>
                {publishing ? "กำลังเผยแพร่..." : "เผยแพร่ผลงาน"}
              </Button>
            )}
            {/*
              ถอนงานกลับเป็นฉบับร่างได้เฉพาะงานที่ยังไม่มีใครสั่งซื้อ
              ถ้าไม่เช็ค salesStatus ตรงนี้ ปุ่มจะขึ้นให้กดแล้วโดน backend ปฏิเสธทุกครั้ง
              — ปุ่มที่กดแล้วพังเสมอแย่กว่าปุ่มที่ไม่มี
            */}
            {canUnpublish && (
              <Button variant="secondary" onClick={handleUnpublish} disabled={publishing}>
                {publishing ? "กำลังยกเลิก..." : "ยกเลิกการเผยแพร่"}
              </Button>
            )}
          </div>
        </div>

        {artwork.artworkStatus === "published" && !canUnpublish && (
          <p className="mb-6 rounded-lg bg-stone-100 p-3 text-sm text-stone-600">
            งานชิ้นนี้อยู่ในคำสั่งซื้อแล้ว จึงยกเลิกการเผยแพร่ไม่ได้ —
            ผู้ซื้อยังต้องเปิดดูรายละเอียดงานจากคำสั่งซื้อของเขาได้
          </p>
        )}

        {/* บอกเหตุผลที่ปุ่มเผยแพร่กดไม่ได้ พร้อมลิงก์ไปแก้ให้เลย */}
        {artwork.artworkStatus === "draft" && !hasPickupAddress && (
          <p className="mb-6 rounded-lg bg-rose-50 p-3 text-sm text-rose-800">
            ยังเผยแพร่ไม่ได้ — คุณยังไม่ได้ตั้งที่อยู่ต้นทางสำหรับจัดส่ง
            ระบบใช้จังหวัดต้นทางคำนวณค่าจัดส่งให้ผู้ซื้อ{" "}
            <Link href="/profile/edit" className="font-medium underline">
              ไปตั้งที่อยู่ต้นทาง
            </Link>
          </p>
        )}

        {artwork.artworkStatus === "draft" && (
          <p className="mb-6 rounded-lg bg-amber-50 p-3 text-sm text-amber-800">
            งานชิ้นนี้เป็นฉบับร่าง ยังไม่แสดงในหน้าค้นหาและผู้ซื้อยังสั่งซื้อไม่ได้ กด
            &ldquo;เผยแพร่ผลงาน&rdquo; เมื่อพร้อมขาย
          </p>
        )}

        <form onSubmit={handleSubmit} className="grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <ImageUploadField
              label="รูปผลงาน"
              value={form.artworkImage}
              onChange={(dataUrl) => set("artworkImage", dataUrl)}
              onError={(message) => notify(message, "error")}
            />
          </div>

          <Field label="ชื่อผลงาน" error={errors.artworkName}>
            <Input value={form.artworkName ?? ""} onChange={(e) => set("artworkName", e.target.value)} />
          </Field>
          <Field label="ประเภทงานศิลปะ">
            <Select value={form.artworkType ?? ""} onChange={(e) => set("artworkType", e.target.value)}>
              {typeOptions.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="สไตล์งานศิลปะ">
            <Combobox
              value={form.artworkStyle ?? ""}
              onChange={(v) => set("artworkStyle", v)}
              options={styleOptions}
              ariaLabel="สไตล์งานศิลปะ"
              placeholder="เลือกหรือพิมพ์เอง"
            />
          </Field>
          <Field label="เทคนิคงานศิลปะ">
            <Combobox
              value={form.artworkMediums ?? ""}
              onChange={(v) => set("artworkMediums", v)}
              options={mediumOptions}
              ariaLabel="เทคนิคงานศิลปะ"
              placeholder="เลือกหรือพิมพ์เอง"
            />
          </Field>
          <Field label="วัสดุงานศิลปะ">
            <Combobox
              value={form.artworkMaterial ?? ""}
              onChange={(v) => set("artworkMaterial", v)}
              options={materialOptions}
              ariaLabel="วัสดุงานศิลปะ"
              placeholder="เลือกหรือพิมพ์เอง"
            />
          </Field>
          <Field label="ความกว้าง (ซม.)" error={errors.width}>
            <Input
              type="number"
              min={0}
              step="0.1"
              value={form.width ?? ""}
              onChange={(e) => set("width", e.target.value === "" ? undefined : Number(e.target.value))}
            />
          </Field>
          <Field label="ความยาว (ซม.)" error={errors.height}>
            <Input
              type="number"
              min={0}
              step="0.1"
              value={form.height ?? ""}
              onChange={(e) => set("height", e.target.value === "" ? undefined : Number(e.target.value))}
            />
          </Field>
          {/* ขนส่งคิดราคาจากผลบวกสามด้าน (ก+ย+ส) จึงต้องมีความหนาด้วย */}
          <Field label="ความหนา (ซม.)" error={errors.length}>
            <Input
              type="number"
              min={0}
              step="0.1"
              value={form.length ?? ""}
              onChange={(e) => set("length", e.target.value === "" ? undefined : Number(e.target.value))}
            />
          </Field>
          <Field label="น้ำหนักพร้อมแพ็ค (กก.)" error={errors.weight}>
            <Input
              type="number"
              min={0}
              step="0.1"
              value={form.weight ?? ""}
              onChange={(e) => set("weight", e.target.value === "" ? undefined : Number(e.target.value))}
            />
          </Field>
          <Field label="ราคา (บาท])" error={errors.price}>
            <Input
              type="number"
              min={0}
              value={form.price ?? 0}
              onChange={(e) => set("price", Number(e.target.value))}
            />
          </Field>

          <ShippingPicker
            value={form.shippingCompany}
            onChange={(c) => set("shippingCompany", c)}
            weight={form.weight}
            width={form.width}
            length={form.length}
            height={form.height}
            error={errors.shippingCompany}
          />

          <CopyrightPriceField
            available={form.copyrightAvailable ?? false}
            onAvailableChange={(v) => set("copyrightAvailable", v)}
            autoPrice={form.copyrightAutoPrice ?? true}
            onAutoPriceChange={(v) => set("copyrightAutoPrice", v)}
            price={form.price}
            manualPrice={form.copyrightPrice != null ? String(form.copyrightPrice) : ""}
            onManualPriceChange={(v) =>
              set("copyrightPrice", v === "" ? undefined : Number(v))
            }
            error={errors.copyrightPrice}
          />

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
