import { Component, OnInit, computed, inject } from '@angular/core';
import { AnalyticsService } from '../../core/services/analytics.service';
import { DateRangeService } from '../../core/services/date-range.service';
import { NotificationService } from '../../core/services/notification.service';
import {
  buildTrend,
  byCategory,
  byCustomer,
  byPayment,
  byProduct,
  filterByRange,
  round2,
} from '../../core/utils/analytics';
import { ExportFormat, ExportTable, downloadTable } from '../../core/utils/export';
import { salesExportTable } from '../../core/utils/sales-export';

interface ReportDef {
  id: string;
  title: string;
  description: string;
  icon: string;
  tone: string;
  rows: () => number;
  build: () => ExportTable;
}

/** Export centre: every report is built from real sales in the selected range. */
@Component({
  selector: 'app-reports',
  standalone: true,
  template: `
    <div class="page">
      <div class="page-header">
        <div>
          <h1 class="page-title">Reports</h1>
          <p class="page-subtitle">Download data for <strong class="text-body">{{ ranges.label().toLowerCase() }}</strong>
            ({{ ranges.range().start }} to {{ ranges.range().end }})</p>
        </div>
      </div>

      @if (analytics.error(); as err) {
        <div class="alert alert-danger" role="alert"><i class="bi bi-exclamation-triangle-fill me-2" aria-hidden="true"></i>{{ err }}</div>
      }

      <div class="row g-3">
        @for (r of reports; track r.id) {
          <div class="col-12 col-md-6 col-xl-4">
            <article class="card card-hover report h-100">
              <span class="report-icon kpi-tone-{{ r.tone }}" aria-hidden="true"><i class="bi {{ r.icon }}"></i></span>
              <h2 class="card-title mt-3">{{ r.title }}</h2>
              <p class="report-desc">{{ r.description }}</p>
              <div class="report-foot">
                <span class="pill tabular">{{ analytics.loaded() ? r.rows() + ' rows' : 'Loading…' }}</span>
                <div class="d-flex gap-2">
                  <button type="button" class="btn btn-sm btn-soft" (click)="download(r, 'csv')" [disabled]="!analytics.loaded() || !r.rows()">
                    <i class="bi bi-filetype-csv" aria-hidden="true"></i>CSV
                  </button>
                  <button type="button" class="btn btn-sm btn-primary" (click)="download(r, 'xlsx')" [disabled]="!analytics.loaded() || !r.rows()">
                    <i class="bi bi-file-earmark-excel" aria-hidden="true"></i>Excel
                  </button>
                </div>
              </div>
            </article>
          </div>
        }
      </div>
    </div>
  `,
  styles: [`
    .report { padding: 1.25rem; display: flex; flex-direction: column; }
    .report-icon { width: 42px; height: 42px; border-radius: 12px; display: grid; place-items: center; font-size: 1.15rem; }
    .kpi-tone-primary { background: var(--sd-primary-soft); color: var(--sd-primary-text); }
    .kpi-tone-blue { background: var(--sd-blue-soft); color: var(--sd-blue); }
    .kpi-tone-success { background: var(--sd-success-soft); color: var(--sd-success); }
    .kpi-tone-warning { background: var(--sd-warning-soft); color: var(--sd-warning); }
    .kpi-tone-violet { background: var(--sd-violet-soft); color: var(--sd-violet); }
    .kpi-tone-cyan { background: var(--sd-cyan-soft); color: var(--sd-cyan); }
    .report-desc { font-size: .83rem; color: var(--sd-muted); margin: .35rem 0 1.25rem; flex: 1; }
    .report-foot { display: flex; align-items: center; justify-content: space-between; gap: .5rem; flex-wrap: wrap; }
  `],
})
export class ReportsComponent implements OnInit {
  private readonly notify = inject(NotificationService);
  readonly analytics = inject(AnalyticsService);
  readonly ranges = inject(DateRangeService);

  private readonly sales = computed(() => filterByRange(this.analytics.sales(), this.ranges.range()));

  readonly reports: ReportDef[] = [
    {
      id: 'sales', title: 'Sales transactions', icon: 'bi-receipt', tone: 'primary',
      description: 'Every sale with customer, product, pricing, payment and status details.',
      rows: () => this.sales().length,
      build: () => salesExportTable(this.sales()),
    },
    {
      id: 'monthly', title: 'Monthly summary', icon: 'bi-calendar3', tone: 'blue',
      description: 'Orders, completed orders, units and revenue per month.',
      rows: () => buildTrend(this.sales(), this.ranges.range(), 'month').length,
      build: () => ({
        headers: ['Month', 'Orders', 'Completed orders', 'Units sold', 'Revenue', 'Avg. order value'],
        rows: buildTrend(this.sales(), this.ranges.range(), 'month').map((m) => [
          m.label, m.orders, m.completed, m.units, m.revenue, m.completed ? round2(m.revenue / m.completed) : 0,
        ]),
      }),
    },
    {
      id: 'categories', title: 'Category performance', icon: 'bi-tags', tone: 'violet',
      description: 'Revenue, orders, units, revenue share and top product per category.',
      rows: () => byCategory(this.sales()).length,
      build: () => ({
        headers: ['Category', 'Orders', 'Units sold', 'Revenue', 'Share of revenue (%)', 'Top product'],
        rows: byCategory(this.sales()).map((c) => [c.category, c.orders, c.units, c.revenue, round2(c.share), c.topProduct]),
      }),
    },
    {
      id: 'products', title: 'Product performance', icon: 'bi-box-seam', tone: 'cyan',
      description: 'Every product sold in the period, ranked by completed revenue.',
      rows: () => byProduct(this.sales()).length,
      build: () => ({
        headers: ['Product', 'Category', 'Orders', 'Units sold', 'Revenue'],
        rows: byProduct(this.sales()).map((p) => [p.productName, p.category, p.orders, p.units, p.revenue]),
      }),
    },
    {
      id: 'customers', title: 'Customer list', icon: 'bi-people', tone: 'success',
      description: 'Customers with contact details, order counts and total completed spend.',
      rows: () => byCustomer(this.sales()).length,
      build: () => ({
        headers: ['Name', 'Email', 'Phone', 'Orders', 'Completed orders', 'Total spent', 'First purchase', 'Last purchase'],
        rows: byCustomer(this.sales()).map((c) => [
          c.name, c.email, c.phone, c.orders, c.completedOrders, c.spent, c.firstPurchase, c.lastPurchase,
        ]),
      }),
    },
    {
      id: 'payments', title: 'Payment methods', icon: 'bi-credit-card', tone: 'warning',
      description: 'Orders and completed revenue for each payment method.',
      rows: () => byPayment(this.sales()).length,
      build: () => ({
        headers: ['Payment method', 'Orders', 'Revenue'],
        rows: byPayment(this.sales()).map((p) => [p.paymentMethod, p.orders, p.revenue]),
      }),
    },
  ];

  ngOnInit(): void {
    this.analytics.ensureLoaded();
  }

  download(report: ReportDef, format: ExportFormat): void {
    const { start, end } = this.ranges.range();
    downloadTable(format, `${report.id}-${start}-to-${end}`, report.title, report.build());
    this.notify.success(`${report.title} downloaded`);
  }
}
