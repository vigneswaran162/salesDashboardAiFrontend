export const PAYMENT_METHODS = ['Cash', 'UPI', 'Card', 'Net Banking'] as const;
export const SALE_STATUSES = ['Completed', 'Pending', 'Cancelled'] as const;

export type PaymentMethod = (typeof PAYMENT_METHODS)[number];
export type SaleStatus = (typeof SALE_STATUSES)[number];

export interface Product {
  _id: string;
  name: string;
  category: string;
  price: number;
  stock: number;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface Sale {
  _id: string;
  invoiceNumber: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  productId: string;
  productName: string;
  category: string;
  quantity: number;
  unitPrice: number;
  discount: number;
  totalAmount: number;
  paymentMethod: PaymentMethod;
  status: SaleStatus;
  saleDate: string;
  notes?: string;
  createdAt?: string;
  updatedAt?: string;
}

/** Fields the client sends; invoice number, product details and total are derived on the server. */
export interface SalePayload {
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  productId: string;
  quantity: number;
  discount: number;
  paymentMethod: PaymentMethod;
  status: SaleStatus;
  saleDate: string;
  notes: string;
}

export type SortOrder = 'asc' | 'desc';

export interface SalesQuery {
  page: number;
  limit: number;
  search?: string;
  status?: string;
  paymentMethod?: string;
  startDate?: string;
  endDate?: string;
  sortBy?: string;
  sortOrder?: SortOrder;
}

export interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface ApiResponse<T> {
  success: boolean;
  message?: string;
  data: T;
}

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  pagination: Pagination;
}

export interface DashboardSummary {
  totalSales: number;
  totalRevenue: number;
  totalProducts: number;
  totalCustomers: number;
  completedSales: number;
  pendingSales: number;
  cancelledSales: number;
}

export interface MonthlySales {
  year: number;
  month: number;
  label: string;
  salesCount: number;
  quantity: number;
  revenue: number;
}

export interface CategorySales {
  category: string;
  salesCount: number;
  quantity: number;
  revenue: number;
}

export interface PaymentSummary {
  paymentMethod: PaymentMethod;
  salesCount: number;
  revenue: number;
}

export type RecentSale = Pick<
  Sale,
  '_id' | 'invoiceNumber' | 'customerName' | 'productName' | 'quantity' | 'totalAmount' | 'paymentMethod' | 'status' | 'saleDate'
>;

export interface Category {
  _id: string;
  name: string;
  description: string;
  isActive: boolean;
  productCount?: number;
  createdAt?: string;
  updatedAt?: string;
}
