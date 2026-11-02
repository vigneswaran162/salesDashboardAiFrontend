import { ScriptableContext } from 'chart.js';
import { SaleStatus } from '../../core/models/sales.models';

/**
 * Chart palette per theme. Values were run through the data-viz palette validator against the
 * card surfaces (#ffffff light, #121826-ish dark): single-series indigo and the 8-slot categorical
 * order pass CVD separation and contrast. Light slots 3–5 sit below 3:1, so every categorical chart
 * ships with a legend/table that names each value.
 */
export interface ChartTheme {
  dark: boolean;
  primary: string;
  comparison: string;
  series: readonly string[];
  status: Record<SaleStatus, string>;
  grid: string;
  ink: string;
  muted: string;
  surface: string;
}

const LIGHT: ChartTheme = {
  dark: false,
  primary: '#4f46e5',
  comparison: '#a3abba',
  series: ['#2a78d6', '#eb6834', '#1baf7a', '#eda100', '#e87ba4', '#008300', '#6250d6', '#e34948'],
  status: { Completed: '#0ca30c', Pending: '#fab219', Cancelled: '#d03b3b' },
  grid: '#eef0f5',
  ink: '#0f172a',
  muted: '#64748b',
  surface: '#ffffff',
};

const DARK: ChartTheme = {
  dark: true,
  primary: '#7275f2',
  comparison: '#5b6476',
  series: ['#3987e5', '#d95926', '#199e70', '#c98500', '#d55181', '#008300', '#9085e9', '#e66767'],
  status: { Completed: '#0ca30c', Pending: '#fab219', Cancelled: '#d03b3b' },
  grid: '#1f2738',
  ink: '#e6e8ee',
  muted: '#8d97a9',
  surface: '#121826',
};

export const chartTheme = (dark: boolean): ChartTheme => (dark ? DARK : LIGHT);

/** Color follows the entity (alphabetical slot), never its rank, so filters don't repaint survivors. */
export const colorByName = (names: string[], theme: ChartTheme): ((name: string) => string) => {
  const slots = [...new Set(names)].sort();
  return (name) => theme.series[Math.max(0, slots.indexOf(name)) % theme.series.length];
};

export const withAlpha = (hex: string, alpha: number): string => {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${alpha})`;
};

/** Vertical gradient fill for area charts, fading to transparent at the baseline. */
export const areaGradient = (hex: string, strength = 0.22) => (ctx: ScriptableContext<'line'>) => {
  const { chart } = ctx;
  const area = chart.chartArea;
  if (!area) return withAlpha(hex, strength / 2);
  const g = chart.ctx.createLinearGradient(0, area.top, 0, area.bottom);
  g.addColorStop(0, withAlpha(hex, strength));
  g.addColorStop(1, withAlpha(hex, 0));
  return g;
};

export const inr = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 });
export const inrCompact = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  notation: 'compact',
  maximumFractionDigits: 1,
});
export const num = new Intl.NumberFormat('en-IN');
export const pct = (value: number, digits = 1): string => `${value.toFixed(digits)}%`;
