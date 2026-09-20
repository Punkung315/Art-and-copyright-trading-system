"use client";

import { useState } from "react";
import { FacetValue } from "@/lib/api";
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
  count,
  checked,
  onChange,
}: {
  name: string;
  label: string;
  count?: number;
  checked: boolean;
  onChange: () => void;
}) {
  return (
    <label className="flex cursor-pointer items-center gap-2.5 text-sm text-stone-700 hover:text-stone-900">
      <input
        type="radio"
        name={name}
        checked={checked}
        onChange={onChange}
        className="h-4 w-4 accent-stone-900"
      />
      <span className="flex-1">{label}</span>
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

export interface RangeOption {
  label: string;
  min?: number;
  max?: number;
}

/** ช่วงขนาดผลงาน — อ้างอิงค่า artworkSize ที่ผู้ขายกรอกตอนลงงาน */
export const SIZE_RANGES: RangeOption[] = [
  { label: "เล็ก (น้อยกว่า 40)", max: 40 },
  { label: "กลาง (40 - 60)", min: 40, max: 60 },
  { label: "ใหญ่ (60 - 80)", min: 60, max: 80 },
  { label: "ใหญ่พิเศษ (มากกว่า 80)", min: 80 },
];

export interface FilterState {
  artworkType: string;
  artworkStyle: string;
  artworkMediums: string;
  /** ช่วงราคาที่ผู้ใช้ลากเอง — null = ไม่จำกัดด้านนั้น */
  minPrice: number | null;
  maxPrice: number | null;
  sizeIndex: number; // -1 = ไม่กรอง
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

      <FilterGroup title="ขนาด">
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
            checked={value.sizeIndex === i}
            onChange={() => onChange({ sizeIndex: i })}
          />
        ))}
      </FilterGroup>

      <FilterGroup title="ช่วงราคา">
        {/*
          ขอบสไลเดอร์มาจากราคาจริงในฐานข้อมูล ไม่ใช่ค่าที่ hardcode ไว้
          ถ้าผู้ขายลงงานราคาสูงกว่าเพดานเดิม สไลเดอร์จะขยายตามเอง
          เริ่มที่ 0 เสมอเพื่อให้ตัวเลขใต้รางอ่านง่ายและลากกลับมาสุดซ้ายได้
        */}
        <PriceRangeSlider
          floor={0}
          ceiling={facets.maxPrice ?? 100000}
          min={value.minPrice}
          max={value.maxPrice}
          onChange={(next) => onChange({ minPrice: next.min, maxPrice: next.max })}
        />
      </FilterGroup>
    </aside>
  );
}
