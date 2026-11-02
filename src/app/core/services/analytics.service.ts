import { Injectable, computed, inject, signal } from '@angular/core';
import { Subscription, forkJoin, map, of, switchMap } from 'rxjs';
import { Sale } from '../models/sales.models';
import { getErrorMessage } from '../utils/http-error';
import { saleDay } from '../utils/analytics';
import { SalesService } from './sales.service';

/** The sales list API caps a page at 100 rows. */
const PAGE_SIZE = 100;

/**
 * Loads every sale through the existing paginated GET /api/sales endpoint and keeps them in memory,
 * so analytics pages can filter by any date range without new backend endpoints.
 * Reloads automatically after any create, update or delete.
 */
@Injectable({ providedIn: 'root' })
export class AnalyticsService {
  private readonly salesService = inject(SalesService);
  private request?: Subscription;

  readonly sales = signal<Sale[]>([]);
  readonly loading = signal(false);
  readonly loaded = signal(false);
  readonly error = signal<string | null>(null);
  readonly lastUpdated = signal<Date | null>(null);

  /** Earliest sale day (YYYY-MM-DD), used by the "All time" range. */
  readonly firstSaleDay = computed(() => this.sales().reduce<string | null>((min, s) => {
    const day = saleDay(s);
    return !min || day < min ? day : min;
  }, null));

  constructor() {
    this.salesService.changed$.subscribe(() => {
      if (this.loaded()) this.refresh();
    });
  }

  ensureLoaded(): void {
    if (!this.loaded() && !this.loading()) this.refresh();
  }

  refresh(): void {
    this.request?.unsubscribe();
    this.loading.set(true);
    this.error.set(null);

    const page = (n: number) =>
      this.salesService.getSales({ page: n, limit: PAGE_SIZE, sortBy: 'saleDate', sortOrder: 'asc' });

    this.request = page(1)
      .pipe(
        switchMap((first) => {
          const rest = Array.from({ length: first.pagination.totalPages - 1 }, (_, i) => page(i + 2));
          return (rest.length ? forkJoin(rest) : of([])).pipe(
            map((pages) => [first, ...pages].flatMap((p) => p.data))
          );
        })
      )
      .subscribe({
        next: (sales) => {
          this.sales.set(sales);
          this.loaded.set(true);
          this.loading.set(false);
          this.lastUpdated.set(new Date());
        },
        error: (err) => {
          this.error.set(getErrorMessage(err, 'Failed to load sales data.'));
          this.loading.set(false);
        },
      });
  }
}
