"use client";

import { use, useEffect, useState } from "react";
import { RequireUser } from "@/components/RoleGuard";
import { getQuotation } from "@/lib/api";
import { Quotation } from "@/types";
import { Button, Card, Container, Spinner } from "@/components/ui";
import { BANK_ACCOUNT } from "@/components/BankTransferInfo";
import { bahtText } from "@/lib/bahtText";

/** เลขที่เอกสาร — ใช้เลขคำสั่งซื้อเติมศูนย์ให้ครบ 5 หลัก เช่น QT-00012 */
function documentNo(orderId: string): string {
  const digits = orderId.replace(/\D/g, "");
  return `QT-${(digits || orderId).padStart(5, "0")}`;
}

function thaiDate(iso?: string): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("th-TH", { day: "numeric", month: "long", year: "numeric" });
}

/** จำนวนเงินในเอกสาร — คั่นหลักพันและบังคับทศนิยม 2 ตำแหน่งเสมอตามแบบใบเสนอราคา */
function money(n: number): string {
  return n.toLocaleString("th-TH", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

/** บรรทัดข้อมูลติดต่อแบบ "หัวข้อ : ค่า" ให้เครื่องหมาย : ตรงกันทุกบรรทัด */
function InfoLine({ label, value }: { label: string; value?: string | null }) {
  if (!value) return null;
  return (
    <div className="flex gap-1 text-[13px] leading-relaxed">
      <span className="w-36 shrink-0 text-stone-500">{label}</span>
      <span className="shrink-0 text-stone-400">:</span>
      <span className="min-w-0 flex-1 text-stone-800">{value}</span>
    </div>
  );
}

/** แถวสรุปยอดฝั่งขวาของตาราง */
function SummaryLine({
  label,
  value,
  muted = false,
}: {
  label: string;
  value: string;
  muted?: boolean;
}) {
  return (
    <div className="flex justify-end gap-3 text-[13px] leading-6">
      <span className={muted ? "text-stone-400" : "text-stone-500"}>{label}</span>
      <span className="shrink-0 text-stone-400">:</span>
      <span className={`w-28 text-right ${muted ? "text-stone-400" : "text-stone-800"}`}>
        {value}
      </span>
    </div>
  );
}

function QuotationContent({ id }: { id: string }) {
  const [quotation, setQuotation] = useState<Quotation | null | undefined>(undefined);

  useEffect(() => {
    getQuotation(id).then((q) => setQuotation(q ?? null));
  }, [id]);

  if (quotation === undefined) return <Spinner />;
  if (quotation === null) {
    return (
      <Container className="py-16 text-center text-stone-600">
        ไม่พบใบเสนอราคาของคำสั่งซื้อนี้
      </Container>
    );
  }

  const q = quotation;

  /*
   * ยอดในเอกสารต้องเป็นยอดที่ผู้ซื้อจ่ายจริง = ตัดชิ้นที่ผู้ขายแจ้งไม่พร้อมจำหน่ายออก
   * ถ้าโชว์ยอดเต็มของคำสั่งซื้อ ผู้ซื้อจะโอนเกินและไม่ตรงกับยอดที่ backend บันทึกไว้
   * ชิ้นที่ถูกตัดยังคงแสดงในตารางอยู่ (ทำเป็นสีจาง) เพื่อให้เห็นว่าเคยสั่งอะไรไปบ้าง
   *
   * ใช้ยอด payable ได้ก็ต่อเมื่อผู้ขายตอบครบทุกชิ้นแล้วเท่านั้น
   * ยอด payable นับเฉพาะชิ้นที่ตอบว่าพร้อมขาย ชิ้นที่ยังรอตอบจึงถูกหักออกไปด้วย
   * ถ้าเอามาใช้ตอนยังตอบไม่ครบ ใบเสนอราคาจะบอกยอดต่ำกว่าความจริง
   */
  const waiting = q.items.some((i) => i.availabilityStatus === "waiting");
  const useNet = q.partial && !waiting;
  const netTotal = useNet ? q.payableTotalAmount : q.totalAmount;
  const netShipping = useNet ? q.payableShippingCost : q.shippingCost;
  const netGrand = useNet ? q.payableGrandTotal : q.grandTotal;

  const bank = BANK_ACCOUNT;

  return (
    <Container className="py-10 print:py-0">
      <div className="mx-auto mb-4 flex max-w-3xl justify-end print:hidden">
        <Button onClick={() => window.print()}>พิมพ์ใบเสนอราคา</Button>
      </div>

      <Card className="mx-auto max-w-3xl p-8 text-stone-900 print:max-w-none print:border-0 print:p-0 print:shadow-none">
        {/* ---------------- หัวเอกสาร ---------------- */}
        <header className="flex items-start justify-between gap-6">
          <div>
            <h1 className="font-serif text-3xl font-bold leading-tight text-stone-900">
              ใบเสนอราคา
            </h1>
            <p className="font-serif text-xl text-stone-400">Quotation</p>
          </div>
          <div className="text-right text-[13px] leading-relaxed text-stone-600">
            <p>
              เลขที่ใบเสนอราคา : <span className="font-medium text-stone-900">{documentNo(q.orderId)}</span>
            </p>
            <p>วันที่ : {thaiDate(q.issuedAt)}</p>
            <p className="text-stone-500">อ้างอิงคำสั่งซื้อเลขที่ {q.orderId}</p>
          </div>
        </header>

        {/* ---------------- ผู้ขาย / ลูกค้า ---------------- */}
        <div className="mt-8 grid gap-8 sm:grid-cols-2">
          <div>
            <p className="mb-2 inline-block border-b border-stone-300 pb-0.5 text-sm font-semibold text-stone-900">
              ผู้เสนอราคา (ผู้ขาย)
            </p>
            <p className="text-[15px] font-semibold text-stone-900">{q.sellerName || "—"}</p>
            {q.sellerAddress && (
              <p className="mt-1 text-[13px] leading-relaxed text-stone-600">{q.sellerAddress}</p>
            )}
            {q.sellerTel && <p className="text-[13px] text-stone-600">โทร. {q.sellerTel}</p>}
            {q.sellerEmail && <p className="text-[13px] text-stone-600">{q.sellerEmail}</p>}
            <p className="mt-1 text-[13px] text-stone-500">
              เสนอผ่านระบบซื้อขายผลงานศิลปะ Artmara
            </p>
          </div>

          <div>
            <p className="mb-2 inline-block border-b border-stone-300 pb-0.5 text-sm font-semibold text-stone-900">
              ข้อมูลลูกค้า
            </p>
            <InfoLine label="ชื่อลูกค้า" value={q.buyerName} />
            <InfoLine label="เลขประจำตัวผู้เสียภาษี" value={q.buyerTaxId} />
            <InfoLine label="เบอร์โทรศัพท์" value={q.buyerTel} />
            <InfoLine label="อีเมล" value={q.buyerEmail} />
            {/*
              ที่อยู่จัดส่งคือที่อยู่ที่ผูกกับคำสั่งซื้อใบนี้ (สำเนา ณ วันที่สั่ง)
              ที่อยู่ในโปรไฟล์เป็นคนละอันและเปลี่ยนทีหลังได้ จึงใช้เป็นที่อยู่สำรองเท่านั้น
            */}
            <InfoLine label="ที่อยู่จัดส่ง" value={q.shippingAddress ?? q.buyerAddress} />
          </div>
        </div>

        {/* ---------------- ตารางรายการ ---------------- */}
        <table className="mt-8 w-full border-collapse text-[13px]">
          <thead>
            {/* print-color-adjust: exact — ไม่งั้นเบราว์เซอร์ตัดพื้นหลังสีทิ้งตอนพิมพ์ แถบหัวตารางจะหายไปทั้งแถบ */}
            <tr className="bg-stone-800 text-white [print-color-adjust:exact] [-webkit-print-color-adjust:exact]">
              <th className="w-12 px-2 py-2.5 text-center font-semibold">ลำดับ</th>
              <th className="px-2 py-2.5 text-left font-semibold">รายการ</th>
              <th className="w-16 px-2 py-2.5 text-center font-semibold">จำนวน</th>
              <th className="w-28 px-2 py-2.5 text-right font-semibold">ราคา/หน่วย</th>
              <th className="w-28 px-2 py-2.5 text-right font-semibold">ราคารวม</th>
            </tr>
          </thead>
          <tbody>
            {q.items.map((item) => {
              const excluded = item.availabilityStatus === "rejected";
              return (
                <tr
                  key={item.no}
                  className={`border-b border-stone-200 align-top ${
                    excluded ? "text-stone-400" : "text-stone-800"
                  }`}
                >
                  <td className="px-2 py-2.5 text-center">{item.no}</td>
                  <td className="px-2 py-2.5">
                    <span className={excluded ? "line-through" : ""}>{item.artworkName}</span>
                    {item.sellerName && (
                      <span className="block text-[11px] text-stone-400">
                        ผู้ขาย: {item.sellerName}
                      </span>
                    )}
                    {excluded && (
                      <span className="block text-[11px] text-amber-700">
                        ผู้ขายแจ้งว่าไม่พร้อมจำหน่าย — ไม่รวมในยอดที่ต้องชำระ
                      </span>
                    )}
                  </td>
                  <td className="px-2 py-2.5 text-center">{item.quantity}</td>
                  <td className={`px-2 py-2.5 text-right ${excluded ? "line-through" : ""}`}>
                    {money(item.price)}
                  </td>
                  <td className={`px-2 py-2.5 text-right ${excluded ? "line-through" : ""}`}>
                    {money(item.amount)}
                  </td>
                </tr>
              );
            })}

            {/* ค่าจัดส่งเป็นบรรทัดของตัวเอง เพราะเป็นยอดที่ผู้ซื้อต้องโอนรวมไปด้วย */}
            <tr className="border-b border-stone-200 text-stone-800">
              <td className="px-2 py-2.5 text-center">{q.items.length + 1}</td>
              <td className="px-2 py-2.5">
                ค่าจัดส่ง
                {q.items.find((i) => i.shippingCompanyName)?.shippingCompanyName && (
                  <span className="block text-[11px] text-stone-400">
                    ขนส่งโดย {q.items.find((i) => i.shippingCompanyName)?.shippingCompanyName}
                  </span>
                )}
              </td>
              <td className="px-2 py-2.5 text-center">1</td>
              <td className="px-2 py-2.5 text-right">{money(netShipping)}</td>
              <td className="px-2 py-2.5 text-right">{money(netShipping)}</td>
            </tr>
          </tbody>
        </table>

        {/* ---------------- สรุปยอด ---------------- */}
        <div className="mt-4 flex flex-col gap-0.5 border-t border-stone-300 pt-3">
          <SummaryLine label="รวมราคาผลงาน" value={money(netTotal)} />
          <SummaryLine label="ค่าจัดส่ง" value={money(netShipping)} />
          {useNet && (
            <SummaryLine
              label="ยอดเต็มของคำสั่งซื้อก่อนตัดรายการที่ไม่พร้อมจำหน่าย"
              value={money(q.grandTotal)}
              muted
            />
          )}
        </div>

        <div className="mt-3 flex flex-wrap items-center justify-between gap-2 bg-stone-800 px-4 py-3 text-white [print-color-adjust:exact] [-webkit-print-color-adjust:exact]">
          {/* ตัวหนังสือกันการแก้ตัวเลขในเอกสารทีหลัง เป็นธรรมเนียมของใบเสนอราคาไทย */}
          <span className="text-[13px]">{bahtText(netGrand)}</span>
          <span className="text-[13px]">
            ราคารวมทั้งหมด : <span className="text-base font-semibold">{money(netGrand)}</span> บาท
          </span>
        </div>

        <p className="mt-2 text-[11px] text-stone-500">
          ยอดข้างต้นเป็นยอดสุทธิที่ผู้ซื้อต้องชำระ ระบบไม่มีการเรียกเก็บภาษีมูลค่าเพิ่มเพิ่มเติม
        </p>

        {/* ---------------- ช่องทางชำระเงิน / ลงนาม ---------------- */}
        <div className="mt-8 grid gap-8 break-inside-avoid sm:grid-cols-2">
          <div>
            <p className="mb-2 inline-block border-b border-stone-300 pb-0.5 text-sm font-semibold text-stone-900">
              ช่องทางการชำระเงิน
            </p>
            <InfoLine label="ธนาคาร" value={bank.bankName} />
            <InfoLine label="ชื่อบัญชี" value={bank.accountName} />
            <InfoLine label="เลขที่บัญชี" value={bank.accountNumber} />
            <InfoLine label="พร้อมเพย์" value={bank.promptPay} />
            <p className="mt-2 text-[11px] leading-relaxed text-stone-500">
              โอนเงินเข้าบัญชีของระบบตามยอดด้านบน แล้วแนบหลักฐานการโอนเงินในหน้าคำสั่งซื้อ
              ระบบจะโอนเงินต่อให้ผู้ขายหลังผู้ซื้อได้รับผลงานเรียบร้อย
            </p>
          </div>

          <div className="text-center sm:text-right">
            {/* เว้นที่ให้เซ็นด้วยมือ — ใบเสนอราคาที่พิมพ์ออกมาต้องมีคนรับผิดชอบเอกสาร */}
            <div className="mx-auto mb-1 h-16 w-56 border-b border-stone-400 sm:ml-auto sm:mr-0" />
            <p className="text-[13px] text-stone-700">({q.sellerName || "—"})</p>
            <p className="text-[12px] text-stone-500">ผู้ขาย / ผู้เสนอราคา</p>
            <p className="mt-1 text-[12px] text-stone-500">{thaiDate(q.issuedAt)}</p>
          </div>
        </div>
      </Card>
    </Container>
  );
}

export default function QuotationPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  return (
    <RequireUser>
      <QuotationContent id={id} />
    </RequireUser>
  );
}
