"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import toast from "react-hot-toast";
import type { PaymentDto } from "@/lib/payment";
import { calculatePaymentRemainingMs } from "@/lib/payment";
import { formatVndTotal } from "@/lib/currency";

type Props = {
  initialPayment: PaymentDto;
  bankName: string;
  accountName: string;
  accountNo: string;
};

const PAYMENT_QR_IMAGE = "/images/payment-qr.jpg";

function formatCountdown(milliseconds: number) {
  const seconds = Math.max(0, Math.ceil(milliseconds / 1000));
  const minutes = Math.floor(seconds / 60);
  return `${String(minutes).padStart(2, "0")}:${String(seconds % 60).padStart(2, "0")}`;
}

export default function PaymentQrPanel({
  initialPayment,
  bankName,
  accountName,
  accountNo,
}: Props) {
  const [payment, setPayment] = useState(initialPayment);
  const clientLoadTimeRef = useRef(Date.now());
  const [remainingMs, setRemainingMs] = useState(() =>
    calculatePaymentRemainingMs(
      initialPayment.paymentExpiresAt,
      initialPayment.serverNow,
      clientLoadTimeRef.current
    )
  );
  const [qrFailed, setQrFailed] = useState(false);
  const [claiming, setClaiming] = useState(false);
  const [claimed, setClaimed] = useState(false);
  const [renewing, setRenewing] = useState(false);
  const [inputValue, setInputValue] = useState("");
  const inFlightRef = useRef(false);
  const requestRef = useRef<AbortController | null>(null);
  const compositeRef = `${payment.name} ${payment.lastname} - ${formatVndTotal(payment.total)}đ - #${payment.orderNumber}`;
  const inputMatches = inputValue.trim() === compositeRef.trim();

  const poll = useCallback(async () => {
    if (inFlightRef.current) return;
    inFlightRef.current = true;
    const controller = new AbortController();
    requestRef.current = controller;
    try {
      const response = await fetch(`/api/account/orders/${payment.orderId}/payment`, {
        cache: "no-store",
        signal: controller.signal,
      });
      const body = await response.json().catch(() => null);
      if (response.ok && body?.payment) {
        clientLoadTimeRef.current = Date.now();
        setPayment(body.payment);
      }
    } catch (error) {
      if (!(error instanceof DOMException && error.name === "AbortError")) {
        toast.error("Không thể kiểm tra trạng thái thanh toán.");
      }
    } finally {
      if (requestRef.current === controller) requestRef.current = null;
      inFlightRef.current = false;
    }
  }, [payment.orderId]);

  useEffect(() => {
    setRemainingMs(
      calculatePaymentRemainingMs(
        payment.paymentExpiresAt,
        payment.serverNow,
        clientLoadTimeRef.current
      )
    );
    if (payment.status !== "PENDING_PAYMENT" || payment.paidAt) return;

    const countdown = window.setInterval(() => {
      const next = calculatePaymentRemainingMs(
        payment.paymentExpiresAt,
        payment.serverNow,
        clientLoadTimeRef.current
      );
      setRemainingMs(next);
      if (next === 0) void poll();
    }, 1000);
    const polling = window.setInterval(() => void poll(), 5000);

    return () => {
      window.clearInterval(countdown);
      window.clearInterval(polling);
    };
  }, [payment.paidAt, payment.paymentExpiresAt, payment.serverNow, payment.status, poll]);

  useEffect(
    () => () => {
      requestRef.current?.abort();
    },
    []
  );

  async function renewPayment() {
    if (renewing) return;
    setRenewing(true);
    try {
      const response = await fetch(
        `/api/account/orders/${payment.orderId}/payment/renew`,
        { method: "POST" }
      );
      const body = await response.json().catch(() => null);
      if (!response.ok || !body?.payment) {
        throw new Error(body?.error || "PAYMENT_RENEWAL_FAILED");
      }
      clientLoadTimeRef.current = Date.now();
      setQrFailed(false);
      setPayment(body.payment);
      toast.success("Đã tạo mã QR thanh toán mới.");
    } catch {
      toast.error("Không thể tạo lại phiên thanh toán. Vui lòng kiểm tra tồn kho.");
    } finally {
      setRenewing(false);
    }
  }

  if (payment.paidAt || payment.status === "PROCESSING") {
    return (
      <section className="border border-emerald-400/40 bg-emerald-950/20 p-6 text-center">
        <h1 className="text-3xl font-black uppercase text-emerald-300">
          Thanh toán thành công
        </h1>
        <p className="mt-3 text-white/70">Đơn hàng đang được xử lý.</p>
        <Link
          className="mt-5 inline-flex bg-[#e85d00] px-5 py-3 font-black uppercase text-white"
          href={`/account/orders/${payment.orderId}`}
        >
          Xem đơn hàng
        </Link>
      </section>
    );
  }

  if (payment.status === "CANCELLED") {
    return (
      <section className="border border-red-400/40 bg-red-950/20 p-6 text-center">
        <h1 className="text-2xl font-black uppercase text-red-300">
          Phiên thanh toán đã hết hạn
        </h1>
        <p className="mt-3 text-white/70">
          Tồn kho đã được hoàn lại. Bạn có thể yêu cầu một mã QR mới.
        </p>
        <button
          className="mt-5 bg-[#e85d00] px-5 py-3 font-black uppercase text-white disabled:opacity-50"
          disabled={renewing}
          onClick={renewPayment}
          type="button"
        >
          {renewing ? "Đang tạo" : "Tạo mã QR mới"}
        </button>
      </section>
    );
  }

  return (
    <section className="grid gap-6 border border-[#e85d00]/40 bg-[#111] p-6 lg:grid-cols-[minmax(280px,440px)_1fr]">
      <div className="grid place-items-center bg-white p-4">
        {!qrFailed ? (
          <img
            alt={`Mã VietQR cho đơn ${payment.paymentRef}`}
            className="h-auto w-full max-w-[420px]"
            onError={() => setQrFailed(true)}
            src={PAYMENT_QR_IMAGE}
          />
        ) : (
          <p className="p-8 text-center font-bold text-black">
            Không tải được mã QR. Vui lòng chuyển khoản thủ công theo thông tin bên cạnh.
          </p>
        )}
      </div>
      <div>
        <p className="text-sm font-black uppercase text-[#e85d00]">Chuyển khoản ngân hàng</p>
        <h1 className="mt-2 text-3xl font-black uppercase italic">Hoàn tất thanh toán</h1>
        <dl className="mt-6 grid gap-4 text-sm">
          <div><dt className="text-white/55">Ngân hàng</dt><dd className="font-black">{bankName}</dd></div>
          <div><dt className="text-white/55">Chủ tài khoản</dt><dd className="font-black">{accountName}</dd></div>
          <div><dt className="text-white/55">Số tài khoản</dt><dd className="font-black">{accountNo}</dd></div>
          <div><dt className="text-white/55">Số tiền</dt><dd className="text-2xl font-black text-[#e85d00]">{formatVndTotal(payment.total)}</dd></div>
          <div>
            <dt className="text-white/55">Nội dung chuyển khoản</dt>
            <dd className="mt-1 flex flex-wrap items-center gap-3 font-mono text-xl font-black">
              {compositeRef}
              <button
                className="border border-white/20 px-3 py-1 text-xs uppercase"
                onClick={() => {
                  if (payment.paymentRef) {
                    const copyText = compositeRef;
                    void navigator.clipboard.writeText(copyText);
                    toast.success("Đã sao chép nội dung chuyển khoản.");
                  }
                }}
                type="button"
              >
                Sao chép
              </button>
              <p className="basis-full text-sm font-sans font-normal text-gray-400">
                Mã tham chiếu: {payment.paymentRef}
              </p>
            </dd>
          </div>
        </dl>
        <div
          className="mt-5 border border-[#f59e0b]/50 bg-[#f59e0b]/10 p-4 text-base leading-relaxed text-[#fbbf24]"
          role="note"
        >
          <p className="flex items-start gap-2">
            <span className="text-xl">📋</span>
            <span className="font-bold text-lg">Lưu ý:</span>
          </p>
          <p className="mt-2 font-semibold">
            Vui lòng sao chép và sử dụng chính xác nội dung chuyển khoản
            khi thanh toán để Đảo Khủng Long có thể kiểm tra và xác nhận đơn hàng
            nhanh chóng.
          </p>
          <p className="mt-2 font-semibold">
            Sau khi chuyển khoản thành công, vui lòng chụp lại màn hình giao dịch
            để thuận tiện cho việc xác nhận và đối chiếu khi cần.
          </p>
        </div>
        {/* Customer-confirm button: shown only when awaiting payment, not expired, and not already claimed */}
        {payment.status === "PENDING_PAYMENT" && !payment.paidAt && remainingMs > 0 && !claimed && (
          <div className="mt-4">
            <label className="mb-2 block text-sm font-semibold" htmlFor="payment-confirmation-reference">
              Nhập nội dung chuyển khoản để xác nhận
            </label>
            <input
              aria-invalid={inputValue.length > 0 && !inputMatches}
              className={`w-full rounded-lg border bg-gray-900 px-4 py-3 font-mono text-white transition-colors ${
                inputValue.length === 0
                  ? "border-gray-700"
                  : inputMatches
                    ? "border-green-500"
                    : "border-red-500"
              }`}
              id="payment-confirmation-reference"
              onChange={(event) => setInputValue(event.target.value)}
              placeholder={compositeRef}
              type="text"
              value={inputValue}
            />
            {inputValue.length > 0 && (
              <p className={`mt-2 text-sm ${inputMatches ? "text-green-500" : "text-red-500"}`}>
                {inputMatches ? "✓ Nội dung khớp" : "Nội dung chưa khớp, vui lòng sao chép chính xác"}
              </p>
            )}
            <button
              className={`mt-4 w-full rounded-xl px-6 py-4 font-bold uppercase tracking-widest transition-all duration-200 ${
                inputMatches && !claiming
                  ? "bg-gradient-to-r from-orange-500 to-orange-600 text-white hover:from-orange-400 hover:to-orange-500 active:scale-95"
                  : "cursor-not-allowed bg-zinc-800 text-gray-500"
              }`}
              disabled={!inputMatches || claiming}
              onClick={async () => {
                const ok = window.confirm(
                  "Bạn xác nhận đã chuyển khoản thành công?\nĐơn hàng sẽ được chuyển sang trạng thái CHỜ XÁC NHẬN.\nChúng tôi sẽ kiểm tra và xác nhận trong thời gian sớm nhất."
                );
                if (!ok) return;
                try {
                  setClaiming(true);
                  const resp = await fetch(`/api/payment/customer-confirm`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                      orderId: payment.orderId,
                      claimedRef: inputValue.trim(),
                    }),
                  });
                  const body = await resp.json().catch(() => null);
                  if (!resp.ok) {
                    toast.error(body?.error || "Không thể gửi yêu cầu xác nhận.");
                    setClaiming(false);
                    return;
                  }
                  toast.success("✅ Cảm ơn bạn! Chúng tôi đã nhận được thông báo và sẽ xác nhận đơn hàng của bạn sớm nhất có thể.");
                  setClaimed(true);
                } catch (err) {
                  toast.error("Có lỗi xảy ra. Vui lòng thử lại.");
                } finally {
                  setClaiming(false);
                }
              }}
              type="button"
            >
              {claiming
                ? "Đang gửi..."
                : inputMatches
                  ? "✓ TÔI ĐÃ CHUYỂN KHOẢN XONG"
                  : "TÔI ĐÃ CHUYỂN KHOẢN XONG"}
            </button>
          </div>
        )}
        <p className="mt-6 text-white/60">Mã hết hạn sau</p>
        <p className="font-mono text-4xl font-black text-[#e85d00]" aria-live="polite">
          {formatCountdown(remainingMs)}
        </p>
        <p className="mt-4 text-sm text-white/55">
          Thanh toán chỉ hoàn tất sau khi cửa hàng xác nhận đã nhận tiền.
        </p>
      </div>
    </section>
  );
}
