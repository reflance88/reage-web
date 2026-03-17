import { useState, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

type TabKey =
  | "order_cs"
  | "payment_info"
  | "payment_method"
  | "refund_info"
  | "cash_receipt"
  | "tax_invoice"
  | "orderer_info"
  | "recipient_info"
  | "admin_memo";

const TABS: { key: TabKey; label: string }[] = [
  { key: "order_cs", label: "주문/CS" },
  { key: "payment_info", label: "결제정보" },
  { key: "payment_method", label: "결제수단" },
  { key: "refund_info", label: "환불정보" },
  { key: "cash_receipt", label: "현금영수증" },
  { key: "tax_invoice", label: "세금계산서" },
  { key: "orderer_info", label: "주문자정보" },
  { key: "recipient_info", label: "수령자정보" },
  { key: "admin_memo", label: "관리자메모" },
];

const SHIPPING_STATUS_MAP: Record<string, { label: string; color: string }> = {
  pending_payment: { label: "입금전", color: "bg-yellow-100 text-yellow-800" },
  ready: { label: "배송준비중", color: "bg-blue-100 text-blue-800" },
  hold: { label: "배송대기", color: "bg-orange-100 text-orange-800" },
  shipping: { label: "배송중", color: "bg-purple-100 text-purple-800" },
  delivered: { label: "배송완료", color: "bg-green-100 text-green-800" },
  none: { label: "-", color: "bg-gray-100 text-gray-600" },
};

const PAYMENT_METHOD_MAP: Record<string, string> = {
  card: "신용카드",
  bank: "무통장입금",
  kakao: "카카오페이",
  naver: "네이버페이",
  toss: "토스",
  cash: "현금",
};

const CANCEL_STATUS_MAP: Record<string, string> = {
  requested: "취소신청",
  processing: "취소처리중",
  completed: "취소완료",
  rejected: "접수거부",
};

const EXCHANGE_STATUS_MAP: Record<string, string> = {
  requested: "교환신청",
  processing: "교환처리중",
  completed: "교환완료",
  rejected: "접수거부",
};

const RETURN_STATUS_MAP: Record<string, string> = {
  requested: "반품신청",
  processing: "반품처리중",
  completed: "반품완료",
  rejected: "접수거부",
};

const REFUND_STATUS_MAP: Record<string, string> = {
  pending: "환불전",
  completed: "환불완료",
  hold: "환불보류",
  rejected: "환불철회",
};

function formatDate(d: Date | string | null | undefined) {
  if (!d) return "-";
  return new Date(d).toLocaleString("ko-KR");
}

function formatMoney(v: string | number | null | undefined) {
  if (v === null || v === undefined || v === "") return "0";
  return Number(v).toLocaleString("ko-KR");
}

interface Props {
  orderId: string | null;
  onClose: () => void;
}

export default function OrderDetailModal({ orderId, onClose }: Props) {
  const [activeTab, setActiveTab] = useState<TabKey>("order_cs");
  const [adminMemo, setAdminMemo] = useState("");
  const [editingShipping, setEditingShipping] = useState(false);
  const [shippingForm, setShippingForm] = useState({
    recipientName: "",
    recipientPhone: "",
    shippingAddress: "",
    shippingZipCode: "",
    shippingMemo: "",
  });
  const utils = trpc.useUtils();

  const { data, isLoading } = trpc.admin.orderDetail.useQuery(
    { orderId: orderId! },
    { enabled: !!orderId }
  );

  useEffect(() => {
    if (data) {
      setAdminMemo(data.order.adminMemo || "");
      setShippingForm({
        recipientName: data.order.recipientName || "",
        recipientPhone: data.order.recipientPhone || "",
        shippingAddress: data.order.shippingAddress || "",
        shippingZipCode: data.order.shippingZipCode || "",
        shippingMemo: data.order.shippingMemo || "",
      });
    }
  }, [data]);

  const saveMemoMutation = trpc.admin.updateOrderAdminMemo.useMutation({
    onSuccess: () => {
      toast.success("관리자 메모가 저장되었습니다.");
      utils.admin.orderDetail.invalidate({ orderId: orderId! });
    },
  });

  const saveShippingMutation = trpc.admin.updateOrderShippingInfo.useMutation({
    onSuccess: () => {
      toast.success("수령자 정보가 저장되었습니다.");
      setEditingShipping(false);
      utils.admin.orderDetail.invalidate({ orderId: orderId! });
    },
  });

  if (!orderId) return null;

  return (
    <Dialog open={!!orderId} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="w-[95vw] max-w-[1400px] max-h-[92vh] overflow-y-auto p-0">
        {/* 헤더 */}
        <div className="bg-gray-800 text-white px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-6 text-sm">
            <div className="flex items-center gap-2">
              <span className="text-gray-400">주문경로/유입경로:</span>
              <span className="font-medium">{data?.order.orderName || "-"}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-gray-400">주문번호:</span>
              <span className="font-bold text-white">{data?.order.orderId || orderId}</span>
              <button
                className="text-xs bg-gray-600 hover:bg-gray-500 px-2 py-0.5 rounded"
                onClick={() => {
                  navigator.clipboard.writeText(data?.order.orderId || orderId);
                  toast.success("주문번호가 복사되었습니다.");
                }}
              >
                복사
              </button>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-gray-400">주문일자:</span>
              <span>{data ? formatDate(data.order.createdAt) : "-"}</span>
            </div>
          </div>
          <Button variant="outline" size="sm" className="text-white border-white hover:bg-gray-700 bg-transparent">
            인쇄
          </Button>
        </div>

        {/* 탭 */}
        <div className="border-b border-gray-200 bg-white">
          <div className="flex overflow-x-auto">
            {TABS.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`px-4 py-3 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
                  activeTab === tab.key
                    ? "border-blue-600 text-blue-600 bg-blue-50"
                    : "border-transparent text-gray-600 hover:text-gray-900 hover:bg-gray-50"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* 탭 콘텐츠 */}
        <div className="p-6">
          {isLoading && (
            <div className="flex items-center justify-center py-20 text-gray-500">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mr-3" />
              주문 정보를 불러오는 중...
            </div>
          )}

          {!isLoading && data && (
            <>
              {/* ── 주문/CS 탭 ── */}
              {activeTab === "order_cs" && (
                <div className="space-y-4">
                  <h3 className="text-lg font-bold text-gray-800">주문/CS</h3>

                  {/* CS 서브탭 */}
                  <div className="flex gap-4 border-b pb-2">
                    {[
                      { label: "주문내역", count: data.items.length },
                      { label: "취소", count: data.cancellations.length },
                      { label: "교환", count: data.exchanges.length },
                      { label: "반품", count: data.returns.length },
                      { label: "환불", count: data.refunds.length },
                    ].map((item) => (
                      <span key={item.label} className="text-sm text-blue-600 font-medium cursor-pointer hover:underline">
                        {item.label}({item.count}건)
                      </span>
                    ))}
                  </div>

                  {/* 주문 상품 목록 */}
                  <div className="border rounded-lg overflow-hidden">
                    <div className="flex items-center justify-between px-4 py-2 bg-gray-50 border-b">
                      <span className="text-sm font-medium text-gray-700">주문 상품</span>
                      <div className="flex gap-2">
                        <Button size="sm" variant="outline" className="text-xs h-7">입금전처리</Button>
                        <Button size="sm" variant="outline" className="text-xs h-7">주문취소</Button>
                        <Button size="sm" variant="outline" className="text-xs h-7">상품교환</Button>
                        <Button size="sm" variant="outline" className="text-xs h-7">상품반품</Button>
                      </div>
                    </div>
                    <table className="w-full text-sm">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="text-left px-3 py-2 text-gray-600 font-medium">품목별 주문번호/배송번호</th>
                          <th className="text-left px-3 py-2 text-gray-600 font-medium">상품명/옵션</th>
                          <th className="text-right px-3 py-2 text-gray-600 font-medium">수량</th>
                          <th className="text-right px-3 py-2 text-gray-600 font-medium">판매가</th>
                          <th className="text-right px-3 py-2 text-gray-600 font-medium">상품구매금액</th>
                          <th className="text-center px-3 py-2 text-gray-600 font-medium">주문상태</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {data.items.map((item, idx) => {
                          const shippingInfo = SHIPPING_STATUS_MAP[data.order.shippingStatus] || SHIPPING_STATUS_MAP.none;
                          return (
                            <tr key={item.id} className="hover:bg-gray-50">
                              <td className="px-3 py-3">
                                <div className="font-mono text-xs text-gray-700">{data.order.orderId}-{String(idx + 1).padStart(2, "0")}</div>
                                {data.order.trackingNumber && (
                                  <div className="text-xs text-gray-500">D-{data.order.orderId}-{String(idx + 1).padStart(2, "0")}-00</div>
                                )}
                              </td>
                              <td className="px-3 py-3">
                                <div className="font-medium text-gray-900">{item.productName}</div>
                              </td>
                              <td className="px-3 py-3 text-right">{item.quantity}</td>
                              <td className="px-3 py-3 text-right">{formatMoney(item.unitPrice)}</td>
                              <td className="px-3 py-3 text-right font-medium">{formatMoney(item.subtotal)}</td>
                              <td className="px-3 py-3 text-center">
                                <span className={`inline-block text-xs px-2 py-1 rounded-full font-medium ${shippingInfo.color}`}>
                                  {shippingInfo.label}
                                </span>
                              </td>
                            </tr>
                          );
                        })}
                        {/* 합계 행 */}
                        <tr className="bg-gray-50 font-medium">
                          <td className="px-3 py-2 text-right" colSpan={2}>계</td>
                          <td className="px-3 py-2 text-right">
                            {data.items.reduce((sum, i) => sum + i.quantity, 0)}
                          </td>
                          <td className="px-3 py-2 text-right">
                            {formatMoney(data.items.reduce((sum, i) => sum + Number(i.unitPrice), 0))}
                          </td>
                          <td className="px-3 py-2 text-right text-blue-700">
                            {formatMoney(data.items.reduce((sum, i) => sum + Number(i.subtotal), 0))}
                          </td>
                          <td />
                        </tr>
                      </tbody>
                    </table>
                  </div>

                  {/* 취소 내역 */}
                  {data.cancellations.length > 0 && (
                    <div className="border rounded-lg overflow-hidden">
                      <div className="px-4 py-2 bg-red-50 border-b">
                        <span className="text-sm font-medium text-red-700">취소 내역</span>
                      </div>
                      <table className="w-full text-sm">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="text-left px-3 py-2 text-gray-600 font-medium">취소신청일</th>
                            <th className="text-left px-3 py-2 text-gray-600 font-medium">취소구분</th>
                            <th className="text-left px-3 py-2 text-gray-600 font-medium">취소사유</th>
                            <th className="text-right px-3 py-2 text-gray-600 font-medium">취소금액</th>
                            <th className="text-center px-3 py-2 text-gray-600 font-medium">상태</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                          {data.cancellations.map((c) => (
                            <tr key={c.id}>
                              <td className="px-3 py-2 text-xs">{formatDate(c.createdAt)}</td>
                              <td className="px-3 py-2 text-xs">{c.cancelType === "pre_payment" ? "입금전취소" : "결제후취소"}</td>
                              <td className="px-3 py-2 text-xs">{c.reason || "-"}</td>
                              <td className="px-3 py-2 text-right text-xs">{formatMoney(c.cancelAmount)}원</td>
                              <td className="px-3 py-2 text-center">
                                <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded-full">
                                  {CANCEL_STATUS_MAP[c.status] || c.status}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}

                  {/* 교환 내역 */}
                  {data.exchanges.length > 0 && (
                    <div className="border rounded-lg overflow-hidden">
                      <div className="px-4 py-2 bg-blue-50 border-b">
                        <span className="text-sm font-medium text-blue-700">교환 내역</span>
                      </div>
                      <table className="w-full text-sm">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="text-left px-3 py-2 text-gray-600 font-medium">교환신청일</th>
                            <th className="text-left px-3 py-2 text-gray-600 font-medium">교환사유</th>
                            <th className="text-center px-3 py-2 text-gray-600 font-medium">상태</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                          {data.exchanges.map((e) => (
                            <tr key={e.id}>
                              <td className="px-3 py-2 text-xs">{formatDate(e.createdAt)}</td>
                              <td className="px-3 py-2 text-xs">{e.reason || "-"}</td>
                              <td className="px-3 py-2 text-center">
                                <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">
                                  {EXCHANGE_STATUS_MAP[e.status] || e.status}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}

                  {/* 반품 내역 */}
                  {data.returns.length > 0 && (
                    <div className="border rounded-lg overflow-hidden">
                      <div className="px-4 py-2 bg-orange-50 border-b">
                        <span className="text-sm font-medium text-orange-700">반품 내역</span>
                      </div>
                      <table className="w-full text-sm">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="text-left px-3 py-2 text-gray-600 font-medium">반품신청일</th>
                            <th className="text-left px-3 py-2 text-gray-600 font-medium">반품사유</th>
                            <th className="text-left px-3 py-2 text-gray-600 font-medium">운송정보</th>
                            <th className="text-center px-3 py-2 text-gray-600 font-medium">상태</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                          {data.returns.map((r) => (
                            <tr key={r.id}>
                              <td className="px-3 py-2 text-xs">{formatDate(r.createdAt)}</td>
                              <td className="px-3 py-2 text-xs">{r.reason || "-"}</td>
                              <td className="px-3 py-2 text-xs">
                                {r.returnCourierName ? `${r.returnCourierName} ${r.returnTrackingNumber || ""}` : "-"}
                              </td>
                              <td className="px-3 py-2 text-center">
                                <span className="text-xs bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full">
                                  {RETURN_STATUS_MAP[r.status] || r.status}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}

              {/* ── 결제정보 탭 ── */}
              {activeTab === "payment_info" && (
                <div className="space-y-6">
                  <h3 className="text-lg font-bold text-gray-800">결제 정보</h3>

                  <div className="grid grid-cols-2 gap-6">
                    {/* 좌측: 금액 요약 */}
                    <div className="border rounded-lg overflow-hidden">
                      <div className="bg-gray-50 px-4 py-2 border-b">
                        <span className="text-sm font-medium text-gray-700">결제 금액 요약</span>
                      </div>
                      <div className="divide-y">
                        {[
                          { label: "상품구매금액", value: formatMoney(data.order.totalAmount) + "원" },
                          { label: "할인금액", value: formatMoney(data.order.discountAmount) + "원" },
                          { label: "배송비", value: formatMoney(data.order.shippingAmount) + "원" },
                          { label: "총 실결제금액", value: formatMoney(data.order.finalAmount ?? data.order.totalAmount) + "원", highlight: true },
                        ].map((row) => (
                          <div key={row.label} className="flex justify-between px-4 py-3">
                            <span className="text-sm text-gray-600">{row.label}</span>
                            <span className={`text-sm font-medium ${row.highlight ? "text-blue-700 text-base" : "text-gray-900"}`}>
                              {row.value}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* 우측: 배송비 */}
                    <div className="border rounded-lg overflow-hidden">
                      <div className="bg-gray-50 px-4 py-2 border-b">
                        <span className="text-sm font-medium text-gray-700">배송비 / 적립혜택</span>
                      </div>
                      <div className="divide-y">
                        {[
                          { label: "기본배송비", value: formatMoney(data.order.shippingAmount) + "원" },
                          { label: "프로모션", value: data.order.promotionLabel || "-" },
                          { label: "결제상태", value: data.order.status || "-" },
                          { label: "배송상태", value: SHIPPING_STATUS_MAP[data.order.shippingStatus || "none"]?.label || "-" },
                        ].map((row) => (
                          <div key={row.label} className="flex justify-between px-4 py-3">
                            <span className="text-sm text-gray-600">{row.label}</span>
                            <span className="text-sm text-gray-900">{row.value}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* 환불 정보 */}
                  <div className="border rounded-lg overflow-hidden">
                    <div className="bg-gray-50 px-4 py-2 border-b">
                      <span className="text-sm font-medium text-gray-700">환불 정보</span>
                    </div>
                    {data.refunds.length === 0 ? (
                      <div className="px-4 py-6 text-center text-sm text-gray-500">환불 내역이 없습니다.</div>
                    ) : (
                      <table className="w-full text-sm">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="text-left px-3 py-2 text-gray-600 font-medium">환불접수일</th>
                            <th className="text-left px-3 py-2 text-gray-600 font-medium">환불수단</th>
                            <th className="text-right px-3 py-2 text-gray-600 font-medium">환불금액</th>
                            <th className="text-center px-3 py-2 text-gray-600 font-medium">상태</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                          {data.refunds.map((r) => (
                            <tr key={r.id}>
                              <td className="px-3 py-2 text-xs">{formatDate(r.createdAt)}</td>
                              <td className="px-3 py-2 text-xs">{r.refundMethod}</td>
                              <td className="px-3 py-2 text-right text-xs">{formatMoney(r.refundAmount)}원</td>
                              <td className="px-3 py-2 text-center">
                                <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">
                                  {REFUND_STATUS_MAP[r.status] || r.status}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}
                  </div>
                </div>
              )}

              {/* ── 결제수단 탭 ── */}
              {activeTab === "payment_method" && (
                <div className="space-y-4">
                  <h3 className="text-lg font-bold text-gray-800">결제수단</h3>
                  <div className="border rounded-lg overflow-hidden">
                    <table className="w-full text-sm">
                      <tbody className="divide-y divide-gray-100">
                        {[
                          { label: "결제(입금)자", value: data.user?.name || "-" },
                          { label: "결제수단", value: PAYMENT_METHOD_MAP[data.order.paymentMethod || ""] || data.order.paymentMethod || "-" },
                          { label: "결제(입금)확인일", value: formatDate(data.order.paidAt) },
                          { label: "결제키", value: data.order.paymentKey || "-" },
                        ].map((row) => (
                          <tr key={row.label}>
                            <td className="px-4 py-3 bg-gray-50 text-gray-600 font-medium w-40">{row.label}</td>
                            <td className="px-4 py-3 text-gray-900">{row.value}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <div className="flex gap-2 justify-end">
                    <Button size="sm" variant="outline">입금전 처리</Button>
                    <Button size="sm" variant="outline">현금영수증 신청</Button>
                    <Button size="sm" variant="outline">세금계산서 신청</Button>
                  </div>
                </div>
              )}

              {/* ── 환불정보 탭 ── */}
              {activeTab === "refund_info" && (
                <div className="space-y-4">
                  <h3 className="text-lg font-bold text-gray-800">환불 정보</h3>
                  {data.refunds.length === 0 ? (
                    <div className="border rounded-lg px-4 py-10 text-center text-sm text-gray-500">
                      환불 내역이 없습니다.
                    </div>
                  ) : (
                    <div className="border rounded-lg overflow-hidden">
                      <table className="w-full text-sm">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="text-left px-3 py-2 text-gray-600 font-medium">환불접수일(완료일)</th>
                            <th className="text-left px-3 py-2 text-gray-600 font-medium">환불은행</th>
                            <th className="text-left px-3 py-2 text-gray-600 font-medium">환불계좌</th>
                            <th className="text-right px-3 py-2 text-gray-600 font-medium">환불금액</th>
                            <th className="text-center px-3 py-2 text-gray-600 font-medium">처리상태</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                          {data.refunds.map((r) => (
                            <tr key={r.id}>
                              <td className="px-3 py-2 text-xs">
                                {formatDate(r.createdAt)}<br />
                                {r.processedAt ? `(${formatDate(r.processedAt)})` : ""}
                              </td>
                              <td className="px-3 py-2 text-xs">{r.refundBank || "-"}</td>
                              <td className="px-3 py-2 text-xs">
                                {r.refundAccount ? `${r.refundAccount} (${r.refundAccountHolder || ""})` : "-"}
                              </td>
                              <td className="px-3 py-2 text-right text-xs font-medium">{formatMoney(r.refundAmount)}원</td>
                              <td className="px-3 py-2 text-center">
                                <span className={`text-xs px-2 py-0.5 rounded-full ${
                                  r.status === "completed" ? "bg-green-100 text-green-700" :
                                  r.status === "pending" ? "bg-yellow-100 text-yellow-700" :
                                  "bg-gray-100 text-gray-600"
                                }`}>
                                  {REFUND_STATUS_MAP[r.status] || r.status}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}

              {/* ── 현금영수증 탭 ── */}
              {activeTab === "cash_receipt" && (
                <div className="space-y-4">
                  <h3 className="text-lg font-bold text-gray-800">현금영수증 발급 내역</h3>
                  <div className="border rounded-lg overflow-hidden">
                    <table className="w-full text-sm">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="text-left px-3 py-2 text-gray-600 font-medium">신청일</th>
                          <th className="text-left px-3 py-2 text-gray-600 font-medium">인증번호</th>
                          <th className="text-left px-3 py-2 text-gray-600 font-medium">신청결제사</th>
                          <th className="text-left px-3 py-2 text-gray-600 font-medium">승인정보</th>
                          <th className="text-center px-3 py-2 text-gray-600 font-medium">상태</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr>
                          <td colSpan={5} className="px-4 py-8 text-center text-sm text-gray-500">
                            현금영수증 발급 내역이 없습니다.
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* ── 세금계산서 탭 ── */}
              {activeTab === "tax_invoice" && (
                <div className="space-y-4">
                  <h3 className="text-lg font-bold text-gray-800">세금계산서 발급 내역</h3>
                  <div className="border rounded-lg overflow-hidden">
                    <table className="w-full text-sm">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="text-left px-3 py-2 text-gray-600 font-medium">발행번호</th>
                          <th className="text-left px-3 py-2 text-gray-600 font-medium">발행일</th>
                          <th className="text-left px-3 py-2 text-gray-600 font-medium">신청일</th>
                          <th className="text-left px-3 py-2 text-gray-600 font-medium">처리일</th>
                          <th className="text-center px-3 py-2 text-gray-600 font-medium">발행상태</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr>
                          <td colSpan={5} className="px-4 py-8 text-center text-sm text-gray-500">
                            세금계산서 발급 내역이 없습니다.
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* ── 주문자정보 탭 ── */}
              {activeTab === "orderer_info" && (
                <div className="space-y-4">
                  <h3 className="text-lg font-bold text-gray-800">주문자 정보</h3>
                  <div className="border rounded-lg overflow-hidden">
                    <table className="w-full text-sm">
                      <tbody className="divide-y divide-gray-100">
                        {[
                          { label: "주문자명(ID)", value: `${data.user?.name || "-"} (${data.user?.openId || "-"})` },
                          { label: "회원등급", value: data.order.userRoleSnapshot === "professional" ? "전문점회원" : "일반회원" },
                          { label: "일반전화", value: "-" },
                          { label: "이메일", value: data.user?.email || "-" },
                          { label: "휴대전화", value: data.user?.phone || "-" },
                          { label: "구매자 아이피", value: "-" },
                        ].map((row) => (
                          <tr key={row.label}>
                            <td className="px-4 py-3 bg-gray-50 text-gray-600 font-medium w-40">{row.label}</td>
                            <td className="px-4 py-3 text-gray-900">{row.value}</td>
                          </tr>
                        ))}
                        <tr>
                          <td className="px-4 py-3 bg-gray-50 text-gray-600 font-medium">고객알림</td>
                          <td className="px-4 py-3">
                            <div className="flex gap-2">
                              <Textarea className="h-20 text-sm" placeholder="고객 알림 메모를 입력하세요..." />
                              <Button size="sm" variant="outline">등록</Button>
                            </div>
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* ── 수령자정보 탭 ── */}
              {activeTab === "recipient_info" && (
                <div className="space-y-4">
                  <h3 className="text-lg font-bold text-gray-800">수령자 정보</h3>
                  <div className="border rounded-lg overflow-hidden">
                    <table className="w-full text-sm">
                      <tbody className="divide-y divide-gray-100">
                        <tr>
                          <td className="px-4 py-3 bg-gray-50 text-gray-600 font-medium w-40">배송구분</td>
                          <td className="px-4 py-3 text-blue-600 font-medium">국내배송</td>
                        </tr>
                        <tr>
                          <td className="px-4 py-3 bg-gray-50 text-gray-600 font-medium">수령자명</td>
                          <td className="px-4 py-3">
                            {editingShipping ? (
                              <Input
                                value={shippingForm.recipientName}
                                onChange={(e) => setShippingForm((f) => ({ ...f, recipientName: e.target.value }))}
                                className="h-8 text-sm"
                              />
                            ) : (
                              <span>{data.order.recipientName || "-"}</span>
                            )}
                          </td>
                        </tr>
                        <tr>
                          <td className="px-4 py-3 bg-gray-50 text-gray-600 font-medium">일반전화</td>
                          <td className="px-4 py-3">-</td>
                        </tr>
                        <tr>
                          <td className="px-4 py-3 bg-gray-50 text-gray-600 font-medium">휴대전화</td>
                          <td className="px-4 py-3">
                            {editingShipping ? (
                              <Input
                                value={shippingForm.recipientPhone}
                                onChange={(e) => setShippingForm((f) => ({ ...f, recipientPhone: e.target.value }))}
                                className="h-8 text-sm"
                              />
                            ) : (
                              <span>{data.order.recipientPhone || "-"}</span>
                            )}
                          </td>
                        </tr>
                        <tr>
                          <td className="px-4 py-3 bg-gray-50 text-gray-600 font-medium">배송지 주소</td>
                          <td className="px-4 py-3">
                            {editingShipping ? (
                              <div className="space-y-2">
                                <Input
                                  value={shippingForm.shippingZipCode}
                                  onChange={(e) => setShippingForm((f) => ({ ...f, shippingZipCode: e.target.value }))}
                                  placeholder="우편번호"
                                  className="h-8 text-sm w-32"
                                />
                                <Input
                                  value={shippingForm.shippingAddress}
                                  onChange={(e) => setShippingForm((f) => ({ ...f, shippingAddress: e.target.value }))}
                                  placeholder="주소"
                                  className="h-8 text-sm"
                                />
                              </div>
                            ) : (
                              <span>
                                {data.order.shippingZipCode ? `(${data.order.shippingZipCode}) ` : ""}
                                {data.order.shippingAddress || "-"}
                              </span>
                            )}
                          </td>
                        </tr>
                        <tr>
                          <td className="px-4 py-3 bg-gray-50 text-gray-600 font-medium">배송메시지</td>
                          <td className="px-4 py-3">
                            {editingShipping ? (
                              <div className="flex gap-2">
                                <Textarea
                                  value={shippingForm.shippingMemo}
                                  onChange={(e) => setShippingForm((f) => ({ ...f, shippingMemo: e.target.value }))}
                                  className="h-20 text-sm"
                                />
                              </div>
                            ) : (
                              <span>{data.order.shippingMemo || "-"}</span>
                            )}
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                  <div className="flex justify-end gap-2">
                    {editingShipping ? (
                      <>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setEditingShipping(false)}
                        >
                          취소
                        </Button>
                        <Button
                          size="sm"
                          onClick={() =>
                            saveShippingMutation.mutate({ orderId: data.order.orderId, ...shippingForm })
                          }
                          disabled={saveShippingMutation.isPending}
                        >
                          {saveShippingMutation.isPending ? "저장 중..." : "저장"}
                        </Button>
                      </>
                    ) : (
                      <Button size="sm" variant="outline" onClick={() => setEditingShipping(true)}>
                        수령자정보 수정
                      </Button>
                    )}
                  </div>
                </div>
              )}

              {/* ── 관리자메모 탭 ── */}
              {activeTab === "admin_memo" && (
                <div className="space-y-4">
                  <h3 className="text-lg font-bold text-gray-800">관리자 메모</h3>
                  <div className="border rounded-lg p-4 space-y-3">
                    <div className="text-sm text-gray-600">
                      주문 처리 시 참고할 내부 메모를 입력하세요. 고객에게는 표시되지 않습니다.
                    </div>
                    <Textarea
                      value={adminMemo}
                      onChange={(e) => setAdminMemo(e.target.value)}
                      className="min-h-[200px] text-sm"
                      placeholder="관리자 메모를 입력하세요..."
                    />
                    <div className="flex justify-end">
                      <Button
                        size="sm"
                        onClick={() => saveMemoMutation.mutate({ orderId: data.order.orderId, adminMemo })}
                        disabled={saveMemoMutation.isPending}
                      >
                        {saveMemoMutation.isPending ? "저장 중..." : "메모 저장"}
                      </Button>
                    </div>
                  </div>

                  {/* 배송 정보 요약 */}
                  <div className="border rounded-lg overflow-hidden">
                    <div className="bg-gray-50 px-4 py-2 border-b">
                      <span className="text-sm font-medium text-gray-700">배송 정보</span>
                    </div>
                    <table className="w-full text-sm">
                      <tbody className="divide-y divide-gray-100">
                        {[
                          { label: "배송 상태", value: SHIPPING_STATUS_MAP[data.order.shippingStatus]?.label || "-" },
                          { label: "택배사", value: data.order.courierName || "-" },
                          { label: "송장번호", value: data.order.trackingNumber || "-" },
                          { label: "배송 시작일", value: formatDate(data.order.shippedAt) },
                          { label: "배송 완료일", value: formatDate(data.order.deliveredAt) },
                          { label: "3PL 외부 주문 ID", value: data.order.externalOrderId || "-" },
                          { label: "3PL 연동 상태", value: data.order.thirdPartyStatus || "-" },
                        ].map((row) => (
                          <tr key={row.label}>
                            <td className="px-4 py-2 bg-gray-50 text-gray-600 font-medium w-40">{row.label}</td>
                            <td className="px-4 py-2 text-gray-900">{row.value}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
