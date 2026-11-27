export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  /** Optional segment counts returned by some admin lists. */
  counts?: Record<string, number>;
}

export interface PaginatedResponse<T> {
  data: T[];
  meta: PaginationMeta;
}

export interface User {
  id: string;
  email: string;
  username?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Client {
  id: string;
  firstName: string;
  lastName: string;
  address: string;
  email: string;
  phoneNumber: string;
  createdAt: string;
  updatedAt: string;
}

export interface CoClient {
  id: string;
  number?: number;
  firstName: string;
  lastName: string;
  address: string | null;
  email: string | null;
  phoneNumber: string;
  RIB: string | null;
  gender?: 'F' | 'M' | null;
  lat?: number | null;
  lng?: number | null;
  createdAt: string;
  updatedAt: string;
}

export interface SubCategory {
  id: string;
  title: string;
  description?: string | null;
  categoryId: string;
  category?: { id: string; categoryName: string };
  _count?: { products: number };
  createdAt: string;
  updatedAt: string;
}

export interface Category {
  id: string;
  categoryName: string;
  description?: string;
  icon?: string;
  coverDoc?: string;
  createdAt: string;
  updatedAt: string;
  subCategories?: Array<
    SubCategory & { _count?: { products: number } }
  >;
}

export interface Product {
  id: string;
  productName: string;
  description?: string;
  instagramLink?: string;
  facebookLink?: string;
  tiktokLink?: string;
  PrixVente: number;
  PrixAchat?: number;
  stockQuantity: number;
  isDepot: boolean;
  depotPercentage?: number;
  surcharge?: number;
  gain?: number;
  isDispo?: boolean;
  /** Unique human reference (D-143-01 for dépôt items, P-00042 otherwise). */
  ref?: string;
  status?: 'EN_VENTE' | 'VENDU' | 'RETIRE';
  soldAt?: string | null;
  payoutStatus?: 'A_PERCEVOIR' | 'PAYE' | null;
  shopAmountMillimes?: number | null;
  depositorAmountMillimes?: number | null;
  depositRequestId?: string | null;
  depositRequest?: { id: string; contractNumber: string | null } | null;
  coclientId?: string;
  categoryId: string;
  subCategoryId?: string | null;
  subSubCategory1Id?: string | null;
  subSubCategory2Id?: string | null;
  subSubCategory3Id?: string | null;
  category?: {
    id: string;
    categoryName: string;
  };
  subCategory?: {
    id: string;
    title: string;
  };
  photos?: Array<{
    id: string;
    photoDoc: string;
  }>;
  coClient?: {
    id: string;
    firstName: string;
    lastName: string;
  };
  createdAt: string;
  updatedAt: string;
}

export interface CreateUserDto {
  email: string;
  password: string;
  username?: string;
}

export interface UpdateUserDto {
  email?: string;
  password?: string;
  username?: string;
}

export interface CreateClientDto {
  firstName: string;
  lastName: string;
  address: string;
  email: string;
  phoneNumber: string;
}

export interface CreateCoClientDto {
  firstName: string;
  lastName: string;
  address?: string;
  email?: string;
  phoneNumber: string;
  RIB?: string;
  password?: string;
}

export interface CreateCategoryDto {
  categoryName: string;
  description?: string;
  icon?: string;
}

export interface UpdateCategoryDto {
  categoryName?: string;
  description?: string;
  icon?: string;
}

export interface UpdateProductDto {
  productName?: string;
  description?: string;
  instagramLink?: string;
  facebookLink?: string;
  tiktokLink?: string;
  PrixVente?: number;
  PrixAchat?: number;
  stockQuantity?: number;
  isDispo?: boolean;
  isDepot?: boolean;
  coclientId?: string;
  categoryId?: string;
  categoryIds?: string[];
  subCategoryId?: string;
  subCategoryIds?: string[];
  subSubCategory1Id?: string;
  subSubCategory1Ids?: string[];
  subSubCategory2Id?: string;
  subSubCategory2Ids?: string[];
  subSubCategory3Id?: string;
  subSubCategory3Ids?: string[];
}

export interface QueryParams {
  page?: number;
  limit?: number;
  search?: string;
  [key: string]: any;
}
