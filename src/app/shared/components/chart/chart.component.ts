import { AfterViewInit, Component, ElementRef, Input, OnChanges, OnDestroy, ViewChild, inject } from '@angular/core';
import { Chart, ChartConfiguration, registerables } from 'chart.js';
import { SettingsService } from '../../../core/services/settings.service';
import { chartTheme } from '../../charts/chart-theme';

Chart.register(...registerables);
Chart.defaults.font.family = "'Inter', system-ui, -apple-system, 'Segoe UI', sans-serif";
Chart.defaults.font.size = 11.5;
Chart.defaults.maintainAspectRatio = false;
Object.assign(Chart.defaults.animation, { duration: 650, easing: 'easeOutQuart' });
Chart.defaults.plugins.legend.display = false;
Chart.defaults.elements.line.borderWidth = 2;
Chart.defaults.elements.line.tension = 0.35;
Chart.defaults.elements.point.radius = 0;
Chart.defaults.elements.point.hoverRadius = 5;
Chart.defaults.elements.point.hitRadius = 12;
Chart.defaults.elements.point.hoverBorderWidth = 2;
Chart.defaults.elements.bar.borderRadius = 4;
Chart.defaults.elements.bar.borderSkipped = 'start';
Object.assign(Chart.defaults.plugins.tooltip, {
  padding: { x: 12, y: 10 },
  cornerRadius: 10,
  boxPadding: 5,
  usePointStyle: true,
  titleFont: { weight: '600', size: 12 },
  bodyFont: { size: 12 },
  titleMarginBottom: 6,
  caretSize: 5,
});

/** Applies theme-dependent defaults (ink, grid, tooltip) before each render. */
const applyThemeDefaults = (dark: boolean): void => {
  const t = chartTheme(dark);
  Chart.defaults.color = t.muted;
  Chart.defaults.borderColor = t.grid;
  const tooltip = Chart.defaults.plugins.tooltip;
  tooltip.backgroundColor = dark ? '#1e2636' : '#0f172a';
  tooltip.titleColor = '#ffffff';
  tooltip.bodyColor = dark ? '#d5dae3' : '#e2e8f0';
  tooltip.borderColor = dark ? '#2e384c' : 'transparent';
  tooltip.borderWidth = dark ? 1 : 0;
  Chart.defaults.elements.point.hoverBorderColor = t.surface;
};

/** Thin wrapper around Chart.js; re-renders whenever `config` changes (configs are rebuilt on theme change). */
@Component({
  selector: 'app-chart',
  standalone: true,
  template: `
    <div class="chart-box" [style.height.px]="height">
      <canvas #canvas role="img" [attr.aria-label]="ariaLabel"></canvas>
    </div>
  `,
  styles: [`.chart-box { position: relative; width: 100%; }`],
})
export class ChartComponent implements AfterViewInit, OnChanges, OnDestroy {
  private readonly settings = inject(SettingsService);

  @Input({ required: true }) config!: ChartConfiguration;
  @Input() height = 280;
  @Input() ariaLabel = 'Chart';
  @ViewChild('canvas') private canvas?: ElementRef<HTMLCanvasElement>;

  private chart?: Chart;

  ngAfterViewInit(): void {
    this.render();
  }

  ngOnChanges(): void {
    if (this.canvas) this.render();
  }

  ngOnDestroy(): void {
    this.chart?.destroy();
  }

  private render(): void {
    this.chart?.destroy();
    if (this.canvas && this.config) {
      applyThemeDefaults(this.settings.isDark());
      this.chart = new Chart(this.canvas.nativeElement, this.config);
    }
  }
}
