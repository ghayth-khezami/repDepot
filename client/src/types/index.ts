export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
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
  firstName: string;
  lastName: string;
  address: string;
  email: string;
  phoneNumber: string;
  RIB: string;
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
  coclientId?: string;
  categoryId: string;
  subCategoryId?: string | null;
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
  address: string;
  email: string;
  phoneNumber: string;
  RIB: string;
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
  subCategoryId?: string;
}

export interface QueryParams {
  page?: number;
  limit?: number;
  search?: string;
  [key: string]: any;
}
