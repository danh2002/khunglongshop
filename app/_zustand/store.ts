import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { calculateCartSummary } from "@/lib/cart";

export type ProductInCart = {
  id: string;
  title: string;
  price: number;
  image: string;
  amount: number;
  slug?: string;
};

export type State = {
  products: ProductInCart[];
  allQuantity: number;
  total: number;
};

export type Actions = {
  addToCart: (newProduct: ProductInCart) => void;
  removeFromCart: (id: string) => void;
  updateCartAmount: (id: string, quantity: number) => void;
  calculateTotals: () => void;
  updateCartPrice: (id: string, price: number) => void;
  clearCart: () => void;
};

export const useProductStore = create<State & Actions>()(
  persist(
    (set) => ({
      products: [],
      allQuantity: 0,
      total: 0,
      addToCart: (newProduct) => {
        set((state) => {
          const amount = Math.max(
            1,
            Math.floor(Number(newProduct.amount) || 1)
          );
          const cartItem = state.products.find(
            (item) => item.id === newProduct.id
          );
          const products = cartItem
            ? state.products.map((product) =>
                product.id === cartItem.id
                  ? {
                      ...product,
                      amount: product.amount + amount,
                    }
                  : product
              )
            : [
                ...state.products,
                {
                  ...newProduct,
                  amount,
                },
              ];

          return { products, ...calculateCartSummary(products) };
        });
      },
      clearCart: () => {
        set({
          products: [],
          allQuantity: 0,
          total: 0,
        });
      },
      removeFromCart: (id) => {
        set((state) => {
          const products = state.products.filter(
            (product: ProductInCart) => product.id !== id
          );
          return { products, ...calculateCartSummary(products) };
        });
      },

      calculateTotals: () => {
        set((state) => {
          return {
            products: state.products,
            ...calculateCartSummary(state.products),
          };
        });
      },
      updateCartAmount: (id, amount) => {
        set((state) => {
          const products = state.products.map((product) =>
            product.id === id
              ? { ...product, amount: Math.max(1, Math.floor(amount)) }
              : product
          );

          return { products, ...calculateCartSummary(products) };
        });
      },
      updateCartPrice: (id, price) => {
        set((state) => {
          const products = state.products.map((product) =>
            product.id === id ? { ...product, price } : product
          );
          return { products, ...calculateCartSummary(products) };
        });
      },
    }),
    {
      name: "products-storage", // name of the item in the storage (must be unique)
      storage: createJSONStorage(() => sessionStorage), // (optional) by default, 'localStorage' is used
      onRehydrateStorage: () => (state) => {
        state?.calculateTotals();
      },
    }
  )
);
