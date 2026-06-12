export type CartSummaryItem = {
  price: number;
  amount: number;
};

export function calculateCartSummary(items: CartSummaryItem[]) {
  return items.reduce(
    (summary, item) => {
      const amount = Math.max(1, Math.floor(Number(item.amount) || 1));
      const price = Math.max(0, Number(item.price) || 0);

      return {
        allQuantity: summary.allQuantity + amount,
        total: summary.total + amount * price,
      };
    },
    { allQuantity: 0, total: 0 }
  );
}
