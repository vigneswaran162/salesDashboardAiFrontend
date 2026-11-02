import { CurrencyPipe, DecimalPipe } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { ChartConfiguration } from 'chart.js';
import { Granularity } from '../../core/models/analytics.models';
import { Sale } from '../../core/models/sales.models';
import { AnalyticsService } from '../../core/services/analytics.service';
import { DateRangeService } from '../../core/services/date-range.service';
import { SettingsService } from '../../core/services/settings.service';
import {
  autoGranularity,
  buildTrend,
  byCategory,
  byPayment,
  byWeekday,
  computeKpis,
  filterByRange,
  pctChange,
  saleDay,
} from '../../core/utils/analytics';
import { TrendMetric, rankedBarChart, stackedChart, trendChart } from '../../shared/charts/chart-builders';
import { chartTheme, colorByName, inr, num, withAlpha } from '../../shared/charts/chart-theme';
import { ChartComponent } from '../../shared/components/chart/chart.component';
import { KpiCardComponent, KpiTone } from '../../shared/components/kpi-card/kpi-card.component';
import { PanelComponent } from '../../shared/components/panel/panel.component';
import { TrendTableComponent } from '../../shared/components/trend-table/trend-table.component';
import { DataView, ViewToggleComponent } from '../../shared/components/view-toggle/view-toggle.component';

interface KpiView {
  label: string;
  value: string;
  icon: string;
  tone: KpiTone;
  delta: number | null;
  invert?: boolean;
  hint: string;
  spark: number[];
}

const PAYMENT_ICONS: Record<string, string> = {
  Cash: 'bi-cash-coin',
  UPI: 'bi-phone',
  Card: 'bi-credit-card-2-front',
  'Net Banking': 'bi-bank',
};

/** Discount and cancellation rates for a set of sales. */
const rates = (sales: Sale[]) => {
  const k = computeKpis(sales);
  const discounted = sales.filter((s) => s.status === 'Completed' && (s.discount || 0) > 0).length;
  return {
    discountRate: k.grossValue ? (k.discount / k.grossValue) * 100 : 0,
    cancelRate: k.orders ? (k.cancelledOrders / k.orders) * 100 : 0,
    discountedShare: k.completedOrders ? (discounted / k.completedOrders) * 100 : 0,
    discounted,
  };
};

@Component({
  selector: 'app-analytics',
  standalone: true,
  imports: [CurrencyPipe, DecimalPipe, ChartComponent, KpiCardComponent, PanelComponent, TrendTableComponent, ViewToggleComponent],
  templateUrl: './analytics.component.html',
  styleUrl: './analytics.component.css',
})
export class AnalyticsComponent implements OnInit {
  readonly analytics = inject(AnalyticsService);
  readonly ranges = inject(DateRangeService);
  private readonly settings = inject(SettingsService);

  readonly granularity = signal<Granularity | null>(null);
  readonly metric = signal<TrendMetric>('revenue');

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

  readonly currentRates = computed(() => rates(this.current()));
  private readonly prevRates = computed(() => {
    const prev = this.previous();
    return prev ? rates(prev) : null;
  });

  readonly kpiCards = computed<KpiView[]>(() => {
    const k = this.kpis();
    const p = this.prevKpis();
    const r = this.currentRates();
    const pr = this.prevRates();
    const spark = buildTrend(this.current(), this.ranges.range(), autoGranularity(this.ranges.range()));
    const delta = (cur: number, prev: number | undefined) => (p ? pctChange(cur, prev ?? 0) : null);
    return [
      { label: 'Revenue', value: inr.format(k.revenue), icon: 'bi-currency-rupee', tone: 'primary',
        delta: delta(k.revenue, p?.revenue), hint: 'Completed sales', spark: spark.map((s) => s.revenue) },
      { label: 'Orders', value: num.format(k.orders), icon: 'bi-bag-check', tone: 'blue',
        delta: delta(k.orders, p?.orders), hint: 'All statuses', spark: spark.map((s) => s.orders) },
      { label: 'Avg. Discount', value: `${r.discountRate.toFixed(1)}%`, icon: 'bi-percent', tone: 'violet',
        delta: pr ? pctChange(r.discountRate, pr.discountRate) : null, invert: true,
        hint: 'Of gross completed value', spark: [] },
      { label: 'Cancellation Rate', value: `${r.cancelRate.toFixed(1)}%`, icon: 'bi-x-octagon', tone: 'danger',
        delta: pr ? pctChange(r.cancelRate, pr.cancelRate) : null, invert: true,
        hint: `${k.cancelledOrders} cancelled orders`, spark: [] },
    ];
  });

  readonly trendView = signal<DataView>('chart');
  readonly trendPoints = computed(() => buildTrend(this.current(), this.ranges.range(), this.activeGranularity()));
  readonly trendPrevPoints = computed(() => {
    const prevRange = this.ranges.previous();
    const prev = this.previous();
    return prevRange && prev ? buildTrend(prev, prevRange, this.activeGranularity()) : null;
  });
  readonly trendConfig = computed(() => trendChart(this.trendPoints(), this.metric(), this.theme(), this.trendPrevPoints()));

  /** Category revenue per month, stacked; at most 7 named categories, the rest fold into "Other". */
  readonly categorySeries = computed(() => {
    const months = buildTrend([], this.ranges.range(), 'month');
    const cats = byCategory(this.current()).filter((c) => c.revenue > 0);
    const named = cats.slice(0, 7).map((c) => c.category);
    const color = colorByName(named, this.theme());
    const names = cats.length > 7 ? [...named, 'Other'] : named;
    const series = new Map(names.map((n) => [n, months.map(() => 0)]));
    const index = new Map(months.map((m, i) => [m.key.slice(0, 7), i]));
    for (const s of this.current()) {
      if (s.status !== 'Completed') continue;
      const i = index.get(saleDay(s).slice(0, 7));
      const row = series.get(named.includes(s.category) ? s.category : 'Other');
      if (i !== undefined && row) row[i] += s.totalAmount;
    }
    return {
      labels: months.map((m) => m.label),
      series: names.map((n) => ({
        name: n,
        values: series.get(n)!.map((v) => Math.round(v)),
        color: n === 'Other' ? this.theme().comparison : color(n),
      })),
    };
  });

  readonly categoryConfig = computed(() => {
    const { labels, series } = this.categorySeries();
    return stackedChart(labels, series, this.theme()) as unknown as ChartConfiguration;
  });

  readonly weekdayConfig = computed<ChartConfiguration>(() => {
    const t = this.theme();
    const rows = byWeekday(this.current());
    return {
      type: 'bar',
      data: {
        labels: rows.map((r) => r.day),
        datasets: [{
          data: rows.map((r) => r.orders),
          backgroundColor: t.primary,
          hoverBackgroundColor: withAlpha(t.primary, 0.85),
          maxBarThickness: 34,
        }],
      },
      options: {
        plugins: {
          tooltip: { callbacks: { label: (ctx) => ` ${ctx.parsed.y} orders · ${inr.format(rows[ctx.dataIndex].revenue)} revenue` } },
        },
        scales: {
          x: { grid: { display: false }, border: { display: false } },
          y: { beginAtZero: true, border: { display: false }, ticks: { precision: 0, maxTicksLimit: 5 } },
        },
      },
    };
  });

  readonly paymentConfig = computed(() => {
    const rows = byPayment(this.current());
    return rankedBarChart(rows.map((r) => r.paymentMethod), rows.map((r) => r.revenue), this.theme(), {
      money: true,
      detail: (i) => `${rows[i].orders} orders`,
    });
  });

  readonly categoryView = signal<DataView>('chart');
  readonly weekdayView = signal<DataView>('chart');
  readonly paymentView = signal<DataView>('chart');

  /** Month-by-category revenue grid (newest month first) behind the stacked chart. */
  readonly categoryMatrix = computed(() => {
    const { labels, series } = this.categorySeries();
    const rows = labels
      .map((label, i) => ({
        label,
        values: series.map((s) => s.values[i]),
        total: series.reduce((sum, s) => sum + s.values[i], 0),
      }))
      .reverse();
    const totals = series.map((s) => s.values.reduce((a, b) => a + b, 0));
    return { columns: series, rows, totals, grand: totals.reduce((a, b) => a + b, 0) };
  });

  readonly weekdayRows = computed(() => {
    const rows = byWeekday(this.current());
    const max = Math.max(0, ...rows.map((r) => r.orders));
    const total = rows.reduce((s, r) => s + r.orders, 0);
    return rows.map((r) => ({
      ...r,
      bar: max ? (r.orders / max) * 100 : 0,
      share: total ? (r.orders / total) * 100 : 0,
      peak: max > 0 && r.orders === max,
    }));
  });

  readonly paymentRows = computed(() => {
    const rows = byPayment(this.current());
    const max = Math.max(0, ...rows.map((r) => r.revenue));
    const total = rows.reduce((s, r) => s + r.revenue, 0);
    return rows.map((r) => ({
      ...r,
      icon: PAYMENT_ICONS[r.paymentMethod] ?? 'bi-wallet2',
      bar: max ? (r.revenue / max) * 100 : 0,
      share: total ? (r.revenue / total) * 100 : 0,
    }));
  });

  readonly categoryRows = computed(() => {
    const seriesColor = new Map(this.categorySeries().series.map((s) => [s.name, s.color]));
    return byCategory(this.current()).map((c) => ({
      ...c,
      color: seriesColor.get(c.category) ?? this.theme().comparison,
      aov: c.orders ? c.revenue / c.orders : 0,
    }));
  });

  ngOnInit(): void {
    this.analytics.ensureLoaded();
  }
}
