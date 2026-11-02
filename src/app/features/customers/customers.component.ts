import { CurrencyPipe, DatePipe, DecimalPipe } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { CustomerStat } from '../../core/models/analytics.models';
import { AnalyticsService } from '../../core/services/analytics.service';
import { DateRangeService } from '../../core/services/date-range.service';
import { NotificationService } from '../../core/services/notification.service';
import { byCustomer, filterByRange, initials } from '../../core/utils/analytics';
import { ExportFormat, downloadTable } from '../../core/utils/export';
import { PagerComponent } from '../../shared/components/pager/pager.component';

type SortKey = 'name' | 'orders' | 'spent' | 'lastPurchase';

@Component({
  selector: 'app-customers',
  standalone: true,
  imports: [FormsModule, RouterLink, CurrencyPipe, DatePipe, DecimalPipe, PagerComponent],
  templateUrl: './customers.component.html',
})
export class CustomersComponent implements OnInit {
  private readonly notify = inject(NotificationService);
  readonly analytics = inject(AnalyticsService);
  readonly ranges = inject(DateRangeService);
  readonly initials = initials;

  readonly search = signal('');
  readonly segment = signal<'' | 'repeat' | 'new'>('');
  readonly sortKey = signal<SortKey>('spent');
  readonly sortDir = signal<1 | -1>(-1);
  readonly page = signal(1);
  readonly pageSize = signal(10);

  readonly columns: { key: SortKey; label: string; num?: boolean }[] = [
    { key: 'name', label: 'Customer' },
    { key: 'orders', label: 'Orders', num: true },
    { key: 'spent', label: 'Total spent', num: true },
    { key: 'lastPurchase', label: 'Last purchase' },
  ];

  /** First purchase across all time, so "new" means first-ever order inside the range. */
  private readonly firstEver = computed(() => new Map(byCustomer(this.analytics.sales()).map((c) => [c.key, c.firstPurchase])));

  readonly customers = computed(() => {
    const start = this.ranges.range().start;
    const first = this.firstEver();
    return byCustomer(filterByRange(this.analytics.sales(), this.ranges.range())).map((c) => ({
      ...c,
      isNew: (first.get(c.key) ?? c.firstPurchase) >= start,
    }));
  });

  readonly summary = computed(() => {
    const rows = this.customers();
    const spent = rows.reduce((s, c) => s + c.spent, 0);
    const buyers = rows.filter((c) => c.completedOrders > 0).length;
    return {
      total: rows.length,
      repeat: rows.filter((c) => c.orders > 1).length,
      isNew: rows.filter((c) => c.isNew).length,
      avgSpend: buyers ? spent / buyers : 0,
    };
  });

  readonly filtered = computed(() => {
    const term = this.search().trim().toLowerCase();
    const seg = this.segment();
    const key = this.sortKey();
    const dir = this.sortDir();
    return this.customers()
      .filter((c) => !term || c.name.toLowerCase().includes(term) || c.email.toLowerCase().includes(term) || c.phone.includes(term))
      .filter((c) => (seg === 'repeat' ? c.orders > 1 : seg === 'new' ? c.isNew : true))
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

  ngOnInit(): void {
    this.analytics.ensureLoaded();
  }

  sort(key: SortKey): void {
    if (this.sortKey() === key) this.sortDir.update((d) => (d === 1 ? -1 : 1));
    else {
      this.sortKey.set(key);
      this.sortDir.set(key === 'name' ? 1 : -1);
    }
    this.page.set(1);
  }

  ariaSort(key: SortKey): 'ascending' | 'descending' | 'none' {
    return this.sortKey() !== key ? 'none' : this.sortDir() === 1 ? 'ascending' : 'descending';
  }

  setFilter<T>(setter: (v: T) => void, value: T): void {
    setter(value);
    this.page.set(1);
  }

  setPageSize(size: number): void {
    this.pageSize.set(size);
    this.page.set(1);
  }

  export(format: ExportFormat): void {
    const rows: CustomerStat[] = this.filtered();
    downloadTable(format, `customers-${new Date().toISOString().slice(0, 10)}`, 'Customers', {
      headers: ['Name', 'Email', 'Phone', 'Orders', 'Completed orders', 'Total spent', 'First purchase', 'Last purchase'],
      rows: rows.map((c) => [c.name, c.email, c.phone, c.orders, c.completedOrders, c.spent, c.firstPurchase, c.lastPurchase]),
    });
    this.notify.success(`Exported ${rows.length} customers`);
  }
}
