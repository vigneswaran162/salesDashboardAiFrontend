import { ChartConfiguration, TooltipItem } from 'chart.js';
import { TrendPoint } from '../../core/models/analytics.models';
import { ChartTheme, areaGradient, inr, inrCompact, num, withAlpha } from './chart-theme';

export type TrendMetric = 'revenue' | 'orders';

const yAxis = (money: boolean) => ({
  beginAtZero: true,
  border: { display: false },
  grid: { drawTicks: false },
  ticks: {
    padding: 8,
    maxTicksLimit: 6,
    precision: 0,
    callback: (v: string | number) => (money ? inrCompact.format(Number(v)) : num.format(Number(v))),
  },
});

const xAxis = (maxTicks = 10) => ({
  grid: { display: false },
  border: { display: false },
  ticks: { maxRotation: 0, autoSkip: true, maxTicksLimit: maxTicks, padding: 6 },
});

const fmt = (money: boolean, v: number) => (money ? inr.format(v) : `${num.format(v)} orders`);

/**
 * Revenue: smooth area line, optionally with the previous period as a dashed comparison line.
 * Orders: rounded bars. One y-axis only.
 */
export const trendChart = (
  points: TrendPoint[],
  metric: TrendMetric,
  t: ChartTheme,
  previous?: TrendPoint[] | null
): ChartConfiguration => {
  const money = metric === 'revenue';
  const labels = points.map((p) => p.label);
  const values = points.map((p) => (money ? p.revenue : p.orders));
  const prevValues = previous ? points.map((_, i) => (previous[i] ? (money ? previous[i].revenue : previous[i].orders) : null)) : null;
  const prevLabel = (i: number) => previous?.[i]?.label ?? '';

  const tooltip = {
    callbacks: {
      label: (ctx: TooltipItem<'line' | 'bar'>) => {
        const v = Number(ctx.parsed.y ?? 0);
        return ctx.datasetIndex === 0 ? ` This period: ${fmt(money, v)}` : ` Previous (${prevLabel(ctx.dataIndex)}): ${fmt(money, v)}`;
      },
    },
  };

  if (!money) {
    return {
      type: 'bar',
      data: {
        labels,
        datasets: [
          {
            label: 'Orders',
            data: values,
            backgroundColor: t.primary,
            hoverBackgroundColor: withAlpha(t.primary, 0.85),
            maxBarThickness: 28,
            categoryPercentage: 0.7,
          },
          ...(prevValues
            ? [{
                label: 'Previous period',
                data: prevValues,
                backgroundColor: withAlpha(t.comparison, 0.45),
                hoverBackgroundColor: withAlpha(t.comparison, 0.6),
                maxBarThickness: 28,
                categoryPercentage: 0.7,
              }]
            : []),
        ],
      },
      options: {
        interaction: { mode: 'index', intersect: false },
        plugins: { tooltip },
        scales: { x: xAxis(), y: yAxis(false) },
      },
    } as ChartConfiguration<'bar'> as unknown as ChartConfiguration;
  }

  return {
    type: 'line',
    data: {
      labels,
      datasets: [
        {
          label: 'Revenue',
          data: values,
          borderColor: t.primary,
          backgroundColor: areaGradient(t.primary),
          fill: 'origin',
          pointBackgroundColor: t.primary,
          pointRadius: points.length <= 12 ? 3 : 0,
          order: 0,
        },
        ...(prevValues
          ? [{
              label: 'Previous period',
              data: prevValues,
              borderColor: t.comparison,
              backgroundColor: t.comparison,
              borderDash: [5, 4],
              borderWidth: 1.75,
              fill: false,
              pointBackgroundColor: t.comparison,
              pointRadius: 0,
              order: 1,
            }]
          : []),
      ],
    },
    options: {
      interaction: { mode: 'index', intersect: false },
      plugins: { tooltip },
      scales: { x: xAxis(), y: yAxis(true) },
    },
  } as ChartConfiguration<'line'> as unknown as ChartConfiguration;
};

/** Horizontal ranked bars in one color (magnitude, not identity). */
export const rankedBarChart = (
  labels: string[],
  values: number[],
  t: ChartTheme,
  opts: { money?: boolean; detail?: (i: number) => string; color?: string } = {}
): ChartConfiguration => ({
  type: 'bar',
  data: {
    labels,
    datasets: [
      {
        data: values,
        backgroundColor: opts.color ?? t.primary,
        hoverBackgroundColor: withAlpha(opts.color ?? t.primary, 0.85),
        maxBarThickness: 18,
        categoryPercentage: 0.78,
      },
    ],
  },
  options: {
    indexAxis: 'y',
    plugins: {
      tooltip: {
        callbacks: {
          label: (ctx) => {
            const v = Number(ctx.parsed.x ?? 0);
            const main = opts.money ? inr.format(v) : num.format(v);
            return ` ${main}${opts.detail ? ' · ' + opts.detail(ctx.dataIndex) : ''}`;
          },
        },
      },
    },
    scales: {
      x: { ...yAxis(!!opts.money), grid: { drawTicks: false } },
      y: {
        grid: { display: false },
        border: { display: false },
        ticks: {
          color: t.ink,
          padding: 6,
          callback(value) {
            const label = String(this.getLabelForValue(Number(value)));
            return label.length > 22 ? label.slice(0, 21) + '…' : label;
          },
        },
      },
    },
  },
});

/** Doughnut for part-to-whole with ≤ 8 named slices (the legend table beside it carries identity). */
export const doughnutChart = (
  labels: string[],
  values: number[],
  colors: string[],
  t: ChartTheme,
  detail: (i: number) => string
): ChartConfiguration<'doughnut'> => ({
  type: 'doughnut',
  data: {
    labels,
    datasets: [
      {
        data: values,
        backgroundColor: colors,
        borderColor: t.surface,
        borderWidth: 2,
        hoverOffset: 6,
        borderRadius: 4,
        spacing: 1,
      },
    ],
  },
  options: {
    cutout: '72%',
    layout: { padding: 6 },
    plugins: {
      tooltip: { callbacks: { label: (ctx) => ` ${ctx.label}: ${detail(ctx.dataIndex)}` } },
    },
  },
});

/** Monthly revenue bars against a flat target line on the same axis. */
export const targetChart = (points: TrendPoint[], target: number, t: ChartTheme): ChartConfiguration =>
  ({
    type: 'bar',
    data: {
      labels: points.map((p) => p.label.replace(/ \d{4}$/, '')),
      datasets: [
        {
          type: 'line',
          label: 'Target',
          data: points.map(() => target),
          borderColor: t.comparison,
          borderDash: [5, 4],
          borderWidth: 1.75,
          pointRadius: 0,
          pointHoverRadius: 0,
          fill: false,
          tension: 0,
          order: 0,
        },
        {
          type: 'bar',
          label: 'Revenue',
          data: points.map((p) => p.revenue),
          backgroundColor: points.map((p) => (p.revenue >= target ? t.primary : withAlpha(t.primary, 0.45))),
          hoverBackgroundColor: t.primary,
          maxBarThickness: 34,
          order: 1,
        },
      ],
    },
    options: {
      interaction: { mode: 'index', intersect: false },
      plugins: {
        tooltip: {
          callbacks: {
            label: (ctx: TooltipItem<'bar'>) => {
              if (ctx.dataset.label === 'Target') return ` Target: ${inr.format(target)}`;
              const v = Number(ctx.parsed.y ?? 0);
              return ` Revenue: ${inr.format(v)} (${Math.round((v / target) * 100)}% of target)`;
            },
          },
        },
      },
      scales: { x: xAxis(12), y: yAxis(true) },
    },
  }) as unknown as ChartConfiguration;

/** Stacked bars: one dataset per named series (color by entity), 2px surface gap between segments. */
export const stackedChart = (
  labels: string[],
  series: { name: string; values: number[]; color: string }[],
  t: ChartTheme,
  money = true
): ChartConfiguration<'bar'> => ({
  type: 'bar',
  data: {
    labels,
    datasets: series.map((s) => ({
      label: s.name,
      data: s.values,
      backgroundColor: s.color,
      borderColor: t.surface,
      borderWidth: { top: 2 },
      borderSkipped: 'start',
      borderRadius: 3,
      maxBarThickness: 36,
    })),
  },
  options: {
    interaction: { mode: 'index', intersect: false },
    plugins: {
      tooltip: {
        itemSort: (a, b) => b.datasetIndex - a.datasetIndex,
        callbacks: { label: (ctx) => ` ${ctx.dataset.label}: ${money ? inr.format(Number(ctx.parsed.y)) : num.format(Number(ctx.parsed.y))}` },
      },
    },
    scales: {
      x: { ...xAxis(12), stacked: true },
      y: { ...yAxis(money), stacked: true },
    },
  },
});
