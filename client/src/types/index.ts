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

export interface Category {
  id: string;
  categoryName: string;
  description?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Product {
  id: string;
  productName: string;
  description?: string;
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
  category?: {
    id: string;
    categoryName: string;
  };
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
}

export interface CreateCategoryDto {
  categoryName: string;
  description?: string;
}

export interface UpdateCategoryDto {
  categoryName?: string;
  description?: string;
}

export interface UpdateProductDto {
  productName?: string;
  description?: string;
  PrixVente?: number;
  PrixAchat?: number;
  stockQuantity?: number;
  isDepot?: boolean;
  coclientId?: string;
  categoryId?: string;
}

export interface QueryParams {
  page?: number;
  limit?: number;
  search?: string;
  [key: string]: any;
}
