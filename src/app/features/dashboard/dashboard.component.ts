import { CurrencyPipe, DatePipe, DecimalPipe } from '@angular/common';
import { Component, DestroyRef, OnInit, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { forkJoin } from 'rxjs';
import { Granularity } from '../../core/models/analytics.models';
import { DashboardSummary, RecentSale, SaleStatus } from '../../core/models/sales.models';
import { AnalyticsService } from '../../core/services/analytics.service';
import { DashboardService } from '../../core/services/dashboard.service';
import { DateRangeService } from '../../core/services/date-range.service';
import { SalesService } from '../../core/services/sales.service';
import { SettingsService } from '../../core/services/settings.service';
import {
  autoGranularity,
  buildTrend,
  byCategory,
  byCustomer,
  byPayment,
  byProduct,
  byStatus,
  computeKpis,
  filterByRange,
  initials,
  pctChange,
  todayIso,
} from '../../core/utils/analytics';
import { getErrorMessage } from '../../core/utils/http-error';
import { TrendMetric, doughnutChart, rankedBarChart, targetChart, trendChart } from '../../shared/charts/chart-builders';
import { chartTheme, colorByName, inr, num } from '../../shared/charts/chart-theme';
import { ChartComponent } from '../../shared/components/chart/chart.component';
import { KpiCardComponent, KpiTone } from '../../shared/components/kpi-card/kpi-card.component';
import { PanelComponent } from '../../shared/components/panel/panel.component';
import { StatusBadgeComponent } from '../../shared/components/status-badge/status-badge.component';
import { TrendTableComponent } from '../../shared/components/trend-table/trend-table.component';
import { DataView, ViewToggleComponent } from '../../shared/components/view-toggle/view-toggle.component';

interface KpiView {
  label: string;
  value: string;
  icon: string;
  tone: KpiTone;
  delta: number | null;
  hint: string;
  spark: number[];
}

const STATUS_ICONS: Record<SaleStatus, string> = {
  Completed: 'bi-check-circle-fill',
  Pending: 'bi-clock-fill',
  Cancelled: 'bi-x-circle-fill',
};

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [
    RouterLink, FormsModule, CurrencyPipe, DatePipe, DecimalPipe,
    ChartComponent, KpiCardComponent, PanelComponent, StatusBadgeComponent, TrendTableComponent, ViewToggleComponent,
  ],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.css',
})
export class DashboardComponent implements OnInit {
  private readonly dashboardService = inject(DashboardService);
  private readonly salesService = inject(SalesService);
  private readonly destroyRef = inject(DestroyRef);
  readonly analytics = inject(AnalyticsService);
  readonly ranges = inject(DateRangeService);
  readonly settings = inject(SettingsService);
  readonly Math = Math;

  // Server-side summary (catalogue size) and latest transactions, from the existing dashboard API.
  readonly summary = signal<DashboardSummary | null>(null);
  readonly recentSales = signal<RecentSale[]>([]);
  readonly serverError = signal<string | null>(null);
  readonly serverLoading = signal(false);

  readonly granularity = signal<Granularity | null>(null);
  readonly metric = signal<TrendMetric>('revenue');
  targetInput: number | null = null;

  readonly loading = computed(() => this.analytics.loading() || this.serverLoading());
  readonly error = computed(() => this.analytics.error() ?? this.serverError());
  readonly ready = computed(() => this.analytics.loaded());

  private readonly theme = computed(() => chartTheme(this.settings.isDark()));
  private readonly current = computed(() => filterByRange(this.analytics.sales(), this.ranges.range()));
  private readonly previous = computed(() => {
    const prev = this.ranges.previous();
    return prev ? filterByRange(this.analytics.sales(), prev) : null;
  });

  readonly kpis = computed(() => computeKpis(this.current()));
  private readonly prevKpis = computed(() => {
    const prev = this.previous();
    return prev ? computeKpis(prev) : null;
  });

  readonly activeGranularity = computed(() => this.granularity() ?? autoGranularity(this.ranges.range()));
  private readonly sparkSeries = computed(() =>
    buildTrend(this.current(), this.ranges.range(), autoGranularity(this.ranges.range()))
  );

  readonly kpiCards = computed<KpiView[]>(() => {
    const k = this.kpis();
    const p = this.prevKpis();
    const spark = this.sparkSeries();
    const delta = (cur: number, prev: number | undefined) => (p ? pctChange(cur, prev ?? 0) : null);
    return [
      {
        label: 'Total Revenue', value: inr.format(k.revenue), icon: 'bi-currency-rupee', tone: 'primary',
        delta: delta(k.revenue, p?.revenue), hint: 'Completed sales only', spark: spark.map((s) => s.revenue),
      },
      {
        label: 'Total Orders', value: num.format(k.orders), icon: 'bi-bag-check', tone: 'blue',
        delta: delta(k.orders, p?.orders), hint: `${k.completedOrders} completed · ${k.pendingOrders} pending`,
        spark: spark.map((s) => s.orders),
      },
      {
        label: 'Avg. Order Value', value: inr.format(k.avgOrderValue), icon: 'bi-receipt-cutoff', tone: 'violet',
        delta: delta(k.avgOrderValue, p?.avgOrderValue), hint: 'Revenue ÷ completed orders',
        spark: spark.map((s) => (s.completed ? s.revenue / s.completed : 0)),
      },
      {
        label: 'Units Sold', value: num.format(k.units), icon: 'bi-box2', tone: 'cyan',
        delta: delta(k.units, p?.units), hint: 'From completed orders', spark: spark.map((s) => s.units),
      },
      {
        label: 'Customers', value: num.format(k.customers), icon: 'bi-people', tone: 'success',
        delta: delta(k.customers, p?.customers), hint: 'Unique by email', spark: [],
      },
      {
        label: 'Active Products', value: num.format(this.summary()?.totalProducts ?? 0), icon: 'bi-box-seam', tone: 'warning',
        delta: null, hint: 'In catalogue (all time)', spark: [],
      },
    ];
  });

  // ---- Trend ----
  readonly trendTotal = computed(() => (this.metric() === 'revenue' ? inr.format(this.kpis().revenue) : num.format(this.kpis().orders)));
  readonly trendDelta = computed(() => {
    const p = this.prevKpis();
    if (!p) return null;
    return this.metric() === 'revenue' ? pctChange(this.kpis().revenue, p.revenue) : pctChange(this.kpis().orders, p.orders);
  });
  readonly hasPrevious = computed(() => !!this.ranges.previous());

  readonly trendView = signal<DataView>('chart');
  readonly productsView = signal<DataView>('chart');

  readonly trendPoints = computed(() => buildTrend(this.current(), this.ranges.range(), this.activeGranularity()));
  readonly trendPrevPoints = computed(() => {
    const prevRange = this.ranges.previous();
    const prev = this.previous();
    return prevRange && prev ? buildTrend(prev, prevRange, this.activeGranularity()) : null;
  });
  readonly trendConfig = computed(() => trendChart(this.trendPoints(), this.metric(), this.theme(), this.trendPrevPoints()));

  // ---- Category ----
  readonly categories = computed(() => {
    const stats = byCategory(this.current()).filter((c) => c.revenue > 0);
    const color = colorByName(stats.map((c) => c.category), this.theme());
    return stats.map((c) => ({ ...c, color: color(c.category) }));
  });

  readonly categoryConfig = computed(() => {
    const rows = this.categories();
    return doughnutChart(
      rows.map((r) => r.category),
      rows.map((r) => r.revenue),
      rows.map((r) => r.color),
      this.theme(),
      (i) => `${inr.format(rows[i].revenue)} (${rows[i].share.toFixed(1)}%)`
    );
  });

  // ---- Top products ----
  readonly topProducts = computed(() => byProduct(this.current()).filter((p) => p.revenue > 0).slice(0, 10));
  readonly topProductRows = computed(() => {
    const rows = this.topProducts();
    const max = rows[0]?.revenue ?? 0;
    const total = this.kpis().revenue;
    return rows.map((r, i) => ({
      ...r,
      rank: i + 1,
      bar: max ? (r.revenue / max) * 100 : 0,
      share: total ? (r.revenue / total) * 100 : 0,
    }));
  });
  readonly topProductsConfig = computed(() => {
    const rows = this.topProducts();
    return rankedBarChart(rows.map((r) => r.productName), rows.map((r) => r.revenue), this.theme(), {
      money: true,
      detail: (i) => `${rows[i].units} units · ${rows[i].orders} orders`,
    });
  });

  // ---- Target vs achievement ----
  readonly target = this.settings.monthlyTarget;
  readonly monthly = computed(() => {
    const today = todayIso();
    const range = this.ranges.range();
    // At least the last 6 months so the comparison is meaningful even for short ranges.
    const sixMonthsBack = `${new Date(Date.UTC(+today.slice(0, 4), +today.slice(5, 7) - 6, 1)).toISOString().slice(0, 10)}`;
    const start = range.start < sixMonthsBack ? range.start : sixMonthsBack;
    return buildTrend(this.analytics.sales(), { start, end: today }, 'month').slice(-12);
  });
  readonly currentMonth = computed(() => this.monthly().at(-1) ?? null);
  readonly targetProgress = computed(() => {
    const t = this.target();
    const m = this.currentMonth();
    return t && m ? (m.revenue / t) * 100 : 0;
  });
  readonly monthsHit = computed(() => {
    const t = this.target();
    return t ? this.monthly().filter((m) => m.revenue >= t).length : 0;
  });
  readonly targetConfig = computed(() => {
    const t = this.target();
    return t ? targetChart(this.monthly(), t, this.theme()) : null;
  });

  // ---- Payment / status / customers ----
  readonly payments = computed(() => {
    const rows = byPayment(this.current());
    const total = rows.reduce((s, r) => s + r.orders, 0);
    return rows.map((r) => ({ ...r, share: total ? (r.orders / total) * 100 : 0 }));
  });

  readonly statuses = computed(() => {
    const rows = byStatus(this.current());
    const total = rows.reduce((s, r) => s + r.orders, 0);
    const t = this.theme();
    return rows.map((r) => ({
      ...r,
      share: total ? (r.orders / total) * 100 : 0,
      color: t.status[r.status],
      icon: STATUS_ICONS[r.status],
    }));
  });

  readonly topCustomers = computed(() =>
    byCustomer(this.current()).filter((c) => c.spent > 0).slice(0, 5).map((c) => ({ ...c, initials: initials(c.name) }))
  );

  ngOnInit(): void {
    this.analytics.ensureLoaded();
    this.loadServer();
    this.salesService.changed$.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(() => this.loadServer());
  }

  refresh(): void {
    this.analytics.refresh();
    this.loadServer();
  }

  saveTarget(): void {
    const value = Number(this.targetInput);
    if (value > 0) this.settings.monthlyTarget.set(Math.round(value));
  }

  private loadServer(): void {
    this.serverLoading.set(true);
    this.serverError.set(null);
    forkJoin({ summary: this.dashboardService.getSummary(), recent: this.dashboardService.getRecentSales() })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: ({ summary, recent }) => {
          this.summary.set(summary);
          this.recentSales.set(recent);
          this.serverLoading.set(false);
        },
        error: (err) => {
          this.serverError.set(getErrorMessage(err, 'Failed to load dashboard data.'));
          this.serverLoading.set(false);
        },
      });
  }
}
