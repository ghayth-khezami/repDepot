export interface User {
  id: string;
  email: string;
  username?: string;
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
}

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

export interface Product {
  id: string;
  productName: string;
  description?: string;
  barcode?: string | null;
  marqueDoc?: string | null;
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
  markId?: string | null;
  mark?: { id: string; name: string; logoDoc: string } | null;
  category?: { id: string; categoryName: string };
  subCategory?: { id: string; title: string };
  photos?: Array<{ id: string; photoDoc: string }>;
  coClient?: { id: string; firstName: string; lastName: string };
  createdAt: string;
  updatedAt: string;
  isSold?: boolean;
}

export interface Client {
  id: string;
  firstName: string;
  lastName: string;
  address: string;
  email: string;
  phoneNumber: string;
}

export interface CoClient {
  id: string;
  firstName: string;
  lastName: string;
  address: string;
  email: string;
  phoneNumber: string;
  RIB: string;
}

export interface Category {
  id: string;
  categoryName: string;
  description?: string;
  icon?: string;
  coverDoc?: string;
}

export interface Command {
  id: string;
  productsNumber: number;
  PrixVente: number;
  PrixAchat: number;
  status: 'NOT_DELIVERED' | 'DELIVERED';
  dateLivraison?: string;
  adresseLivraison: string;
  createdAt: string;
  commandDetails?: Array<{
    product?: { id: string; productName: string; photos?: Array<{ photoDoc: string }> };
  }>;
}

export interface QueryParams {
  page?: number;
  limit?: number;
  search?: string;
  [key: string]: unknown;
}

export interface UpdateProductDto {
  productName?: string;
  description?: string;
  PrixVente?: number;
  PrixAchat?: number;
  stockQuantity?: number;
  isDispo?: boolean;
  isDepot?: boolean;
  depotPercentage?: number;
  categoryId?: string;
  subCategoryId?: string;
  markId?: string;
  coclientId?: string;
  barcode?: string;
}
