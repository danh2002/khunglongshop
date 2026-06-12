export function formatVnd(price?: number | null) {
  if (!price || price <= 0) {
    return "Liên hệ";
  }

  return `${price.toLocaleString("vi-VN")}đ`;
}

export function formatVndTotal(value?: number | null) {
  const total = Math.max(0, Number(value) || 0);
  return `${total.toLocaleString("vi-VN")}đ`;
}
