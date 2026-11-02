import { Component, EventEmitter, HostListener, Input, Output } from '@angular/core';

/** Generic confirm/cancel modal. Render it with @if when it should be visible. */
@Component({
  selector: 'app-confirmation-dialog',
  standalone: true,
  template: `
    <div class="modal-backdrop fade show"></div>
    <div class="modal fade show d-block" tabindex="-1" role="dialog" aria-modal="true" [attr.aria-labelledby]="'confirm-title'">
      <div class="modal-dialog modal-dialog-centered">
        <div class="modal-content border-0 shadow">
          <div class="modal-header border-0 pb-0">
            <h5 class="modal-title d-flex align-items-center gap-2" id="confirm-title">
              <i class="bi bi-exclamation-triangle-fill text-{{ variant }}" aria-hidden="true"></i>
              {{ title }}
            </h5>
            <button type="button" class="btn-close" aria-label="Close" [disabled]="busy" (click)="cancelled.emit()"></button>
          </div>
          <div class="modal-body text-secondary">{{ message }}</div>
          <div class="modal-footer border-0 pt-0">
            <button type="button" class="btn btn-light" [disabled]="busy" (click)="cancelled.emit()">{{ cancelText }}</button>
            <button type="button" class="btn btn-{{ variant }}" [disabled]="busy" (click)="confirmed.emit()">
              @if (busy) {
                <span class="spinner-border spinner-border-sm me-1" aria-hidden="true"></span>
              }
              {{ confirmText }}
            </button>
          </div>
        </div>
      </div>
    </div>
  `,
})
export class ConfirmationDialogComponent {
  @Input() title = 'Are you sure?';
  @Input() message = '';
  @Input() confirmText = 'Confirm';
  @Input() cancelText = 'Cancel';
  @Input() variant: 'danger' | 'primary' | 'warning' = 'danger';
  @Input() busy = false;
  @Output() confirmed = new EventEmitter<void>();
  @Output() cancelled = new EventEmitter<void>();

  @HostListener('document:keydown.escape')
  onEscape(): void {
    if (!this.busy) this.cancelled.emit();
  }
}
