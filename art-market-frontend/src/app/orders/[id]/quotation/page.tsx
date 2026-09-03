"use client";

import { use, useEffect, useState } from "react";
import { RequireUser } from "@/components/RoleGuard";
import { getOrder } from "@/lib/api";
import { Order } from "@/types";
import { Button, Card, Container, Spinner } from "@/components/ui";

function QuotationContent({ id }: { id: string }) {
  const [order, setOrder] = useState<Order | null | undefined>(undefined);

  useEffect(() => {
    getOrder(id).then((o) => setOrder(o ?? null));
  }, [id]);

  if (order === undefined) return <Spinner />;
  if (order === null) {
    return <Container className="py-16 text-center text-stone-600">ไม่พบคำสั่งซื้อ</Container>;
  }

  return (
    <Container className="py-10">
      <div className="mb-4 flex justify-end print:hidden">
        <Button onClick={() => window.print()}>พิมพ์ใบเสนอราคา</Button>
      </div>

      <Card className="mx-auto max-w-2xl p-8 print:max-w-none print:p-0 print:border-0 print:shadow-none">
        <div className="mb-6 flex items-center justify-between border-b border-stone-200 pb-4">
          <div>
            <h1 className="font-serif text-xl font-bold text-stone-900">ใบเสนอราคา</h1>
            <p className="text-xs text-stone-500">Quotation</p>
          </div>
          <div className="text-right text-xs text-stone-500">
            <p>เลขที่คำสั่งซื้อ: {order.id.slice(-8)}</p>
            <p>วันที่: {new Date().toLocaleDateString("th-TH")}</p>
          </div>
        </div>

        <div className="mb-6 grid grid-cols-2 gap-4 text-sm">
          <div>
            <p className="font-semibold text-stone-700">ผู้ขาย</p>
            <p className="text-stone-600">{order.sellerName}</p>
          </div>
          <div>
            <p className="font-semibold text-stone-700">ผู้ซื้อ</p>
            <p className="text-stone-600">{order.buyerName}</p>
          </div>
        </div>

        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-stone-300 text-left text-stone-500">
              <th className="py-2">รายการ</th>
              <th className="py-2 text-right">ราคา</th>
            </tr>
          </thead>
          <tbody>
            {order.items.map((item) => (
              <tr key={item.id} className="border-b border-stone-100">
                <td className="py-2 text-stone-800">{item.artworkName}</td>
                <td className="py-2 text-right text-stone-800">฿{item.price.toLocaleString()}</td>
              </tr>
            ))}
            <tr className="border-b border-stone-100">
              <td className="py-2 text-stone-800">ค่าจัดส่ง</td>
              <td className="py-2 text-right text-stone-800">฿{order.shippingCost.toLocaleString()}</td>
            </tr>
          </tbody>
          <tfoot>
            <tr>
              <td className="pt-3 font-semibold text-stone-900">ยอดรวมสุทธิ</td>
              <td className="pt-3 text-right font-semibold text-stone-900">
                ฿{order.grandTotal.toLocaleString()}
              </td>
            </tr>
          </tfoot>
        </table>
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
