"use client";

import { useState } from "react";
import { ArtworkOffer, FacetValue } from "@/lib/api";
import { PriceRangeSlider } from "./PriceRangeSlider";

/**
 * กล่องตัวกรองหนึ่งหมวด — พับเก็บได้ และซ่อนตัวเลือกส่วนเกินไว้หลังปุ่ม "แสดงเพิ่มเติม"
 *
 * ใช้ radio (เลือกได้ทีละค่า) ทุกหมวด เพราะ endpoint ค้นหาฝั่ง backend
 * รับค่าละหนึ่งค่าต่อหนึ่งเงื่อนไข ถ้าทำเป็น checkbox หลายค่าจะต้องแก้ JPQL
 * ให้รองรับ IN (:list) ด้วย — ทำได้ แต่ยังไม่จำเป็นกับขนาดข้อมูลตอนนี้
 */
function FilterGroup({
  title,
  children,
  defaultOpen = true,
}: {
  title: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div className="border-b border-stone-200 py-4">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex w-full items-center justify-between text-left"
      >
        <span className="text-xs font-semibold uppercase tracking-wider text-stone-900">
          {title}
        </span>
        <span className="text-stone-400" aria-hidden="true">
          {open ? "▲" : "▼"}
        </span>
      </button>
      {open && <div className="mt-3 flex flex-col gap-2">{children}</div>}
    </div>
  );
}

function RadioOption({
  name,
  label,
  hint,
  count,
  checked,
  onChange,
}: {
  name: string;
  label: string;
  /** คำอธิบายบรรทัดที่สอง — ใช้บอกหน่วยหรือของที่เทียบขนาดได้ */
  hint?: string;
  count?: number;
  checked: boolean;
  onChange: () => void;
}) {
  return (
    <label className="flex cursor-pointer items-start gap-2.5 text-sm text-stone-700 hover:text-stone-900">
      <input
        type="radio"
        name={name}
        checked={checked}
        onChange={onChange}
        className="mt-0.5 h-4 w-4 shrink-0 accent-stone-900"
      />
      <span className="flex-1">
        {label}
        {hint && <span className="block text-xs text-stone-400">{hint}</span>}
      </span>
      {count !== undefined && <span className="text-xs text-stone-400">{count}</span>}
    </label>
  );
}

/** รายการตัวเลือกที่ยาวเกิน 6 อัน จะถูกพับไว้จนกว่าจะกด "แสดงเพิ่มเติม" */
function OptionList({
  name,
  values,
  selected,
  onSelect,
  allLabel,
}: {
  name: string;
  values: FacetValue[];
  selected: string;
  onSelect: (value: string) => void;
  allLabel: string;
}) {
  const [expanded, setExpanded] = useState(false);
  const LIMIT = 6;
  const shown = expanded ? values : values.slice(0, LIMIT);

  return (
    <>
      <RadioOption
        name={name}
        label={allLabel}
        checked={selected === ""}
        onChange={() => onSelect("")}
      />
      {shown.map((v) => (
        <RadioOption
          key={v.value}
          name={name}
          label={v.value}
          count={v.count}
          checked={selected === v.value}
          onChange={() => onSelect(v.value)}
        />
      ))}
      {values.length > LIMIT && (
        <button
          type="button"
          onClick={() => setExpanded((e) => !e)}
          className="mt-1 w-fit border-b border-stone-900 pb-0.5 text-xs font-semibold uppercase tracking-wider text-stone-900"
        >
          {expanded ? "แสดงน้อยลง" : "แสดงเพิ่มเติม"}
        </button>
      )}
    </>
  );
}

const PRICE_BASIS_OPTIONS: { value: PriceBasis; label: string }[] = [
  { value: "artwork", label: "ราคาชิ้นงาน" },
  { value: "copyright", label: "ราคาลิขสิทธิ์" },
];

export interface RangeOption {
  label: string;
  hint?: string;
  min?: number;
  max?: number;
}

/**
 * ช่วงขนาดผลงาน วัดจาก "ความกว้าง" ของชิ้นงาน (ตรงกับที่ backend กรองด้วย a.width)
 *
 * ป้ายเดิมเขียนว่า "เล็ก (น้อยกว่า 40)" ซึ่งไม่บอกว่า 40 อะไร และไม่บอกว่าวัดด้านไหน
 * คนซื้องานศิลปะคิดเป็น "ใหญ่แค่ไหนเมื่อแขวนบนผนัง" ไม่ใช่ตัวเลขลอย ๆ
 * จึงใส่หน่วยและของใกล้ตัวที่ขนาดพอ ๆ กันไว้เทียบ
 */
export const SIZE_RANGES: RangeOption[] = [
  { label: "เล็ก — กว้างไม่เกิน 40 ซม.", hint: "ประมาณกระดาษ A3", max: 40 },
  { label: "กลาง — กว้าง 40–60 ซม.", hint: "ประมาณโปสเตอร์หนัง", min: 40, max: 60 },
  { label: "ใหญ่ — กว้าง 60–80 ซม.", hint: "ประมาณหน้าจอทีวี 32 นิ้ว", min: 60, max: 80 },
  { label: "ใหญ่พิเศษ — กว้างเกิน 80 ซม.", hint: "เต็มผนังห้อง", min: 80 },
];

/** ฐานราคาที่สไลเดอร์กำลังกรองอยู่ */
export type PriceBasis = "artwork" | "copyright";

export const OFFER_OPTIONS: { value: ArtworkOffer; label: string; hint: string }[] = [
  { value: "all", label: "ทั้งหมด", hint: "ทุกชิ้นงานที่ยังขายอยู่" },
  {
    value: "with_copyright",
    label: "ซื้อลิขสิทธิ์ได้ด้วย",
    hint: "ซื้อตัวชิ้นงาน หรือขอซื้อลิขสิทธิ์ก็ได้",
  },
  {
    value: "original_only",
    label: "ขายเฉพาะตัวชิ้นงาน",
    hint: "ผู้ขายไม่ได้เปิดขายลิขสิทธิ์",
  },
];

export interface FilterState {
  artworkType: string;
  artworkStyle: string;
  artworkMediums: string;
  /**
   * ช่วงราคาที่ผู้ใช้ลากเอง — null = ไม่จำกัดด้านนั้น
   * ค่านี้หมายถึงราคาของฐานที่เลือกอยู่ใน priceBasis ไม่ใช่ราคาขายชิ้นงานเสมอไป
   */
  minPrice: number | null;
  maxPrice: number | null;
  /** กรองช่วงราคาจากราคาขายชิ้นงาน หรือราคาลิขสิทธิ์ */
  priceBasis: PriceBasis;
  sizeIndex: number; // -1 = ไม่กรอง
  /** ผู้ขายเปิดขายอะไรของชิ้นนั้นบ้าง */
  offer: ArtworkOffer;
}

export function FilterSidebar({
  facets,
  value,
  onChange,
  onReset,
  activeCount,
}: {
  facets: {
    types: FacetValue[];
    styles: FacetValue[];
    mediums: FacetValue[];
    /** ขอบล่าง/บนของสไลเดอร์ — มาจากราคาจริงที่มีอยู่ในฐานข้อมูล */
    minPrice: number | null;
    maxPrice: number | null;
    minCopyrightPrice: number | null;
    maxCopyrightPrice: number | null;
    withCopyrightCount: number;
    originalOnlyCount: number;
  };
  value: FilterState;
  onChange: (patch: Partial<FilterState>) => void;
  onReset: () => void;
  activeCount: number;
}) {
  return (
    <aside className="w-full lg:w-64 lg:shrink-0">
      <div className="flex items-center justify-between border-b border-stone-300 pb-3">
        <h2 className="text-sm font-bold uppercase tracking-wider text-stone-900">ตัวกรอง</h2>
        {activeCount > 0 && (
          <button
            type="button"
            onClick={onReset}
            className="text-xs font-semibold text-stone-500 underline underline-offset-2 hover:text-stone-900"
          >
            ล้างทั้งหมด ({activeCount})
          </button>
        )}
      </div>

      {/*
        วางไว้บนสุดเพราะเป็นคำถามแรกที่ผู้ซื้อตอบในใจ — "จะซื้อตัวงาน หรือจะซื้อสิทธิ์ไปใช้"
        ตัวเลือกที่เหลือ (ประเภท สไตล์ เทคนิค) เป็นการกรองภายในคำตอบนั้นอีกที
      */}
      <FilterGroup title="สิ่งที่ขาย">
        {OFFER_OPTIONS.map((o) => (
          <RadioOption
            key={o.value}
            name="offer"
            label={o.label}
            hint={o.hint}
            count={
              o.value === "with_copyright"
                ? facets.withCopyrightCount
                : o.value === "original_only"
                  ? facets.originalOnlyCount
                  : undefined
            }
            checked={value.offer === o.value}
            onChange={() => onChange({ offer: o.value })}
          />
        ))}
      </FilterGroup>

      <FilterGroup title="ประเภทงานศิลปะ">
        <OptionList
          name="artworkType"
          values={facets.types}
          selected={value.artworkType}
          onSelect={(v) => onChange({ artworkType: v })}
          allLabel="ทุกประเภท"
        />
      </FilterGroup>

      <FilterGroup title="สไตล์">
        <OptionList
          name="artworkStyle"
          values={facets.styles}
          selected={value.artworkStyle}
          onSelect={(v) => onChange({ artworkStyle: v })}
          allLabel="ทุกสไตล์"
        />
      </FilterGroup>

      <FilterGroup title="เทคนิค">
        <OptionList
          name="artworkMediums"
          values={facets.mediums}
          selected={value.artworkMediums}
          onSelect={(v) => onChange({ artworkMediums: v })}
          allLabel="ทุกเทคนิค"
        />
      </FilterGroup>

      <FilterGroup title="ขนาดชิ้นงาน">
        <RadioOption
          name="size"
          label="ทุกขนาด"
          checked={value.sizeIndex === -1}
          onChange={() => onChange({ sizeIndex: -1 })}
        />
        {SIZE_RANGES.map((r, i) => (
          <RadioOption
            key={r.label}
            name="size"
            label={r.label}
            hint={r.hint}
            checked={value.sizeIndex === i}
            onChange={() => onChange({ sizeIndex: i })}
          />
        ))}
      </FilterGroup>

      <FilterGroup title="ช่วงราคา">
        {/*
          สไลเดอร์มีรางเดียวแต่สลับได้ว่ากำลังกรองราคาอะไรอยู่
          ไม่ทำเป็นสองรางพร้อมกันเพราะคนซื้อมาด้วยความตั้งใจอย่างใดอย่างหนึ่ง
          (จะซื้อภาพ หรือจะซื้อสิทธิ์) สองรางจะกลายเป็นเงื่อนไข AND ที่กรองทิ้งเกินจำเป็น
        */}
        <div
          role="group"
          aria-label="เลือกว่าจะกรองด้วยราคาอะไร"
          className="mb-1 flex rounded-lg border border-stone-300 p-0.5"
        >
          {PRICE_BASIS_OPTIONS.map((b) => (
            <button
              key={b.value}
              type="button"
              aria-pressed={value.priceBasis === b.value}
              disabled={b.value === "copyright" && facets.maxCopyrightPrice === null}
              /*
                สลับไปฐานราคาลิขสิทธิ์ = ตั้งตัวกรอง "ซื้อลิขสิทธิ์ได้ด้วย" ให้ด้วย
                งานที่ไม่ได้เปิดขายลิขสิทธิ์ไม่มีราคาลิขสิทธิ์ให้เทียบเลย
                ถ้าปล่อยค้างไว้ในผลลัพธ์ ผู้ใช้จะลากสไลเดอร์แล้วเห็นงานที่ไม่เกี่ยวข้องคาอยู่
                และราคาบนการ์ดก็จะเป็นคนละฐานกับที่กำลังกรองอยู่

                ช่วงราคาที่ลากไว้ต้องล้างทุกครั้งที่สลับ เพราะสองฐานคนละสเกลกัน
                (ราคาลิขสิทธิ์เป็นหลายเท่าของราคาขาย) ค่าที่ค้างไว้จะกรองทิ้งเกือบหมด
              */
              onClick={() =>
                onChange({
                  priceBasis: b.value,
                  minPrice: null,
                  maxPrice: null,
                  ...(b.value === "copyright" ? { offer: "with_copyright" as const } : {}),
                })
              }
              className={`flex-1 rounded-md px-2 py-1.5 text-xs font-semibold transition disabled:cursor-not-allowed disabled:text-stone-300 ${
                value.priceBasis === b.value
                  ? "bg-stone-900 text-white"
                  : "text-stone-600 hover:bg-stone-100"
              }`}
            >
              {b.label}
            </button>
          ))}
        </div>

        {/*
          ขอบสไลเดอร์มาจากราคาจริงในฐานข้อมูล ไม่ใช่ค่าที่ hardcode ไว้
          ถ้าผู้ขายลงงานราคาสูงกว่าเพดานเดิม สไลเดอร์จะขยายตามเอง
          เริ่มที่ 0 เสมอเพื่อให้ตัวเลขใต้รางอ่านง่ายและลากกลับมาสุดซ้ายได้

          key บังคับให้ React สร้างสไลเดอร์ใหม่ตอนสลับฐานราคา
          ไม่งั้นช่องกรอกตัวเลขจะค้างตัวเลขของฐานเดิมไว้ (ดูเหตุผลใน PriceRangeSlider)
        */}
        <PriceRangeSlider
          key={value.priceBasis}
          floor={0}
          ceiling={
            value.priceBasis === "copyright"
              ? facets.maxCopyrightPrice ?? 300000
              : facets.maxPrice ?? 100000
          }
          min={value.minPrice}
          max={value.maxPrice}
          onChange={(next) => onChange({ minPrice: next.min, maxPrice: next.max })}
        />

        {value.priceBasis === "copyright" && (
          <p className="rounded-md bg-stone-100 px-2.5 py-2 text-xs leading-relaxed text-stone-600">
            กำลังกรองด้วยราคาลิขสิทธิ์ — ระบบเลือก &quot;ซื้อลิขสิทธิ์ได้ด้วย&quot; ให้แล้ว
            เพราะงานที่ไม่ได้ขายลิขสิทธิ์ไม่มีราคาส่วนนี้
          </p>
        )}
      </FilterGroup>
    </aside>
  );
}
