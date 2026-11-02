/**
 * Pure aggregation helpers over raw sales. Business rules mirror the backend dashboard:
 *  - revenue counts Completed sales only;
 *  - "orders" counts every sale regardless of status;
 *  - customers are unique by lower-cased email.
 */
import {
  CategoryStat,
  CustomerStat,
  DateRange,
  Granularity,
  Kpis,
  PaymentStat,
  ProductStat,
  StatusStat,
  TrendPoint,
  WeekdayStat,
} from '../models/analytics.models';
import { PAYMENT_METHODS, SALE_STATUSES, Sale } from '../models/sales.models';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const DAY_MS = 86_400_000;

export const isCompleted = (s: Sale): boolean => s.status === 'Completed';
export const round2 = (n: number): number => Math.round(n * 100) / 100;

/** YYYY-MM-DD of a sale in UTC — the same calendar day the tables display. */
export const saleDay = (s: Sale): string => s.saleDate.slice(0, 10);

export const toIsoDay = (d: Date): string => d.toISOString().slice(0, 10);
const parseDay = (day: string): Date => new Date(`${day}T00:00:00Z`);
export const addDays = (day: string, n: number): string => toIsoDay(new Date(parseDay(day).getTime() + n * DAY_MS));
export const daysBetween = (start: string, end: string): number =>
  Math.round((parseDay(end).getTime() - parseDay(start).getTime()) / DAY_MS) + 1;

/** Local "today" as YYYY-MM-DD. */
export const todayIso = (): string => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

export const inRange = (s: Sale, range: Pick<DateRange, 'start' | 'end'>): boolean => {
  const day = saleDay(s);
  return day >= range.start && day <= range.end;
};

export const filterByRange = (sales: Sale[], range: Pick<DateRange, 'start' | 'end'>): Sale[] =>
  sales.filter((s) => inRange(s, range));

/** The equally long period immediately before `range`, or null for "all time". */
export const previousRange = (range: DateRange): Pick<DateRange, 'start' | 'end'> | null => {
  if (range.preset === 'all') return null;
  const length = daysBetween(range.start, range.end);
  const end = addDays(range.start, -1);
  return { start: addDays(end, -(length - 1)), end };
};

/** Percentage change, or null when there is no baseline to compare with. */
export const pctChange = (current: number, previous: number): number | null =>
  previous > 0 ? ((current - previous) / previous) * 100 : null;

export const computeKpis = (sales: Sale[]): Kpis => {
  const customers = new Set<string>();
  const k: Kpis = {
    revenue: 0,
    orders: sales.length,
    completedOrders: 0,
    pendingOrders: 0,
    cancelledOrders: 0,
    units: 0,
    customers: 0,
    avgOrderValue: 0,
    discount: 0,
    grossValue: 0,
    pendingValue: 0,
  };
  for (const s of sales) {
    customers.add(s.customerEmail.toLowerCase());
    if (s.status === 'Completed') {
      k.completedOrders++;
      k.revenue += s.totalAmount;
      k.units += s.quantity;
      k.discount += s.discount || 0;
      k.grossValue += s.quantity * s.unitPrice;
    } else if (s.status === 'Pending') {
      k.pendingOrders++;
      k.pendingValue += s.totalAmount;
    } else {
      k.cancelledOrders++;
    }
  }
  k.revenue = round2(k.revenue);
  k.customers = customers.size;
  k.avgOrderValue = k.completedOrders ? k.revenue / k.completedOrders : 0;
  return k;
};

/** Picks a readable bucket size for a range length. */
export const autoGranularity = (range: Pick<DateRange, 'start' | 'end'>): Granularity => {
  const days = daysBetween(range.start, range.end);
  return days <= 31 ? 'day' : days <= 120 ? 'week' : 'month';
};

const bucketStart = (day: string, g: Granularity): string => {
  if (g === 'day') return day;
  if (g === 'month') return `${day.slice(0, 7)}-01`;
  const d = parseDay(day);
  const offset = (d.getUTCDay() + 6) % 7; // Monday-based weeks
  return addDays(day, -offset);
};

const nextBucket = (start: string, g: Granularity): string => {
  if (g === 'day') return addDays(start, 1);
  if (g === 'week') return addDays(start, 7);
  const d = parseDay(start);
  return toIsoDay(new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 1)));
};

const bucketLabel = (start: string, g: Granularity): string => {
  const d = parseDay(start);
  if (g === 'month') return `${MONTHS[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
  return `${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]}`;
};

/** Continuous series (empty buckets included) across the range. */
export const buildTrend = (
  sales: Sale[],
  range: Pick<DateRange, 'start' | 'end'>,
  g: Granularity
): TrendPoint[] => {
  const points = new Map<string, TrendPoint>();
  for (let key = bucketStart(range.start, g); key <= range.end; key = nextBucket(key, g)) {
    points.set(key, { key, label: bucketLabel(key, g), revenue: 0, orders: 0, completed: 0, units: 0 });
  }
  for (const s of sales) {
    const p = points.get(bucketStart(saleDay(s), g));
    if (!p) continue;
    p.orders++;
    if (isCompleted(s)) {
      p.completed++;
      p.revenue += s.totalAmount;
      p.units += s.quantity;
    }
  }
  return [...points.values()].map((p) => ({ ...p, revenue: round2(p.revenue) }));
};

export const byCategory = (sales: Sale[]): CategoryStat[] => {
  const map = new Map<string, CategoryStat & { products: Map<string, number> }>();
  let total = 0;
  for (const s of sales) {
    const c = map.get(s.category) ?? {
      category: s.category, revenue: 0, orders: 0, units: 0, share: 0, topProduct: '', products: new Map(),
    };
    c.orders++;
    if (isCompleted(s)) {
      c.revenue += s.totalAmount;
      c.units += s.quantity;
      total += s.totalAmount;
      c.products.set(s.productName, (c.products.get(s.productName) ?? 0) + s.totalAmount);
    }
    map.set(s.category, c);
  }
  return [...map.values()]
    .map(({ products, ...c }) => ({
      ...c,
      revenue: round2(c.revenue),
      share: total ? (c.revenue / total) * 100 : 0,
      topProduct: [...products.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? '—',
    }))
    .sort((a, b) => b.revenue - a.revenue);
};

export const byProduct = (sales: Sale[]): ProductStat[] => {
  const map = new Map<string, ProductStat>();
  for (const s of sales) {
    const id = String(s.productId);
    const p = map.get(id) ?? { productId: id, productName: s.productName, category: s.category, revenue: 0, orders: 0, units: 0 };
    p.orders++;
    if (isCompleted(s)) {
      p.revenue += s.totalAmount;
      p.units += s.quantity;
    }
    map.set(id, p);
  }
  return [...map.values()].map((p) => ({ ...p, revenue: round2(p.revenue) })).sort((a, b) => b.revenue - a.revenue);
};

export const byPayment = (sales: Sale[]): PaymentStat[] =>
  PAYMENT_METHODS.map((m) => {
    const rows = sales.filter((s) => s.paymentMethod === m);
    return {
      paymentMethod: m,
      orders: rows.length,
      revenue: round2(rows.filter(isCompleted).reduce((sum, s) => sum + s.totalAmount, 0)),
    };
  }).sort((a, b) => b.orders - a.orders);

export const byStatus = (sales: Sale[]): StatusStat[] =>
  SALE_STATUSES.map((status) => {
    const rows = sales.filter((s) => s.status === status);
    return { status, orders: rows.length, value: round2(rows.reduce((sum, s) => sum + s.totalAmount, 0)) };
  });

export const byWeekday = (sales: Sale[]): WeekdayStat[] => {
  const stats = WEEKDAYS.map((day) => ({ day, orders: 0, revenue: 0 }));
  for (const s of sales) {
    const idx = (parseDay(saleDay(s)).getUTCDay() + 6) % 7;
    stats[idx].orders++;
    if (isCompleted(s)) stats[idx].revenue += s.totalAmount;
  }
  return stats.map((w) => ({ ...w, revenue: round2(w.revenue) }));
};

export const byCustomer = (sales: Sale[]): CustomerStat[] => {
  const map = new Map<string, CustomerStat>();
  // Oldest first so the latest sale's name/phone wins.
  const ordered = [...sales].sort((a, b) => a.saleDate.localeCompare(b.saleDate));
  for (const s of ordered) {
    const key = s.customerEmail.toLowerCase();
    const day = saleDay(s);
    const c = map.get(key) ?? {
      key, name: s.customerName, email: s.customerEmail, phone: s.customerPhone,
      orders: 0, completedOrders: 0, spent: 0, firstPurchase: day, lastPurchase: day,
    };
    c.name = s.customerName;
    c.phone = s.customerPhone;
    c.orders++;
    c.lastPurchase = day;
    if (isCompleted(s)) {
      c.completedOrders++;
      c.spent += s.totalAmount;
    }
    map.set(key, c);
  }
  return [...map.values()].map((c) => ({ ...c, spent: round2(c.spent) })).sort((a, b) => b.spent - a.spent);
};

/** Completed revenue per calendar month (YYYY-MM) inside the range, oldest first. */
export const monthlyRevenue = (sales: Sale[], range: Pick<DateRange, 'start' | 'end'>): TrendPoint[] =>
  buildTrend(sales, range, 'month');

export const initials = (name: string): string =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]!.toUpperCase())
    .join('');
