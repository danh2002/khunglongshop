import type { DefaultSession, DefaultUser } from "next-auth";

type AppRole = "admin" | "user";

declare global {
  interface Product {
    id: string;
    slug: string;
    title: string;
    price: number;
    rating: number;
    description: string;
    mainImage: string;
    manufacturer: string;
    categoryId: string;
    category: { name: string }?;
    inStock: number;
    setId?: string | null;
    setSlotNumber?: number | null;
    isCollector?: boolean;
    set?: {
      id: string;
      name: string;
      totalSlots: number;
    } | null;
  }

  interface Merchant {
    id: string;
    name: string;
    email: string;
    description: string;
    phone: string;
    address: string;
    status: "active" | "inactive";
    createdAt: string;
    updatedAt: string;
  }

  interface SingleProductPageProps {
    params: {
      id: string;
      productSlug: string;
    };
  }

  type ProductInWishlist = {
    id: string;
    title: string;
    price: number;
    image: string;
    slug: string;
    stockAvailabillity: number;
  };

  interface OtherImages {
    imageID: number;
    productID: number;
    image: string;
  }

  interface Category {
    id: string;
    name: string;
  }

  interface User {
    id: string;
    email: string;
    password: string | null;
    role: AppRole;
  }

  interface Order {
    id: string;
    adress: string;
    apartment: string;
    company: string;
    dateTime: string;
    email: string;
    lastname: string;
    name: string;
    phone: string;
    postalCode: string;
    status: "processing" | "canceled" | "delivered";
    city: string;
    country: string;
    orderNotice: string?;
    total: number;
  }

  interface SingleProductBtnProps {
    product: Product;
    quantityCount: number;
  }

  interface WishListItem {
    id: string;
    userId: string;
    productId: string;
    product: Product;
  }
}


declare module "next-auth" {
  interface Session {
    user: DefaultSession["user"] & {
      id: string;
      email: string;
      role: AppRole;
    };
  }

  interface User extends DefaultUser {
    id: string;
    role: AppRole;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id?: string;
    role?: AppRole;
  }
}
