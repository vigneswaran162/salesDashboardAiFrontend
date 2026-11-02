import { Injectable, computed, inject, signal } from '@angular/core';
import { DateRange, RangePreset } from '../models/analytics.models';
import { addDays, previousRange, todayIso } from '../utils/analytics';
import { AnalyticsService } from './analytics.service';
import { SettingsService } from './settings.service';

export const RANGE_PRESETS: { value: Exclude<RangePreset, 'custom'>; label: string }[] = [
  { value: '7d', label: 'Last 7 days' },
  { value: '30d', label: 'Last 30 days' },
  { value: '90d', label: 'Last 90 days' },
  { value: 'ytd', label: 'Year to date' },
  { value: '12m', label: 'Last 12 months' },
  { value: 'all', label: 'All time' },
];

/** Global date range shared by the top bar and every analytics view. */
@Injectable({ providedIn: 'root' })
export class DateRangeService {
  private readonly analytics = inject(AnalyticsService);
  private readonly settings = inject(SettingsService);

  readonly preset = signal<RangePreset>(this.settings.defaultRange());
  readonly customStart = signal<string>(addDays(todayIso(), -29));
  readonly customEnd = signal<string>(todayIso());

  readonly range = computed<DateRange>(() => {
    const today = todayIso();
    const preset = this.preset();
    switch (preset) {
      case '7d':
        return { preset, start: addDays(today, -6), end: today };
      case '30d':
        return { preset, start: addDays(today, -29), end: today };
      case '90d':
        return { preset, start: addDays(today, -89), end: today };
      case 'ytd':
        return { preset, start: `${today.slice(0, 4)}-01-01`, end: today };
      case '12m':
        return { preset, start: addDays(today, -364), end: today };
      case 'all':
        return { preset, start: this.analytics.firstSaleDay() ?? addDays(today, -364), end: today };
      case 'custom': {
        const [start, end] = [this.customStart(), this.customEnd()].sort();
        return { preset, start, end };
      }
    }
  });

  readonly previous = computed(() => previousRange(this.range()));

  readonly label = computed(() => {
    const r = this.range();
    if (r.preset === 'custom') return `${formatDay(r.start)} – ${formatDay(r.end)}`;
    return RANGE_PRESETS.find((p) => p.value === r.preset)?.label ?? '';
  });

  readonly comparisonLabel = computed(() => (this.previous() ? 'vs previous period' : ''));

  setPreset(preset: RangePreset): void {
    this.preset.set(preset);
  }

  setCustom(start: string, end: string): void {
    this.customStart.set(start);
    this.customEnd.set(end);
    this.preset.set('custom');
  }
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
export const formatDay = (day: string): string => {
  const [y, m, d] = day.split('-').map(Number);
  return `${d} ${MONTHS[m - 1]} ${y}`;
};
