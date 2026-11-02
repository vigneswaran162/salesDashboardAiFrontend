import { Component, Input } from '@angular/core';

let nextId = 0;

/** Tiny decorative trend line for KPI cards (SVG, no chart library, no axes). */
@Component({
  selector: 'app-sparkline',
  standalone: true,
  template: `
    @if (values.length > 1) {
      <svg [attr.viewBox]="'0 0 ' + width + ' ' + height" preserveAspectRatio="none" aria-hidden="true">
        <defs>
          <linearGradient [attr.id]="gradientId" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" [attr.stop-color]="color" stop-opacity="0.25" />
            <stop offset="100%" [attr.stop-color]="color" stop-opacity="0" />
          </linearGradient>
        </defs>
        <path [attr.d]="areaPath" [attr.fill]="'url(#' + gradientId + ')'" />
        <path [attr.d]="linePath" fill="none" [attr.stroke]="color" stroke-width="2"
              stroke-linecap="round" stroke-linejoin="round" vector-effect="non-scaling-stroke" />
      </svg>
    }
  `,
  styles: [`:host { display: block; } svg { width: 100%; height: 100%; display: block; overflow: visible; }`],
})
export class SparklineComponent {
  @Input() values: number[] = [];
  @Input() color = 'currentColor';

  readonly width = 100;
  readonly height = 32;
  readonly gradientId = `spark-${nextId++}`;

  private get points(): [number, number][] {
    const max = Math.max(...this.values);
    const min = Math.min(...this.values);
    const span = max - min || 1;
    const step = this.width / (this.values.length - 1);
    return this.values.map((v, i) => [i * step, this.height - 2 - ((v - min) / span) * (this.height - 4)]);
  }

  /** Smooth path through the points (Catmull-Rom converted to cubic Béziers). */
  get linePath(): string {
    const p = this.points;
    let d = `M${p[0][0]},${p[0][1]}`;
    for (let i = 0; i < p.length - 1; i++) {
      const [x0, y0] = p[i - 1] ?? p[i];
      const [x1, y1] = p[i];
      const [x2, y2] = p[i + 1];
      const [x3, y3] = p[i + 2] ?? p[i + 1];
      const c1 = [x1 + (x2 - x0) / 6, y1 + (y2 - y0) / 6];
      const c2 = [x2 - (x3 - x1) / 6, y2 - (y3 - y1) / 6];
      d += ` C${c1[0]},${c1[1]} ${c2[0]},${c2[1]} ${x2},${y2}`;
    }
    return d;
  }

  get areaPath(): string {
    return `${this.linePath} L${this.width},${this.height} L0,${this.height} Z`;
  }
}
