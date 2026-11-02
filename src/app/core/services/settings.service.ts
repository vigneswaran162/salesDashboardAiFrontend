import { Injectable, computed, effect, signal } from '@angular/core';
import { RangePreset } from '../models/analytics.models';

export type ThemePreference = 'light' | 'dark' | 'system';

const KEYS = {
  theme: 'sd.theme',
  sidebarCollapsed: 'sd.sidebarCollapsed',
  defaultRange: 'sd.defaultRange',
  monthlyTarget: 'sd.monthlyTarget',
} as const;

const read = (key: string): string | null => {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
};

const write = (key: string, value: string | null): void => {
  try {
    if (value === null) localStorage.removeItem(key);
    else localStorage.setItem(key, value);
  } catch {
    /* storage unavailable (private mode) — keep the in-memory value */
  }
};

/** User preferences persisted in this browser: theme, layout, default range and revenue target. */
@Injectable({ providedIn: 'root' })
export class SettingsService {
  private readonly media = window.matchMedia('(prefers-color-scheme: dark)');
  private readonly systemDark = signal(this.media.matches);

  readonly theme = signal<ThemePreference>((read(KEYS.theme) as ThemePreference) || 'light');
  readonly isDark = computed(() => this.theme() === 'dark' || (this.theme() === 'system' && this.systemDark()));

  readonly sidebarCollapsed = signal(read(KEYS.sidebarCollapsed) === 'true');
  readonly defaultRange = signal<RangePreset>((read(KEYS.defaultRange) as RangePreset) || '90d');

  /** Monthly revenue goal in INR; null when the user has not set one. */
  readonly monthlyTarget = signal<number | null>(Number(read(KEYS.monthlyTarget)) || null);

  constructor() {
    this.media.addEventListener('change', (e) => this.systemDark.set(e.matches));

    effect(() => {
      document.documentElement.setAttribute('data-bs-theme', this.isDark() ? 'dark' : 'light');
    });
    effect(() => write(KEYS.theme, this.theme()));
    effect(() => write(KEYS.sidebarCollapsed, String(this.sidebarCollapsed())));
    effect(() => write(KEYS.defaultRange, this.defaultRange()));
    effect(() => {
      const target = this.monthlyTarget();
      write(KEYS.monthlyTarget, target ? String(target) : null);
    });
  }

  toggleTheme(): void {
    this.theme.set(this.isDark() ? 'light' : 'dark');
  }
}
