"use client";

import { ButtonHTMLAttributes, InputHTMLAttributes, LabelHTMLAttributes, SelectHTMLAttributes, TextareaHTMLAttributes } from "react";

export function Button({
  variant = "primary",
  className = "",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "ghost" | "danger";
}) {
  const base =
    "inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold transition disabled:opacity-50 disabled:cursor-not-allowed";
  const styles: Record<string, string> = {
    primary: "bg-stone-900 text-white hover:bg-stone-700",
    secondary: "bg-white text-stone-900 border border-stone-300 hover:bg-stone-50",
    ghost: "text-stone-700 hover:bg-stone-100",
    danger: "bg-rose-600 text-white hover:bg-rose-700",
  };
  return <button className={`${base} ${styles[variant]} ${className}`} {...props} />;
}

export function Field({
  label,
  error,
  htmlFor,
  children,
}: {
  label: string;
  error?: string | null;
  htmlFor?: string;
  children: React.ReactNode;
}) {
  /*
   * ให้ <label> ครอบตัวช่องกรอกไว้เลย
   *
   * ของเดิม label กับ input เป็นพี่น้องกันและไม่มี htmlFor ผูกไว้ จึงไม่มีความสัมพันธ์กัน
   * ทางความหมายเลย — คลิกที่ข้อความไม่โฟกัสช่อง โปรแกรมอ่านหน้าจอไม่รู้ว่าช่องนี้คืออะไร
   * และเทสอัตโนมัติต้องอ้างช่องด้วยลำดับ (.nth(3)) ซึ่งพังทันทีที่มีการเพิ่มช่องใหม่
   * การให้ label ครอบไว้ผูกให้อัตโนมัติโดยไม่ต้องแจก id ทีละช่อง
   */
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={htmlFor} className="flex flex-col gap-1.5">
        <span className="text-sm font-medium text-stone-700">{label}</span>
        {children}
      </label>
      {error && <p className="text-xs text-rose-600">{error}</p>}
    </div>
  );
}

export function Input(props: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className={`w-full rounded-lg border border-stone-300 bg-white px-3 py-2.5 text-sm text-stone-900 placeholder:text-stone-400 focus:border-stone-500 focus:outline-none focus:ring-2 focus:ring-stone-200 ${props.className ?? ""}`}
    />
  );
}

export function Textarea(props: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      {...props}
      className={`w-full rounded-lg border border-stone-300 bg-white px-3 py-2.5 text-sm text-stone-900 placeholder:text-stone-400 focus:border-stone-500 focus:outline-none focus:ring-2 focus:ring-stone-200 ${props.className ?? ""}`}
    />
  );
}

export function Select(props: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      {...props}
      className={`w-full rounded-lg border border-stone-300 bg-white px-3 py-2.5 text-sm text-stone-900 focus:border-stone-500 focus:outline-none focus:ring-2 focus:ring-stone-200 ${props.className ?? ""}`}
    />
  );
}

export function Label(props: LabelHTMLAttributes<HTMLLabelElement>) {
  return <label {...props} className={`text-sm font-medium text-stone-700 ${props.className ?? ""}`} />;
}

export function Card({ className = "", ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={`rounded-xl border border-stone-200 bg-white shadow-sm ${className}`}
      {...props}
    />
  );
}

export function Container({ className = "", ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={`mx-auto w-full max-w-6xl px-4 sm:px-6 ${className}`} {...props} />;
}

export function EmptyState({ title, description }: { title: string; description?: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-stone-300 bg-stone-50 py-16 text-center">
      <p className="text-base font-semibold text-stone-700">{title}</p>
      {description && <p className="text-sm text-stone-500">{description}</p>}
    </div>
  );
}

export function Spinner() {
  return (
    <div className="flex items-center justify-center py-16">
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-stone-300 border-t-stone-900" />
    </div>
  );
}
