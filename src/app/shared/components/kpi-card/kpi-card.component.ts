import { DecimalPipe } from '@angular/common';
import { Component, Input } from '@angular/core';
import { SparklineComponent } from '../sparkline/sparkline.component';

export type KpiTone = 'primary' | 'blue' | 'success' | 'warning' | 'danger' | 'violet' | 'cyan';

const TONE_COLORS: Record<KpiTone, string> = {
  primary: 'var(--sd-primary)',
  blue: '#3b82f6',
  success: '#10b981',
  warning: '#f59e0b',
  danger: '#f43f5e',
  violet: '#8b5cf6',
  cyan: '#06b6d4',
};

/** Metric tile: icon, headline value, change vs previous period (arrow + sign + text, not color alone), sparkline. */
@Component({
  selector: 'app-kpi-card',
  standalone: true,
  imports: [DecimalPipe, SparklineComponent],
  template: `
    <div class="card kpi card-hover h-100">
      <div class="kpi-top">
        <span class="kpi-label">{{ label }}</span>
        <span class="kpi-icon tone-{{ tone }}" aria-hidden="true"><i class="bi {{ icon }}"></i></span>
      </div>
      <div class="kpi-value text-truncate" [title]="value">{{ value }}</div>
      <div class="kpi-bottom">
        <div class="kpi-meta min-w-0">
          @if (delta !== null && delta !== undefined) {
            <span class="delta" [class.up]="isGood" [class.down]="!isGood">
              <i class="bi" [class.bi-arrow-up-right]="delta >= 0" [class.bi-arrow-down-right]="delta < 0" aria-hidden="true"></i>
              {{ delta >= 0 ? '+' : '−' }}{{ abs(delta) | number: '1.0-1' }}%
            </span>
            <span class="kpi-hint">{{ deltaLabel }}</span>
          } @else if (hint) {
            <span class="kpi-hint">{{ hint }}</span>
          }
        </div>
        @if (sparkline.length > 1) {
          <app-sparkline class="kpi-spark" [values]="sparkline" [color]="toneColor" />
        }
      </div>
      @if (delta !== null && delta !== undefined && hint) {
        <div class="kpi-hint mt-1">{{ hint }}</div>
      }
    </div>
  `,
  styles: [`
    .kpi { padding: 1.1rem 1.2rem 1rem; display: flex; flex-direction: column; position: relative; overflow: hidden; }
    .kpi:hover { transform: translateY(-2px); }
    .kpi-top { display: flex; align-items: center; justify-content: space-between; gap: .5rem; margin-bottom: .55rem; }
    .kpi-label { font-size: .8rem; font-weight: 500; color: var(--sd-text-2); }
    .kpi-icon { width: 34px; height: 34px; border-radius: 10px; display: grid; place-items: center; font-size: 1rem; flex-shrink: 0; }
    .tone-primary { background: var(--sd-primary-soft); color: var(--sd-primary-text); }
    .tone-blue { background: var(--sd-blue-soft); color: var(--sd-blue); }
    .tone-success { background: var(--sd-success-soft); color: var(--sd-success); }
    .tone-warning { background: var(--sd-warning-soft); color: var(--sd-warning); }
    .tone-danger { background: var(--sd-danger-soft); color: var(--sd-danger); }
    .tone-violet { background: var(--sd-violet-soft); color: var(--sd-violet); }
    .tone-cyan { background: var(--sd-cyan-soft); color: var(--sd-cyan); }
    .kpi-value { font-size: 1.65rem; font-weight: 700; letter-spacing: -.03em; line-height: 1.15; color: var(--sd-text); }
    .kpi-bottom { display: flex; align-items: flex-end; justify-content: space-between; gap: .75rem; margin-top: .6rem; min-height: 32px; }
    .kpi-meta { display: flex; flex-wrap: wrap; align-items: center; gap: .25rem .45rem; }
    .delta { display: inline-flex; align-items: center; gap: .15rem; font-size: .75rem; font-weight: 600; padding: .1rem .45rem; border-radius: 999px; font-variant-numeric: tabular-nums; }
    .delta.up { background: var(--sd-success-soft); color: var(--sd-success); }
    .delta.down { background: var(--sd-danger-soft); color: var(--sd-danger); }
    .kpi-hint { font-size: .75rem; color: var(--sd-muted); }
    .kpi-spark { width: 92px; height: 32px; flex-shrink: 0; }
  `],
})
export class KpiCardComponent {
  @Input({ required: true }) label!: string;
  @Input({ required: true }) value!: string;
  @Input() icon = 'bi-graph-up';
  @Input() hint = '';
  @Input() tone: KpiTone = 'primary';
  /** Percent change vs the comparison period; null hides the badge. */
  @Input() delta: number | null = null;
  @Input() deltaLabel = 'vs previous period';
  /** Set when a decrease is the good outcome (e.g. cancellations). */
  @Input() invert = false;
  @Input() sparkline: number[] = [];

  get isGood(): boolean {
    const up = (this.delta ?? 0) >= 0;
    return this.invert ? !up : up;
  }

  get toneColor(): string {
    return TONE_COLORS[this.tone];
  }

  abs(n: number): number {
    return Math.abs(n);
  }
}
