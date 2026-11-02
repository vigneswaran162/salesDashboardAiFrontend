import { CurrencyPipe, DecimalPipe } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Product } from '../../core/models/sales.models';
import { AnalyticsService } from '../../core/services/analytics.service';
import { DateRangeService } from '../../core/services/date-range.service';
import { NotificationService } from '../../core/services/notification.service';
import { ProductService } from '../../core/services/product.service';
import { byProduct, filterByRange } from '../../core/utils/analytics';
import { ExportFormat, downloadTable } from '../../core/utils/export';
import { getErrorMessage } from '../../core/utils/http-error';
import { PagerComponent } from '../../shared/components/pager/pager.component';

const LOW_STOCK = 10;

interface ProductRow extends Product {
  units: number;
  orders: number;
  revenue: number;
  stockState: 'out' | 'low' | 'ok';
}

type SortKey = 'name' | 'category' | 'price' | 'stock' | 'units' | 'revenue';

@Component({
  selector: 'app-products',
  standalone: true,
  imports: [FormsModule, CurrencyPipe, DecimalPipe, PagerComponent],
  templateUrl: './products.component.html',
})
export class ProductsComponent implements OnInit {
  private readonly productService = inject(ProductService);
  private readonly notify = inject(NotificationService);
  readonly analytics = inject(AnalyticsService);
  readonly ranges = inject(DateRangeService);

  readonly products = signal<Product[]>([]);
  readonly loading = signal(false);
  readonly error = signal<string | null>(null);

  readonly search = signal('');
  readonly category = signal('');
  readonly stockFilter = signal<'' | 'active' | 'inactive' | 'low'>('');
  readonly sortKey = signal<SortKey>('revenue');
  readonly sortDir = signal<1 | -1>(-1);
  readonly page = signal(1);
  readonly pageSize = signal(10);

  readonly columns: { key: SortKey; label: string; num?: boolean }[] = [
    { key: 'name', label: 'Product' },
    { key: 'category', label: 'Category' },
    { key: 'price', label: 'Price', num: true },
    { key: 'stock', label: 'Stock', num: true },
    { key: 'units', label: 'Units sold', num: true },
    { key: 'revenue', label: 'Revenue', num: true },
  ];

  readonly categories = computed(() => [...new Set(this.products().map((p) => p.category))].sort());

  private readonly rows = computed<ProductRow[]>(() => {
    const stats = new Map(byProduct(filterByRange(this.analytics.sales(), this.ranges.range())).map((s) => [s.productId, s]));
    return this.products().map((p) => {
      const s = stats.get(p._id);
      return {
        ...p,
        units: s?.units ?? 0,
        orders: s?.orders ?? 0,
        revenue: s?.revenue ?? 0,
        stockState: p.stock === 0 ? 'out' : p.stock <= LOW_STOCK ? 'low' : 'ok',
      };
    });
  });

  readonly filtered = computed(() => {
    const term = this.search().trim().toLowerCase();
    const cat = this.category();
    const stock = this.stockFilter();
    const key = this.sortKey();
    const dir = this.sortDir();
    return this.rows()
      .filter((r) => !term || r.name.toLowerCase().includes(term) || r.category.toLowerCase().includes(term))
      .filter((r) => !cat || r.category === cat)
      .filter((r) =>
        stock === 'active' ? r.isActive : stock === 'inactive' ? !r.isActive : stock === 'low' ? r.stockState !== 'ok' : true
      )
      .sort((a, b) => {
        const av = a[key];
        const bv = b[key];
        return (typeof av === 'string' ? av.localeCompare(String(bv)) : Number(av) - Number(bv)) * dir;
      });
  });

  readonly pageRows = computed(() => {
    const start = (this.page() - 1) * this.pageSize();
    return this.filtered().slice(start, start + this.pageSize());
  });

  readonly maxRevenue = computed(() => Math.max(1, ...this.rows().map((r) => r.revenue)));

  readonly summary = computed(() => {
    const rows = this.rows();
    return {
      total: rows.length,
      active: rows.filter((r) => r.isActive).length,
      low: rows.filter((r) => r.isActive && r.stockState !== 'ok').length,
      stockValue: rows.filter((r) => r.isActive).reduce((s, r) => s + r.price * r.stock, 0),
    };
  });

  ngOnInit(): void {
    this.analytics.ensureLoaded();
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.error.set(null);
    this.productService.getProducts(true).subscribe({
      next: (products) => {
        this.products.set(products);
        this.loading.set(false);
      },
      error: (err) => {
        this.error.set(getErrorMessage(err, 'Failed to load products.'));
        this.loading.set(false);
      },
    });
  }

  sort(key: SortKey): void {
    if (this.sortKey() === key) this.sortDir.update((d) => (d === 1 ? -1 : 1));
    else {
      this.sortKey.set(key);
      this.sortDir.set(key === 'name' || key === 'category' ? 1 : -1);
    }
    this.page.set(1);
  }

  ariaSort(key: SortKey): 'ascending' | 'descending' | 'none' {
    return this.sortKey() !== key ? 'none' : this.sortDir() === 1 ? 'ascending' : 'descending';
  }

  /** Resets to page 1 whenever a filter changes. */
  setFilter<T>(setter: (v: T) => void, value: T): void {
    setter(value);
    this.page.set(1);
  }

  setPageSize(size: number): void {
    this.pageSize.set(size);
    this.page.set(1);
  }

  export(format: ExportFormat): void {
    const rows = this.filtered();
    downloadTable(format, `products-${new Date().toISOString().slice(0, 10)}`, 'Products', {
      headers: ['Product', 'Category', 'Price', 'Stock', 'Active', `Units sold (${this.ranges.label()})`, 'Orders', 'Revenue'],
      rows: rows.map((r) => [r.name, r.category, r.price, r.stock, r.isActive ? 'Yes' : 'No', r.units, r.orders, r.revenue]),
    });
    this.notify.success(`Exported ${rows.length} products`);
  }
}
