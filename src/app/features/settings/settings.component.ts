import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RangePreset } from '../../core/models/analytics.models';
import { DateRangeService, RANGE_PRESETS } from '../../core/services/date-range.service';
import { NotificationService } from '../../core/services/notification.service';
import { SettingsService, ThemePreference } from '../../core/services/settings.service';

/** Preferences stored in this browser (localStorage); nothing here touches the backend. */
@Component({
  selector: 'app-settings',
  standalone: true,
  imports: [FormsModule],
  template: `
    <div class="page settings">
      <div class="page-header">
        <div>
          <h1 class="page-title">Settings</h1>
          <p class="page-subtitle">Preferences are saved in this browser only.</p>
        </div>
      </div>

      <section class="card setting-card">
        <div class="setting-info">
          <h2 class="card-title">Appearance</h2>
          <p>Choose a theme, or follow your operating system.</p>
        </div>
        <div class="theme-options" role="radiogroup" aria-label="Theme">
          @for (t of themes; track t.value) {
            <button type="button" class="theme-option" role="radio" [attr.aria-checked]="settings.theme() === t.value"
                    [class.active]="settings.theme() === t.value" (click)="settings.theme.set(t.value)">
              <span class="theme-preview {{ t.value }}" aria-hidden="true"><span></span><span></span></span>
              <span class="d-flex align-items-center gap-2"><i class="bi {{ t.icon }}" aria-hidden="true"></i>{{ t.label }}</span>
            </button>
          }
        </div>
      </section>

      <section class="card setting-card">
        <div class="setting-info">
          <h2 class="card-title">Default date range</h2>
          <p>The range analytics pages open with.</p>
        </div>
        <div>
          <label for="default-range" class="visually-hidden">Default date range</label>
          <select id="default-range" class="form-select" [ngModel]="settings.defaultRange()" (ngModelChange)="setDefaultRange($event)">
            @for (p of presets; track p.value) { <option [value]="p.value">{{ p.label }}</option> }
          </select>
        </div>
      </section>

      <section class="card setting-card">
        <div class="setting-info">
          <h2 class="card-title">Monthly revenue target</h2>
          <p>Used by "Target vs Achievement" on the dashboard. Leave empty to hide the target.</p>
        </div>
        <form class="d-flex gap-2" (ngSubmit)="saveTarget()">
          <div class="input-icon flex-grow-1">
            <i class="bi bi-currency-rupee" aria-hidden="true"></i>
            <label for="target" class="visually-hidden">Monthly revenue target in rupees</label>
            <input id="target" type="number" min="0" step="1000" class="form-control" name="target" [(ngModel)]="target" placeholder="Not set" />
          </div>
          <button type="submit" class="btn btn-primary">Save</button>
        </form>
      </section>

      <section class="card setting-card">
        <div class="setting-info">
          <h2 class="card-title">Compact sidebar</h2>
          <p>Show navigation as an icon rail on large screens.</p>
        </div>
        <div class="form-check form-switch m-0">
          <input class="form-check-input" type="checkbox" role="switch" id="compact-sidebar"
                 [checked]="settings.sidebarCollapsed()" (change)="settings.sidebarCollapsed.set($any($event.target).checked)" />
          <label class="form-check-label visually-hidden" for="compact-sidebar">Compact sidebar</label>
        </div>
      </section>
    </div>
  `,
  styles: [`
    .settings { max-width: 880px; }
    .setting-card { display: grid; grid-template-columns: minmax(0, 1fr) minmax(0, 1.1fr); gap: 1.25rem; align-items: center; padding: 1.25rem 1.4rem; margin-bottom: 1rem; }
    .setting-info p { margin: .2rem 0 0; font-size: .83rem; color: var(--sd-muted); }
    .theme-options { display: grid; grid-template-columns: repeat(3, 1fr); gap: .6rem; }
    .theme-option { display: flex; flex-direction: column; gap: .5rem; padding: .5rem; border: 1px solid var(--sd-border-strong); border-radius: var(--sd-radius-sm); background: var(--sd-surface); color: var(--sd-text); font-size: .8rem; font-weight: 500; transition: border-color .15s ease, box-shadow .15s ease; }
    .theme-option:hover { border-color: var(--sd-primary); }
    .theme-option.active { border-color: var(--sd-primary); box-shadow: 0 0 0 3px var(--sd-primary-ring); }
    .theme-preview { display: flex; gap: 4px; height: 44px; padding: 6px; border-radius: 7px; }
    .theme-preview span { border-radius: 4px; }
    .theme-preview span:first-child { width: 28%; } .theme-preview span:last-child { flex: 1; }
    .theme-preview.light { background: #f5f6fa; } .theme-preview.light span { background: #fff; border: 1px solid #e7e9f0; }
    .theme-preview.dark { background: #0b0f17; } .theme-preview.dark span { background: #121826; border: 1px solid #222a3a; }
    .theme-preview.system { background: linear-gradient(135deg, #f5f6fa 50%, #0b0f17 50%); }
    .theme-preview.system span { background: rgba(127, 127, 127, .35); }
    @media (max-width: 767.98px) { .setting-card { grid-template-columns: 1fr; } }
  `],
})
export class SettingsComponent {
  readonly settings = inject(SettingsService);
  private readonly ranges = inject(DateRangeService);
  private readonly notify = inject(NotificationService);

  readonly presets = RANGE_PRESETS;
  readonly themes: { value: ThemePreference; label: string; icon: string }[] = [
    { value: 'light', label: 'Light', icon: 'bi-sun' },
    { value: 'dark', label: 'Dark', icon: 'bi-moon-stars' },
    { value: 'system', label: 'System', icon: 'bi-circle-half' },
  ];

  target: number | null = this.settings.monthlyTarget();

  setDefaultRange(preset: RangePreset): void {
    this.settings.defaultRange.set(preset);
    this.ranges.setPreset(preset);
    this.notify.success('Default date range updated');
  }

  saveTarget(): void {
    const value = Number(this.target);
    this.settings.monthlyTarget.set(value > 0 ? Math.round(value) : null);
    this.notify.success(value > 0 ? 'Monthly target saved' : 'Monthly target cleared');
  }
}
