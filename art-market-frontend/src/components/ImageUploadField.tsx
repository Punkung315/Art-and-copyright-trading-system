"use client";

import { useRef, useState } from "react";
import { Button } from "./ui";
import { fileToDataUrl } from "@/lib/storage";

const ACCEPTED = ["image/png", "image/jpeg"];

/**
 * ช่องอัปโหลดรูปพร้อมปุ่มที่กดได้ชัดเจน
 *
 * ของเดิมใช้ <input type="file"> ดิบๆ ซึ่งหน้าตาต่างกันไปตามเบราว์เซอร์
 * และกลืนไปกับฟอร์มจนผู้ใช้ไม่รู้ว่าต้องกดตรงไหน
 * ที่นี่ซ่อน input จริงไว้แล้วให้ปุ่มกับพื้นที่วางไฟล์เป็นตัวกด
 * รองรับลากไฟล์มาวางด้วย เพราะเป็นสิ่งที่คนคาดหวังจากช่องอัปโหลดรูป
 */
export function ImageUploadField({
  label,
  value,
  onChange,
  onError,
  hint = "รองรับไฟล์ .png และ .jpg",
}: {
  label: string;
  value?: string;
  onChange: (dataUrl: string) => void;
  onError?: (message: string) => void;
  hint?: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);

  async function accept(file: File | undefined | null) {
    if (!file) return;
    if (!ACCEPTED.includes(file.type)) {
      onError?.("ประเภทไฟล์ไม่ถูกต้อง ต้องเป็นไฟล์ png หรือ jpg เท่านั้น");
      return;
    }
    setFileName(file.name);
    onChange(await fileToDataUrl(file));
  }

  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-sm font-medium text-stone-700">{label}</span>

      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          accept(e.dataTransfer.files?.[0]);
        }}
        className={`flex flex-col items-center gap-3 rounded-xl border-2 border-dashed p-5 text-center transition sm:flex-row sm:text-left ${
          dragging ? "border-stone-900 bg-stone-100" : "border-stone-300 bg-stone-50"
        }`}
      >
        {value ? (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img
            src={value}
            alt="ตัวอย่างรูปที่เลือก"
            className="h-24 w-24 shrink-0 rounded-lg border border-stone-200 object-cover"
          />
        ) : (
          <div className="flex h-24 w-24 shrink-0 items-center justify-center rounded-lg border border-stone-200 bg-white text-stone-300">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <rect x="3" y="3" width="18" height="18" rx="2" />
              <circle cx="8.5" cy="8.5" r="1.5" />
              <path d="m21 15-5-5L5 21" />
            </svg>
          </div>
        )}

        <div className="flex flex-col items-center gap-2 sm:items-start">
          <div className="flex flex-wrap justify-center gap-2 sm:justify-start">
            <Button type="button" variant="secondary" onClick={() => inputRef.current?.click()}>
              {value ? "เปลี่ยนรูปภาพ" : "เลือกรูปภาพ"}
            </Button>
            {value && (
              <Button
                type="button"
                variant="ghost"
                onClick={() => {
                  setFileName(null);
                  onChange("");
                  // ต้องล้างค่าของ input ด้วย ไม่งั้นเลือกไฟล์ "เดิม" ซ้ำจะไม่เกิด onChange
                  if (inputRef.current) inputRef.current.value = "";
                }}
              >
                ลบรูป
              </Button>
            )}
          </div>
          <p className="text-xs text-stone-500">
            {fileName ? `เลือกไฟล์: ${fileName}` : `ลากไฟล์มาวางที่นี่ หรือกดปุ่มเพื่อเลือก · ${hint}`}
          </p>
        </div>
      </div>

      {/* input จริงถูกซ่อนไว้ ให้ปุ่มด้านบนเป็นตัวเปิดหน้าต่างเลือกไฟล์แทน */}
      <input
        ref={inputRef}
        type="file"
        accept="image/png,image/jpeg"
        className="hidden"
        onChange={(e) => accept(e.target.files?.[0])}
      />
    </div>
  );
}
