import { Component, inject } from '@angular/core';
import { NotificationService, NotificationType } from '../../../core/services/notification.service';

const STYLES: Record<NotificationType, { css: string; icon: string; title: string }> = {
  success: { css: 'success', icon: 'bi-check-circle-fill', title: 'Success' },
  error: { css: 'error', icon: 'bi-exclamation-triangle-fill', title: 'Error' },
  info: { css: 'info', icon: 'bi-info-circle-fill', title: 'Info' },
};

/** Toast stack rendered once in the app shell; driven by NotificationService. */
@Component({
  selector: 'app-notification',
  standalone: true,
  template: `
    <div class="toast-stack" aria-live="polite" aria-atomic="true">
      @for (n of notifications(); track n.id) {
        <div class="sd-toast {{ styles[n.type].css }}" role="alert">
          <i class="bi {{ styles[n.type].icon }} toast-icon" aria-hidden="true"></i>
          <div class="toast-text">
            <div class="toast-title">{{ styles[n.type].title }}</div>
            <div class="toast-msg">{{ n.message }}</div>
          </div>
          <button type="button" class="toast-close" aria-label="Dismiss" (click)="dismiss(n.id)"><i class="bi bi-x-lg"></i></button>
        </div>
      }
    </div>
  `,
  styles: [`
    .toast-stack { position: fixed; top: calc(var(--sd-topbar-h) + .75rem); right: 1rem; z-index: 1090; display: flex; flex-direction: column; gap: .6rem; width: min(360px, calc(100vw - 2rem)); }
    .sd-toast { display: flex; gap: .75rem; align-items: flex-start; padding: .85rem .9rem; background: var(--sd-surface); border: 1px solid var(--sd-border); border-left: 3px solid; border-radius: var(--sd-radius-sm); box-shadow: var(--sd-shadow-lg); animation: toast-in .25s var(--sd-ease) both; }
    @keyframes toast-in { from { opacity: 0; transform: translateX(16px); } }
    .success { border-left-color: #10b981; } .success .toast-icon { color: var(--sd-success); }
    .error { border-left-color: #f43f5e; } .error .toast-icon { color: var(--sd-danger); }
    .info { border-left-color: var(--sd-primary); } .info .toast-icon { color: var(--sd-primary-text); }
    .toast-icon { font-size: 1.05rem; margin-top: 1px; }
    .toast-text { flex: 1; min-width: 0; }
    .toast-title { font-size: .85rem; font-weight: 600; color: var(--sd-text); }
    .toast-msg { font-size: .8rem; color: var(--sd-text-2); word-break: break-word; }
    .toast-close { border: 0; background: transparent; color: var(--sd-muted); padding: 0 .1rem; font-size: .8rem; }
    .toast-close:hover { color: var(--sd-text); }
  `],
})
export class NotificationComponent {
  private readonly service = inject(NotificationService);
  readonly notifications = this.service.notifications;
  readonly styles = STYLES;

  dismiss(id: number): void {
    this.service.dismiss(id);
  }
}
