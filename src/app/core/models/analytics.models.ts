import { PaymentMethod, SaleStatus } from './sales.models';

export type RangePreset = '7d' | '30d' | '90d' | 'ytd' | '12m' | 'all' | 'custom';
export type Granularity = 'day' | 'week' | 'month';

/** Inclusive date range as YYYY-MM-DD strings (sale dates are compared by their UTC calendar day). */
export interface DateRange {
  preset: RangePreset;
  start: string;
  end: string;
}

export interface TrendPoint {
  key: string;
  label: string;
  revenue: number;
  orders: number;
  completed: number;
  units: number;
}

export interface Kpis {
  revenue: number;
  orders: number;
  completedOrders: number;
  pendingOrders: number;
  cancelledOrders: number;
  units: number;
  customers: number;
  avgOrderValue: number;
  discount: number;
  grossValue: number;
  pendingValue: number;
}

export interface CategoryStat {
  category: string;
  revenue: number;
  orders: number;
  units: number;
  share: number;
  topProduct: string;
}

export interface ProductStat {
  productId: string;
  productName: string;
  category: string;
  revenue: number;
  orders: number;
  units: number;
}

export interface PaymentStat {
  paymentMethod: PaymentMethod;
  revenue: number;
  orders: number;
}

export interface StatusStat {
  status: SaleStatus;
  orders: number;
  value: number;
}

export interface CustomerStat {
  key: string;
  name: string;
  email: string;
  phone: string;
  orders: number;
  completedOrders: number;
  spent: number;
  firstPurchase: string;
  lastPurchase: string;
}

export interface WeekdayStat {
  day: string;
  orders: number;
  revenue: number;
}
