import { CurrencyPipe, DecimalPipe } from '@angular/common';
import { Component, computed, input } from '@angular/core';
import { TrendPoint } from '../../../core/models/analytics.models';
import { pctChange } from '../../../core/utils/analytics';

type Metric = 'revenue' | 'orders';

/** The Sales Trend chart's data as a table: one row per period, newest first, with change vs the previous period. */
@Component({
  selector: 'app-trend-table',
  standalone: true,
  imports: [CurrencyPipe, DecimalPipe],
  template: `
    <div class="tt-wrap">
      <table class="tt">
        <thead>
          <tr>
            <th><i class="bi bi-calendar3" aria-hidden="true"></i>Period</th>
            <th class="num"><i class="bi bi-bag-check" aria-hidden="true"></i>Orders</th>
            <th class="num d-none d-md-table-cell"><i class="bi bi-check2-circle" aria-hidden="true"></i>Completed</th>
            <th class="num d-none d-md-table-cell"><i class="bi bi-box2" aria-hidden="true"></i>Units</th>
            <th class="num"><i class="bi bi-currency-rupee" aria-hidden="true"></i>Revenue</th>
            <th class="share-col d-none d-lg-table-cell"><i class="bi bi-bar-chart" aria-hidden="true"></i>Share</th>
            @if (hasPrevious()) {
              <th class="num"><i class="bi bi-arrow-left-right" aria-hidden="true"></i>vs previous</th>
            }
          </tr>
        </thead>
        <tbody>
          @for (r of rows(); track r.key) {
            <tr [class.is-empty]="!r.orders">
              <td class="period">{{ r.label }}</td>
              <td class="num">{{ r.orders }}</td>
              <td class="num d-none d-md-table-cell">{{ r.completed }}</td>
              <td class="num d-none d-md-table-cell">{{ r.units }}</td>
              <td class="num strong">{{ r.revenue | currency: 'INR' : 'symbol' : '1.0-0' }}</td>
              <td class="share-col d-none d-lg-table-cell">
                <span class="bar" aria-hidden="true"><span [style.width.%]="r.bar"></span></span>
              </td>
              @if (hasPrevious()) {
                <td class="num">
                  @if (r.delta === null) {
                    <span class="delta flat">—</span>
                  } @else {
                    <span class="delta" [class.up]="r.delta > 0" [class.down]="r.delta < 0" [class.flat]="r.delta === 0">
                      <i class="bi" [class.bi-arrow-up-right]="r.delta > 0" [class.bi-arrow-down-right]="r.delta < 0"
                         [class.bi-dash]="r.delta === 0" aria-hidden="true"></i>{{ r.delta | number: '1.0-1' }}%
                    </span>
                  }
                </td>
              }
            </tr>
          }
        </tbody>
        <tfoot>
          <tr>
            <td>Total</td>
            <td class="num">{{ totals().orders }}</td>
            <td class="num d-none d-md-table-cell">{{ totals().completed }}</td>
            <td class="num d-none d-md-table-cell">{{ totals().units }}</td>
            <td class="num">{{ totals().revenue | currency: 'INR' : 'symbol' : '1.0-0' }}</td>
            <td class="d-none d-lg-table-cell"></td>
            @if (hasPrevious()) {
              <td></td>
            }
          </tr>
        </tfoot>
      </table>
    </div>
  `,
  styles: [`
    .tt-wrap { max-height: 360px; overflow: auto; border: 1px solid var(--sd-border); border-radius: var(--sd-radius-sm); }
    .tt { width: 100%; border-collapse: separate; border-spacing: 0; font-size: .85rem; font-variant-numeric: tabular-nums; }
    th { position: sticky; top: 0; z-index: 1; padding: .65rem .9rem; background: var(--sd-surface-2); color: var(--sd-muted); font-size: .7rem; font-weight: 600; letter-spacing: .06em; text-transform: uppercase; white-space: nowrap; border-bottom: 1px solid var(--sd-border); text-align: left; }
    th i { margin-right: .4rem; color: var(--sd-primary-text); }
    td { padding: .6rem .9rem; border-bottom: 1px solid var(--sd-border); }
    tbody tr:last-child td { border-bottom: 0; }
    tbody tr { transition: background .15s; }
    tbody tr:hover { background: var(--sd-hover); }
    tbody tr.is-empty td { color: var(--sd-muted); }
    .num { text-align: right; }
    .period { font-weight: 600; white-space: nowrap; }
    .strong { font-weight: 600; }
    .share-col { width: 22%; min-width: 120px; }
    .bar { display: block; height: 8px; border-radius: 999px; background: var(--sd-hover); overflow: hidden; }
    .bar span { display: block; height: 100%; border-radius: inherit; background: var(--sd-gradient); transition: width .5s var(--sd-ease); }
    .delta { display: inline-flex; align-items: center; gap: .15rem; padding: .1rem .5rem; border-radius: 999px; font-size: .75rem; font-weight: 600; }
    .delta.up { color: var(--sd-success); background: var(--sd-success-soft); }
    .delta.down { color: var(--sd-danger); background: var(--sd-danger-soft); }
    .delta.flat { color: var(--sd-muted); background: var(--sd-hover); }
    tfoot td { position: sticky; bottom: 0; background: var(--sd-surface-2); border-top: 1px solid var(--sd-border-strong); border-bottom: 0; font-weight: 700; }
  `],
})
export class TrendTableComponent {
  readonly points = input.required<TrendPoint[]>();
  readonly previous = input<TrendPoint[] | null>(null);
  readonly metric = input<Metric>('revenue');

  readonly hasPrevious = computed(() => !!this.previous()?.length);

  readonly rows = computed(() => {
    const pts = this.points();
    const prev = this.previous();
    const key = this.metric();
    const max = Math.max(0, ...pts.map((p) => p[key]));
    return pts
      .map((p, i) => {
        const before = prev?.[i];
        return { ...p, bar: max ? (p[key] / max) * 100 : 0, delta: before ? pctChange(p[key], before[key]) : null };
      })
      .reverse();
  });

  readonly totals = computed(() =>
    this.points().reduce(
      (t, p) => ({ orders: t.orders + p.orders, completed: t.completed + p.completed, units: t.units + p.units, revenue: t.revenue + p.revenue }),
      { orders: 0, completed: 0, units: 0, revenue: 0 }
    )
  );
}
