export type CartSummaryItem = {
  price: number;
  amount: number;
};

export function calculateCartSummary(items: CartSummaryItem[]) {
  return items.reduce(
    (summary, item) => {
      const normalizedAmount = Math.max(
        1,
        Math.floor(Number(item.amount) || 1)
      );
      const normalizedPrice = Math.max(0, Number(item.price) || 0);

      return {
        allQuantity: summary.allQuantity + normalizedAmount,
        total: summary.total + normalizedAmount * normalizedPrice,
      };
    },
    { allQuantity: 0, total: 0 }
  );
}
