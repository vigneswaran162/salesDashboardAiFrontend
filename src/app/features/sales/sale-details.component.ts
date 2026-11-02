import { CurrencyPipe, DatePipe } from '@angular/common';
import { Component, EventEmitter, HostListener, Input, Output } from '@angular/core';
import { Sale } from '../../core/models/sales.models';
import { StatusBadgeComponent } from '../../shared/components/status-badge/status-badge.component';

/** Read-only modal showing every field of a sale. */
@Component({
  selector: 'app-sale-details',
  standalone: true,
  imports: [CurrencyPipe, DatePipe, StatusBadgeComponent],
  template: `
    <div class="modal-backdrop fade show"></div>
    <div class="modal fade show d-block" tabindex="-1" role="dialog" aria-modal="true" aria-labelledby="sale-details-title">
      <div class="modal-dialog modal-lg modal-dialog-centered modal-dialog-scrollable">
        <div class="modal-content border-0 shadow">
          <div class="modal-header">
            <div>
              <h5 class="modal-title" id="sale-details-title">Invoice {{ sale.invoiceNumber }}</h5>
              <small class="text-secondary">{{ sale.saleDate | date: 'EEEE, dd MMM yyyy' : 'UTC' }}</small>
            </div>
            <app-status-badge class="ms-3" [status]="sale.status" />
            <button type="button" class="btn-close" aria-label="Close" (click)="closed.emit()"></button>
          </div>
          <div class="modal-body">
            <div class="row g-4">
              <div class="col-12 col-md-6">
                <h6 class="detail-heading">Customer</h6>
                <dl class="mb-0">
                  <dt>Name</dt><dd>{{ sale.customerName }}</dd>
                  <dt>Email</dt><dd><a href="mailto:{{ sale.customerEmail }}">{{ sale.customerEmail }}</a></dd>
                  <dt>Phone</dt><dd>{{ sale.customerPhone }}</dd>
                </dl>
              </div>
              <div class="col-12 col-md-6">
                <h6 class="detail-heading">Product</h6>
                <dl class="mb-0">
                  <dt>Product</dt><dd>{{ sale.productName }}</dd>
                  <dt>Category</dt><dd>{{ sale.category }}</dd>
                  <dt>Payment Method</dt><dd>{{ sale.paymentMethod }}</dd>
                </dl>
              </div>
            </div>

            <table class="table table-sm mt-4 mb-0">
              <tbody>
                <tr><td>Unit Price</td><td class="text-end">{{ sale.unitPrice | currency: 'INR' }}</td></tr>
                <tr><td>Quantity</td><td class="text-end">× {{ sale.quantity }}</td></tr>
                <tr><td>Subtotal</td><td class="text-end">{{ sale.unitPrice * sale.quantity | currency: 'INR' }}</td></tr>
                <tr><td>Discount</td><td class="text-end text-danger">− {{ sale.discount | currency: 'INR' }}</td></tr>
                <tr class="fw-bold fs-5"><td>Total Amount</td><td class="text-end text-primary">{{ sale.totalAmount | currency: 'INR' }}</td></tr>
              </tbody>
            </table>

            @if (sale.notes) {
              <h6 class="detail-heading mt-4">Notes</h6>
              <p class="mb-0">{{ sale.notes }}</p>
            }

            <p class="small text-secondary mt-4 mb-0">
              Created {{ sale.createdAt | date: 'medium' }} · Last updated {{ sale.updatedAt | date: 'medium' }}
            </p>
          </div>
          <div class="modal-footer">
            <button type="button" class="btn btn-outline-secondary" (click)="closed.emit()">Close</button>
            <button type="button" class="btn btn-primary" (click)="edit.emit(sale)">
              <i class="bi bi-pencil me-1" aria-hidden="true"></i>Edit Sale
            </button>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .modal-header { align-items: center; }
    .modal-header .btn-close { margin-left: auto; }
    .detail-heading { font-size: .75rem; text-transform: uppercase; letter-spacing: .05em; color: var(--bs-secondary-color); font-weight: 700; }
    dt { font-size: .8rem; font-weight: 500; color: var(--bs-secondary-color); }
    dd { margin-bottom: .6rem; }
  `],
})
export class SaleDetailsComponent {
  @Input({ required: true }) sale!: Sale;
  @Output() closed = new EventEmitter<void>();
  @Output() edit = new EventEmitter<Sale>();

  @HostListener('document:keydown.escape')
  onEscape(): void {
    this.closed.emit();
  }
}
