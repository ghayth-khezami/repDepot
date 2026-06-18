export interface Category {
  id: string;
  categoryName: string;
  description?: string;
  icon?: string;
  coverDoc?: string;
}

export interface ClientFeedback {
  id: string;
  clientName: string;
  description: string;
  rating: number;
  sortOrder: number;
  isPublished: boolean;
}

export interface Mark {
  id: string;
  name: string;
  logoDoc: string;
  sortOrder?: number;
  _count?: { products: number };
}

export interface SubCategory {
  id: string;
  title: string;
  description?: string | null;
  categoryId: string;
  category?: { id: string; categoryName: string };
}

export interface Product {
  id: string;
  productName: string;
  description?: string | null;
  marqueDoc?: string | null;
  instagramLink?: string | null;
  facebookLink?: string | null;
  tiktokLink?: string | null;
  PrixVente: number;
  PrixAchat?: number | null;
  stockQuantity: number;
  isDispo?: boolean;
  createdAt: string;
  updatedAt?: string;
  category?: {
    id: string;
    categoryName: string;
  };
  subCategory?: {
    id: string;
    title: string;
    description?: string | null;
  };
  markId?: string | null;
  mark?: Mark | null;
  subCategoryId?: string | null;
  photos?: Array<{
    id: string;
    photoDoc: string;
  }>;
  categoryId?: string;
}

export interface ApiPaginated<T> {
  data: T[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface AuthUser {
  id: string;
  email: string;
  username?: string;
  role?: "CLIENT" | "DEPOSER" | "ADMIN";
}

export interface CartItem {
  product: Product;
  quantity: number;
}

export interface ClientProfile {
  id: string;
  firstName: string;
  lastName: string;
  address: string;
  email: string;
  phoneNumber: string;
}

export interface CheckoutCommandPayload {
  productIds: string[];
  clientId?: string;
  guestClient?: {
    firstName: string;
    lastName: string;
    address: string;
    email?: string;
    phoneNumber: string;
  };
  coClientId?: string;
  adresseLivraison: string;
  dateLivraison?: string;
}

/** @deprecated Use CheckoutCommandPayload — prices are computed server-side */
export interface CreateCommandPayload {
  productIds: string[];
  productsNumber: number;
  PrixVente: number;
  PrixAchat: number;
  clientId?: string;
  guestClient?: {
    firstName: string;
    lastName: string;
    address: string;
    email?: string;
    phoneNumber: string;
  };
  adresseLivraison: string;
}
