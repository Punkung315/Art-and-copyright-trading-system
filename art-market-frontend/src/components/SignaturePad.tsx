"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "./ui";
import { fileToDataUrl } from "@/lib/storage";
import { validateImageFile } from "@/lib/validation";

/**
 * ช่องลงลายมือชื่อ — วาดบนหน้าจอ หรืออัปโหลดไฟล์รูปลายเซ็นที่มีอยู่แล้ว
 *
 * ผลลัพธ์เป็น data URL ของ PNG พื้นหลังโปร่งใส ซึ่งเป็นรูปแบบเดียวกับที่
 * backend รับอยู่แล้ว (คอลัมน์ seller_signature/buyer_signature เป็น LONGTEXT)
 * เปลี่ยนจาก "อัปโหลดไฟล์" มาเป็น "วาดบนจอ" จึงไม่ต้องแก้ backend เลย
 *
 * ทำไมต้องวาดบนจอ:
 *   พ.ร.บ. ธุรกรรมทางอิเล็กทรอนิกส์ ม.9 เป็นกลางทางเทคโนโลยี — ลายเซ็นที่วาด
 *   กับที่สแกนมาอยู่ระดับเดียวกัน ขอแค่ระบุตัวผู้ลงนามได้และแสดงเจตนายอมรับ
 *   จึงไม่มีเหตุผลทางกฎหมายที่ต้องบังคับให้ผู้ใช้ไปพิมพ์แล้วสแกนกลับมา
 *   ซึ่งเป็นขั้นตอนที่ยุ่งที่สุดและทำบนมือถือแทบไม่ได้
 */

/** ขนาดพื้นที่วาด (หน่วย CSS pixel) — สูงพอให้เซ็นด้วยนิ้วบนมือถือได้ */
const PAD_HEIGHT = 180;
const STROKE_COLOR = "#1a1f28";
const STROKE_WIDTH = 2.5;

type Mode = "draw" | "upload";

export function SignaturePad({
  value,
  onChange,
  disabled = false,
  label = "ลายมือชื่อ",
  hint,
}: {
  /** data URL ของลายเซ็น — ว่าง = ยังไม่ได้เซ็น */
  value: string;
  onChange: (dataUrl: string) => void;
  disabled?: boolean;
  label?: string;
  hint?: string;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawingRef = useRef(false);
  const lastRef = useRef<{ x: number; y: number } | null>(null);
  const hasInkRef = useRef(false);

  const [mode, setMode] = useState<Mode>("draw");
  const [fileError, setFileError] = useState<string | null>(null);

  /** ตั้งค่าบริบทวาดใหม่ทุกครั้งที่ขนาด canvas เปลี่ยน (การ set width/height ล้างค่าเดิมทิ้ง) */
  const applyContextStyle = useCallback((ctx: CanvasRenderingContext2D, dpr: number) => {
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.scale(dpr, dpr);
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.lineWidth = STROKE_WIDTH;
    ctx.strokeStyle = STROKE_COLOR;
  }, []);

  /**
   * ปรับ backing store ให้คมบนจอความละเอียดสูง
   *
   * ถ้าใช้ขนาด CSS ตรงๆ เส้นจะเบลอบนจอ retina/มือถือ
   * และเพราะการเปลี่ยน canvas.width ล้างภาพเดิมทิ้ง จึงต้องเก็บภาพไว้ก่อนแล้ววาดคืน
   * ไม่งั้นแค่หมุนจอมือถือ ลายเซ็นที่เซ็นไปแล้วจะหายเกลี้ยง
   */
  const resizeCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    if (rect.width === 0) return;

    const dpr = window.devicePixelRatio || 1;
    const nextW = Math.round(rect.width * dpr);
    const nextH = Math.round(PAD_HEIGHT * dpr);
    if (canvas.width === nextW && canvas.height === nextH) return;

    const previous = hasInkRef.current ? canvas.toDataURL("image/png") : null;
    canvas.width = nextW;
    canvas.height = nextH;
    applyContextStyle(ctx, dpr);

    if (previous) {
      const img = new Image();
      img.onload = () => ctx.drawImage(img, 0, 0, rect.width, PAD_HEIGHT);
      img.src = previous;
    }
  }, [applyContextStyle]);

  /**
   * เฝ้าขนาดของ canvas เอง ไม่ใช่ขนาดหน้าต่าง
   *
   * ถ้าใช้ window resize อย่างเดียวจะพลาดกรณีที่ทำให้เส้นไม่ตรงกับเมาส์:
   * ตอน effect ทำงานครั้งแรก layout อาจยังไม่นิ่ง (ฟอนต์ยังโหลด, การ์ดยังจัดขนาดไม่เสร็จ)
   * ทำให้วัด rect.width ได้ค่าหนึ่ง แล้วตั้ง backing store ตามค่านั้น
   * พอ layout นิ่งแล้วความกว้างจริงเปลี่ยนไป แต่ window ไม่ได้ resize เลยไม่มีใครแจ้ง
   * → canvas ถูกยืดให้พอดีกรอบใหม่ พิกัดที่วาดจึงเพี้ยนจากตำแหน่งเมาส์
   *   (ยิ่งลากไปทางขวายิ่งห่าง เพราะเป็นการสเกลเชิงเส้น)
   *
   * ResizeObserver จับทุกการเปลี่ยนขนาดของตัว element เอง จึงตรงจุดกว่า
   */
  useEffect(() => {
    resizeCanvas();
    const canvas = canvasRef.current;
    if (!canvas || typeof ResizeObserver === "undefined") {
      window.addEventListener("resize", resizeCanvas);
      return () => window.removeEventListener("resize", resizeCanvas);
    }
    const observer = new ResizeObserver(() => resizeCanvas());
    observer.observe(canvas);
    return () => observer.disconnect();
  }, [resizeCanvas]);

  /**
   * ล้าง canvas เมื่อ value ถูกล้างจากภายนอก (เช่นฟอร์มรีเซ็ตหลังบันทึกสำเร็จ)
   * ถ้าไม่ทำ ลายเซ็นเดิมจะค้างบนจอทั้งที่ state เป็นค่าว่างแล้ว
   */
  useEffect(() => {
    if (value !== "" || !hasInkRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    hasInkRef.current = false;
  }, [value]);

  function positionOf(e: React.PointerEvent<HTMLCanvasElement>) {
    const rect = e.currentTarget.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  }

  function handlePointerDown(e: React.PointerEvent<HTMLCanvasElement>) {
    if (disabled) return;
    const ctx = e.currentTarget.getContext("2d");
    if (!ctx) return;
    // จับ pointer ไว้กับ canvas เพื่อให้ลากออกนอกกรอบแล้วกลับเข้ามาได้ต่อเนื่อง
    e.currentTarget.setPointerCapture(e.pointerId);
    drawingRef.current = true;
    const p = positionOf(e);
    lastRef.current = p;
    ctx.beginPath();
    ctx.moveTo(p.x, p.y);
    // จุดเดียวก็ถือว่าเซ็นแล้ว (เช่นเซ็นเป็นจุด) จึงวาดวงเล็กๆ ไว้ทันที
    ctx.lineTo(p.x + 0.1, p.y);
    ctx.stroke();
    hasInkRef.current = true;
  }

  function handlePointerMove(e: React.PointerEvent<HTMLCanvasElement>) {
    if (!drawingRef.current || disabled) return;
    const ctx = e.currentTarget.getContext("2d");
    if (!ctx) return;

    /*
     * ใช้จุดที่เบราว์เซอร์เก็บสะสมไว้ระหว่างสองเฟรมด้วย (coalesced events)
     *
     * ตอนลากเร็ว ๆ เบราว์เซอร์ยิง pointermove มาให้เฟรมละครั้ง แต่จริง ๆ
     * มันบันทึกตำแหน่งระหว่างทางไว้หมด ถ้าไม่ดึงมาใช้ เส้นจะกลายเป็นเส้นตรงยาว ๆ
     * ตัดมุมโค้งที่ผู้ใช้ลากจริงทิ้งไป — ลายเซ็นเลยดูไม่เหมือนที่เซ็น
     */
    const events =
      typeof e.nativeEvent.getCoalescedEvents === "function"
        ? e.nativeEvent.getCoalescedEvents()
        : [e.nativeEvent];

    const rect = e.currentTarget.getBoundingClientRect();
    for (const ev of events.length > 0 ? events : [e.nativeEvent]) {
      const last = lastRef.current;
      if (!last) break;
      const p = { x: ev.clientX - rect.left, y: ev.clientY - rect.top };
      // ลากผ่านจุดกึ่งกลางด้วยเส้นโค้ง ทำให้ลายเส้นลื่นกว่าการต่อเส้นตรงทีละจุด
      const mid = { x: (last.x + p.x) / 2, y: (last.y + p.y) / 2 };
      ctx.quadraticCurveTo(last.x, last.y, mid.x, mid.y);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(mid.x, mid.y);
      lastRef.current = p;
    }
  }

  function handlePointerUp(e: React.PointerEvent<HTMLCanvasElement>) {
    if (!drawingRef.current) return;
    const canvas = e.currentTarget;
    const ctx = canvas.getContext("2d");

    /*
     * ปิดท้ายเส้นให้ถึงตำแหน่งที่ปล่อยมือจริง
     *
     * การลากผ่านจุดกึ่งกลางทำให้เส้นวาดไปได้แค่ "กึ่งกลางของสองจุดสุดท้าย"
     * จุดสุดท้ายจริง ๆ จึงไม่เคยถูกวาด เส้นเลยสั้นกว่าที่เมาส์ไปถึงเสมอ
     * ยิ่งลากเร็ว ระยะที่ขาดหายยิ่งมาก — เห็นเป็นอาการ "เส้นตามเมาส์ไม่ทัน"
     */
    const last = lastRef.current;
    if (ctx && last) {
      ctx.lineTo(last.x, last.y);
      ctx.stroke();
    }

    drawingRef.current = false;
    lastRef.current = null;
    if (canvas.hasPointerCapture(e.pointerId)) canvas.releasePointerCapture(e.pointerId);
    // ส่งค่าออกเมื่อปล่อยมือ ไม่ใช่ทุก pointermove — ไม่งั้นจะ export ภาพรัวๆ ระหว่างลาก
    onChange(canvas.toDataURL("image/png"));
  }

  function clear() {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (canvas && ctx) ctx.clearRect(0, 0, canvas.width, canvas.height);
    hasInkRef.current = false;
    setFileError(null);
    onChange("");
  }

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0] ?? null;
    const err = validateImageFile(file);
    setFileError(err);
    if (err || !file) return;
    onChange(await fileToDataUrl(file));
  }

  const uploadedPreview = mode === "upload" && value ? value : null;

  return (
    <div>
      <div className="mb-1 flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm font-medium text-stone-700">{label}</p>
        <div className="flex gap-1 rounded-lg bg-stone-100 p-0.5">
          {(["draw", "upload"] as Mode[]).map((m) => (
            <button
              key={m}
              type="button"
              disabled={disabled}
              onClick={() => {
                setMode(m);
                // สลับวิธีแล้วเริ่มใหม่เสมอ กันสับสนว่าค่าที่ค้างอยู่มาจากวิธีไหน
                clear();
              }}
              className={`rounded-md px-3 py-1 text-xs font-medium transition ${
                mode === m ? "bg-white text-stone-900 shadow-sm" : "text-stone-500 hover:text-stone-700"
              }`}
            >
              {m === "draw" ? "วาดลายเซ็น" : "อัปโหลดรูป"}
            </button>
          ))}
        </div>
      </div>

      {hint && <p className="mb-2 text-xs text-stone-500">{hint}</p>}

      {mode === "draw" ? (
        <>
          <div className="relative rounded-lg border border-stone-300 bg-white">
            <canvas
              ref={canvasRef}
              style={{ height: PAD_HEIGHT, touchAction: "none" }}
              className="w-full cursor-crosshair rounded-lg"
              onPointerDown={handlePointerDown}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
              onPointerCancel={handlePointerUp}
              aria-label={label}
            />
            {/* เส้นบรรทัดให้เซ็นทับ ไม่รับ event เพื่อไม่ให้บังการวาด */}
            <div className="pointer-events-none absolute inset-x-6 bottom-9 border-b border-dashed border-stone-300" />
            {!value && (
              <p className="pointer-events-none absolute inset-0 flex items-center justify-center text-sm text-stone-400">
                เซ็นชื่อตรงนี้
              </p>
            )}
          </div>
          <div className="mt-2 flex items-center justify-between">
            <p className="text-xs text-stone-400">ใช้เมาส์ นิ้ว หรือปากกาก็ได้</p>
            <Button type="button" variant="ghost" disabled={disabled || !value} onClick={clear}>
              ล้างลายเซ็น
            </Button>
          </div>
        </>
      ) : (
        <>
          <input
            type="file"
            accept="image/png,image/jpeg"
            disabled={disabled}
            onChange={handleFile}
            className="block w-full text-sm text-stone-600 file:mr-3 file:rounded-lg file:border-0 file:bg-stone-900 file:px-3 file:py-2 file:text-white"
          />
          {fileError && <p className="mt-1 text-xs text-rose-600">{fileError}</p>}
          {uploadedPreview && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={uploadedPreview}
              alt={label}
              className="mt-2 h-24 rounded-lg border border-stone-200 bg-white object-contain p-1"
            />
          )}
        </>
      )}
    </div>
  );
}
