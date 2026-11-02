import { Component, Input } from '@angular/core';
import { SaleStatus } from '../../../core/models/sales.models';

const STATUS_STYLES: Record<SaleStatus, { css: string; icon: string }> = {
  Completed: { css: 'pill-success', icon: 'bi-check-circle-fill' },
  Pending: { css: 'pill-warning', icon: 'bi-clock-fill' },
  Cancelled: { css: 'pill-danger', icon: 'bi-x-circle-fill' },
};

/** Status pill: color plus icon plus label, so the state is never conveyed by color alone. */
@Component({
  selector: 'app-status-badge',
  standalone: true,
  template: `
    <span class="pill {{ style.css }}">
      <i class="bi {{ style.icon }}" aria-hidden="true"></i>{{ status }}
    </span>
  `,
  styles: [`.bi { font-size: .7rem; }`],
})
export class StatusBadgeComponent {
  @Input({ required: true }) status!: SaleStatus;

  get style() {
    return STATUS_STYLES[this.status] ?? { css: '', icon: 'bi-circle' };
  }
}
