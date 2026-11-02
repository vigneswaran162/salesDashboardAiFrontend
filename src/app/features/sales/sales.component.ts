import { CurrencyPipe, DatePipe } from '@angular/common';
import { Component, DestroyRef, OnInit, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { Subject, catchError, debounceTime, distinctUntilChanged, finalize, forkJoin, map, of, switchMap, tap } from 'rxjs';
import {
  PAYMENT_METHODS,
  Pagination,
  Product,
  SALE_STATUSES,
  Sale,
  SalesQuery,
  SortOrder,
} from '../../core/models/sales.models';
import { NotificationService } from '../../core/services/notification.service';
import { ProductService } from '../../core/services/product.service';
import { SalesService } from '../../core/services/sales.service';
import { initials } from '../../core/utils/analytics';
import { ExportFormat, downloadTable } from '../../core/utils/export';
import { getErrorMessage } from '../../core/utils/http-error';
import { salesExportTable } from '../../core/utils/sales-export';
import { PagerComponent } from '../../shared/components/pager/pager.component';
import { ClickOutsideDirective } from '../../shared/directives/click-outside.directive';
import { ConfirmationDialogComponent } from '../../shared/components/confirmation-dialog/confirmation-dialog.component';
import { StatusBadgeComponent } from '../../shared/components/status-badge/status-badge.component';
import { SaleDetailsComponent } from './sale-details.component';
import { SalesFormComponent } from './sales-form.component';

interface Column {
  key: keyof Sale;
  label: string;
  align?: 'end';
}

@Component({
  selector: 'app-sales',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    CurrencyPipe,
    DatePipe,
    StatusBadgeComponent,
    ConfirmationDialogComponent,
    SalesFormComponent,
    SaleDetailsComponent,
    PagerComponent,
    ClickOutsideDirective,
  ],
  templateUrl: './sales.component.html',
  styleUrl: './sales.component.css',
})
export class SalesComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly salesService = inject(SalesService);
  private readonly productService = inject(ProductService);
  private readonly notify = inject(NotificationService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly route = inject(ActivatedRoute);

  readonly paymentMethods = PAYMENT_METHODS;
  readonly statuses = SALE_STATUSES;
  readonly pageSizes = [10, 25, 50];
  readonly columns: Column[] = [
    { key: 'invoiceNumber', label: 'Invoice No.' },
    { key: 'customerName', label: 'Customer' },
    { key: 'productName', label: 'Product' },
    { key: 'quantity', label: 'Qty', align: 'end' },
    { key: 'unitPrice', label: 'Unit Price', align: 'end' },
    { key: 'discount', label: 'Discount', align: 'end' },
    { key: 'totalAmount', label: 'Total', align: 'end' },
    { key: 'paymentMethod', label: 'Payment' },
    { key: 'saleDate', label: 'Sale Date' },
    { key: 'status', label: 'Status' },
  ];

  readonly filters = this.fb.nonNullable.group({
    search: [''],
    paymentMethod: [''],
    status: [''],
    startDate: [''],
    endDate: [''],
  });

  // List state
  readonly sales = signal<Sale[]>([]);
  readonly pagination = signal<Pagination>({ page: 1, limit: 10, total: 0, totalPages: 1 });
  readonly loading = signal(false);
  readonly error = signal<string | null>(null);
  readonly sortBy = signal<keyof Sale>('saleDate');
  readonly sortOrder = signal<SortOrder>('desc');
  readonly page = signal(1);
  readonly limit = signal(10);

  // Modal state
  readonly products = signal<Product[]>([]);
  readonly formOpen = signal(false);
  readonly editingSale = signal<Sale | null>(null);
  readonly viewingSale = signal<Sale | null>(null);
  readonly deletingSale = signal<Sale | null>(null);
  readonly deleting = signal(false);

  readonly hasActiveFilters = computed(() => this.activeFilterCount() > 0);
  readonly activeFilterCount = signal(0);

  readonly exporting = signal(false);
  readonly exportMenuOpen = signal(false);
  readonly initials = initials;

  private readonly reload$ = new Subject<void>();

  ngOnInit(): void {
    this.reload$
      .pipe(
        tap(() => {
          this.loading.set(true);
          this.error.set(null);
        }),
        // switchMap cancels a stale request when filters change quickly.
        switchMap(() =>
          this.salesService.getSales(this.buildQuery()).pipe(
            catchError((err) => {
              this.error.set(getErrorMessage(err, 'Failed to load sales.'));
              return of(null);
            }),
            finalize(() => this.loading.set(false))
          )
        ),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe((res) => {
        if (!res) return;
        this.sales.set(res.data);
        this.pagination.set(res.pagination);
        // If a deletion emptied the last page, step back one page.
        if (!res.data.length && res.pagination.total > 0 && this.page() > res.pagination.totalPages) {
          this.goToPage(res.pagination.totalPages);
        }
      });

    // Debounce typing in the search box; other filters apply immediately.
    this.filters.valueChanges
      .pipe(
        debounceTime(350),
        map(() => JSON.stringify(this.filters.getRawValue())),
        distinctUntilChanged(),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe(() => {
        const values = this.filters.getRawValue();
        this.activeFilterCount.set(Object.values(values).filter((v) => !!v.trim()).length);
        this.page.set(1);
        this.reload$.next();
      });

    // Global search in the top bar navigates here with ?search=…
    this.route.queryParamMap.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((params) => {
      const search = params.get('search');
      if (search !== null && search !== this.filters.controls.search.value) {
        this.filters.controls.search.setValue(search);
      }
    });

    this.loadProducts();
    this.reload$.next();
  }

  // ---- List controls ----

  sort(column: keyof Sale): void {
    if (this.sortBy() === column) {
      this.sortOrder.update((o) => (o === 'asc' ? 'desc' : 'asc'));
    } else {
      this.sortBy.set(column);
      this.sortOrder.set(column === 'saleDate' || column === 'totalAmount' ? 'desc' : 'asc');
    }
    this.page.set(1);
    this.reload$.next();
  }

  ariaSort(column: keyof Sale): 'ascending' | 'descending' | 'none' {
    if (this.sortBy() !== column) return 'none';
    return this.sortOrder() === 'asc' ? 'ascending' : 'descending';
  }

  goToPage(page: number): void {
    const { totalPages } = this.pagination();
    const target = Math.min(Math.max(page, 1), totalPages);
    if (target === this.page() && !this.error()) return;
    this.page.set(target);
    this.reload$.next();
  }

  changePageSize(size: number | string): void {
    this.limit.set(Number(size));
    this.page.set(1);
    this.reload$.next();
  }

  clearFilters(): void {
    this.filters.reset();
  }

  retry(): void {
    this.reload$.next();
  }

  // ---- Export ----

  /** Exports every sale matching the current filters and sort (all pages), not just the visible page. */
  exportSales(format: ExportFormat): void {
    this.exportMenuOpen.set(false);
    const total = this.pagination().total;
    if (!total) {
      this.notify.info('There are no sales to export for the current filters.');
      return;
    }
    const pageSize = 100;
    const pages = Array.from({ length: Math.ceil(total / pageSize) }, (_, i) =>
      this.salesService.getSales({ ...this.buildQuery(), page: i + 1, limit: pageSize })
    );
    this.exporting.set(true);
    forkJoin(pages).subscribe({
      next: (responses) => {
        const rows = responses.flatMap((r) => r.data);
        const stamp = new Date().toISOString().slice(0, 10);
        downloadTable(format, `sales-${stamp}`, 'Sales', salesExportTable(rows));
        this.exporting.set(false);
        this.notify.success(`Exported ${rows.length} sales to ${format === 'csv' ? 'CSV' : 'Excel'}`);
      },
      error: (err) => {
        this.exporting.set(false);
        this.notify.error(getErrorMessage(err, 'Export failed.'));
      },
    });
  }

  // ---- CRUD ----

  openCreate(): void {
    this.editingSale.set(null);
    this.formOpen.set(true);
    if (!this.products().length) this.loadProducts();
  }

  openEdit(sale: Sale): void {
    this.viewingSale.set(null);
    this.editingSale.set(sale);
    this.formOpen.set(true);
  }

  closeForm(): void {
    this.formOpen.set(false);
    this.editingSale.set(null);
  }

  onSaved(): void {
    this.closeForm();
    this.reload$.next();
  }

  view(sale: Sale): void {
    this.viewingSale.set(sale);
  }

  confirmDelete(sale: Sale): void {
    this.deletingSale.set(sale);
  }

  cancelDelete(): void {
    if (!this.deleting()) this.deletingSale.set(null);
  }

  deleteSale(): void {
    const sale = this.deletingSale();
    if (!sale) return;

    this.deleting.set(true);
    this.salesService.deleteSale(sale._id).subscribe({
      next: (res) => {
        this.deleting.set(false);
        this.deletingSale.set(null);
        this.notify.success(res.message || `Sale ${sale.invoiceNumber} deleted`);
        this.reload$.next();
      },
      error: (err) => {
        this.deleting.set(false);
        this.deletingSale.set(null);
        this.notify.error(getErrorMessage(err, 'Failed to delete the sale.'));
      },
    });
  }

  private loadProducts(): void {
    this.productService.getProducts().subscribe({
      next: (products) => this.products.set(products),
      error: (err) => this.notify.error(getErrorMessage(err, 'Failed to load products.')),
    });
  }

  private buildQuery(): SalesQuery {
    const f = this.filters.getRawValue();
    return {
      page: this.page(),
      limit: this.limit(),
      search: f.search.trim(),
      status: f.status,
      paymentMethod: f.paymentMethod,
      startDate: f.startDate,
      endDate: f.endDate,
      sortBy: this.sortBy(),
      sortOrder: this.sortOrder(),
    };
  }
}
