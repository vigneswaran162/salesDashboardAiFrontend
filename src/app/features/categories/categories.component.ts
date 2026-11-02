import { CurrencyPipe, DecimalPipe } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { ChartConfiguration } from 'chart.js';
import { Category, Product } from '../../core/models/sales.models';
import { AnalyticsService } from '../../core/services/analytics.service';
import { DateRangeService } from '../../core/services/date-range.service';
import { CategoryService } from '../../core/services/category.service';
import { NotificationService } from '../../core/services/notification.service';
import { getErrorMessage } from '../../core/utils/http-error';
import { ProductService } from '../../core/services/product.service';
import { SettingsService } from '../../core/services/settings.service';
import { byCategory, filterByRange, pctChange } from '../../core/utils/analytics';
import { chartTheme, colorByName, inr, inrCompact, withAlpha } from '../../shared/charts/chart-theme';
import { ConfirmationDialogComponent } from '../../shared/components/confirmation-dialog/confirmation-dialog.component';
import { ChartComponent } from '../../shared/components/chart/chart.component';
import { PanelComponent } from '../../shared/components/panel/panel.component';
import { CategoryFormComponent } from './category-form.component';

@Component({
  selector: 'app-categories',
  standalone: true,
  imports: [CurrencyPipe, DecimalPipe, ChartComponent, PanelComponent, CategoryFormComponent, ConfirmationDialogComponent],
  templateUrl: './categories.component.html',
  styleUrl: './categories.component.css',
})
export class CategoriesComponent implements OnInit {
  private readonly productService = inject(ProductService);
  private readonly categoryService = inject(CategoryService);
  private readonly notify = inject(NotificationService);
  private readonly settings = inject(SettingsService);
  readonly analytics = inject(AnalyticsService);
  readonly ranges = inject(DateRangeService);

  readonly products = signal<Product[]>([]);
  readonly records = signal<Category[]>([]);
  readonly formOpen = signal(false);
  readonly editing = signal<Category | null>(null);
  readonly deleting = signal<Category | null>(null);
  readonly deleteBusy = signal(false);
  private readonly theme = computed(() => chartTheme(this.settings.isDark()));

  readonly categories = computed(() => {
    const current = byCategory(filterByRange(this.analytics.sales(), this.ranges.range()));
    const prevRange = this.ranges.previous();
    const prev = prevRange ? new Map(byCategory(filterByRange(this.analytics.sales(), prevRange)).map((c) => [c.category, c])) : null;
    const productCounts = new Map<string, number>();
    for (const p of this.products()) if (p.isActive) productCounts.set(p.category, (productCounts.get(p.category) ?? 0) + 1);

    // Include catalogue categories with no sales in range too.
    const recordByName = new Map(this.records().map((r) => [r.name, r]));
    const names = [...new Set([...current.map((c) => c.category), ...productCounts.keys(), ...recordByName.keys()])];
    const color = colorByName(names, this.theme());
    const byName = new Map(current.map((c) => [c.category, c]));

    return names
      .map((name) => {
        const c = byName.get(name);
        const prevRevenue = prev?.get(name)?.revenue ?? 0;
        return {
          category: name,
          revenue: c?.revenue ?? 0,
          orders: c?.orders ?? 0,
          units: c?.units ?? 0,
          share: c?.share ?? 0,
          topProduct: c?.topProduct ?? '—',
          products: productCounts.get(name) ?? 0,
          record: recordByName.get(name) ?? null,
          prevRevenue,
          delta: prev ? pctChange(c?.revenue ?? 0, prevRevenue) : null,
          color: color(name),
        };
      })
      .sort((a, b) => b.revenue - a.revenue);
  });

  readonly comparisonConfig = computed<ChartConfiguration>(() => {
    const t = this.theme();
    const rows = this.categories();
    const hasPrev = !!this.ranges.previous();
    return {
      type: 'bar',
      data: {
        labels: rows.map((r) => r.category),
        datasets: [
          { label: 'This period', data: rows.map((r) => r.revenue), backgroundColor: t.primary, maxBarThickness: 28 },
          ...(hasPrev
            ? [{ label: 'Previous period', data: rows.map((r) => r.prevRevenue), backgroundColor: withAlpha(t.comparison, 0.55), maxBarThickness: 28 }]
            : []),
        ],
      },
      options: {
        interaction: { mode: 'index', intersect: false },
        plugins: { tooltip: { callbacks: { label: (ctx) => ` ${ctx.dataset.label}: ${inr.format(Number(ctx.parsed.y))}` } } },
        scales: {
          x: { grid: { display: false }, border: { display: false } },
          y: {
            beginAtZero: true,
            border: { display: false },
            ticks: { maxTicksLimit: 6, callback: (v) => inrCompact.format(Number(v)) },
          },
        },
      },
    };
  });

  ngOnInit(): void {
    this.analytics.ensureLoaded();
    this.reload();
  }

  private reload(): void {
    this.productService.getProducts(true).subscribe({ next: (p) => this.products.set(p), error: () => undefined });
    this.categoryService.getCategories(true).subscribe({ next: (c) => this.records.set(c), error: () => undefined });
  }

  openAdd(): void {
    this.editing.set(null);
    this.formOpen.set(true);
  }

  openEdit(category: Category): void {
    this.editing.set(category);
    this.formOpen.set(true);
  }

  closeForm(): void {
    this.formOpen.set(false);
    this.editing.set(null);
  }

  onSaved(): void {
    this.closeForm();
    this.reload();
    this.analytics.refresh();
  }

  confirmDelete(category: Category): void {
    this.deleting.set(category);
  }

  cancelDelete(): void {
    if (!this.deleteBusy()) this.deleting.set(null);
  }

  deleteCategory(): void {
    const category = this.deleting();
    if (!category) return;
    this.deleteBusy.set(true);
    this.categoryService.deleteCategory(category._id).subscribe({
      next: (res) => {
        this.deleteBusy.set(false);
        this.deleting.set(null);
        this.notify.success(res.message || `${category.name} deleted`);
        this.reload();
      },
      error: (err) => {
        this.deleteBusy.set(false);
        this.deleting.set(null);
        this.notify.error(getErrorMessage(err, 'Failed to delete the category.'));
      },
    });
  }
}
