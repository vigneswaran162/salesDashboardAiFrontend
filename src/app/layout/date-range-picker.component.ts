import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RangePreset } from '../core/models/analytics.models';
import { DateRangeService, RANGE_PRESETS } from '../core/services/date-range.service';
import { ClickOutsideDirective } from '../shared/directives/click-outside.directive';

@Component({
  selector: 'app-date-range-picker',
  standalone: true,
  imports: [FormsModule, ClickOutsideDirective],
  template: `
    <div class="picker" (appClickOutside)="open.set(false)">
      <button type="button" class="btn btn-soft picker-btn" (click)="toggle()" aria-haspopup="menu" [attr.aria-expanded]="open()">
        <i class="bi bi-calendar3" aria-hidden="true"></i>
        <span class="picker-label">{{ ranges.label() }}</span>
        <i class="bi bi-chevron-down small text-secondary" aria-hidden="true"></i>
      </button>

      @if (open()) {
        <div class="menu picker-menu" role="menu">
          <div class="menu-label">Date range</div>
          @for (p of presets; track p.value) {
            <button type="button" class="menu-item" role="menuitemradio" [attr.aria-checked]="ranges.preset() === p.value"
                    (click)="choose(p.value)">
              {{ p.label }}
              @if (ranges.preset() === p.value) { <i class="bi bi-check-lg check" aria-hidden="true"></i> }
            </button>
          }
          <div class="menu-divider"></div>
          <div class="menu-label">Custom range</div>
          <form class="custom" (ngSubmit)="applyCustom()">
            <div class="d-flex gap-2">
              <label class="visually-hidden" for="range-start">Start date</label>
              <input id="range-start" type="date" class="form-control form-control-sm" name="start" [(ngModel)]="start" [max]="end" required />
              <label class="visually-hidden" for="range-end">End date</label>
              <input id="range-end" type="date" class="form-control form-control-sm" name="end" [(ngModel)]="end" [min]="start" required />
            </div>
            <button type="submit" class="btn btn-primary btn-sm w-100 mt-2" [disabled]="!start || !end">Apply range</button>
          </form>
        </div>
      }
    </div>
  `,
  styles: [`
    .picker { position: relative; }
    .picker-btn { height: 38px; white-space: nowrap; }
    .picker-menu { right: 0; top: calc(100% + 6px); width: 260px; }
    .custom { padding: 0 .65rem .5rem; }
    @media (max-width: 575.98px) { .picker-label { display: none; } .picker-menu { right: -60px; } }
  `],
})
export class DateRangePickerComponent {
  readonly ranges = inject(DateRangeService);
  readonly presets = RANGE_PRESETS;
  readonly open = signal(false);

  start = this.ranges.customStart();
  end = this.ranges.customEnd();

  toggle(): void {
    if (!this.open()) {
      const r = this.ranges.range();
      this.start = r.start;
      this.end = r.end;
    }
    this.open.update((o) => !o);
  }

  choose(preset: RangePreset): void {
    this.ranges.setPreset(preset);
    this.open.set(false);
  }

  applyCustom(): void {
    if (!this.start || !this.end) return;
    this.ranges.setCustom(this.start, this.end);
    this.open.set(false);
  }
}
