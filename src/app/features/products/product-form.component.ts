import { Component, EventEmitter, HostListener, Input, OnInit, Output, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Product } from '../../core/models/sales.models';
import { NotificationService } from '../../core/services/notification.service';
import { ProductService } from '../../core/services/product.service';
import { getErrorMessage } from '../../core/utils/http-error';

type ProductControl = keyof ProductFormComponent['form']['controls'];

/** Add/edit product modal. Render it with @if when it should be visible. */
@Component({
  selector: 'app-product-form',
  standalone: true,
  imports: [ReactiveFormsModule],
  template: `
    <div class="modal-backdrop fade show"></div>
    <div class="modal fade show d-block" tabindex="-1" role="dialog" aria-modal="true" aria-labelledby="product-form-title">
      <div class="modal-dialog modal-dialog-centered">
        <form class="modal-content border-0 shadow" [formGroup]="form" (ngSubmit)="submit()" novalidate>
          <div class="modal-header">
            <h5 class="modal-title" id="product-form-title">
              <i class="bi {{ product ? 'bi-pencil-square' : 'bi-plus-circle' }} me-2 text-primary" aria-hidden="true"></i>
              {{ product ? 'Edit Product' : 'Add Product' }}
            </h5>
            <button type="button" class="btn-close" aria-label="Close" (click)="cancel()" [disabled]="saving()"></button>
          </div>
          <div class="modal-body">
            @if (serverError()) {
              <div class="alert alert-danger py-2" role="alert">
                <i class="bi bi-exclamation-triangle-fill me-2" aria-hidden="true"></i>{{ serverError() }}
              </div>
            }
            <div class="row g-3">
              <div class="col-12">
                <label for="p-name" class="form-label">Name <span class="text-danger">*</span></label>
                <input id="p-name" type="text" class="form-control" formControlName="name" [class.is-invalid]="invalid('name')" />
                <div class="invalid-feedback">
                  @if (form.controls.name.hasError('required')) { Product name is required. } @else { Maximum 120 characters. }
                </div>
              </div>
              <div class="col-12">
                <label for="p-category" class="form-label">Category <span class="text-danger">*</span></label>
                <select id="p-category" class="form-select" formControlName="category" [class.is-invalid]="invalid('category')">
                  <option value="" disabled>Select a category</option>
                  @for (c of categoryOptions; track c) { <option [value]="c">{{ c }}</option> }
                </select>
                <div class="invalid-feedback">Category is required.</div>
              </div>
              <div class="col-6">
                <label for="p-price" class="form-label">Price (₹) <span class="text-danger">*</span></label>
                <input id="p-price" type="number" min="0" step="0.01" class="form-control" formControlName="price" [class.is-invalid]="invalid('price')" />
                <div class="invalid-feedback">Enter a price of 0 or more.</div>
              </div>
              <div class="col-6">
                <label for="p-stock" class="form-label">Stock</label>
                <input id="p-stock" type="number" min="0" step="1" class="form-control" formControlName="stock" [class.is-invalid]="invalid('stock')" />
                <div class="invalid-feedback">Enter a whole number of 0 or more.</div>
              </div>
              <div class="col-12">
                <div class="form-check form-switch">
                  <input id="p-active" type="checkbox" class="form-check-input" role="switch" formControlName="isActive" />
                  <label for="p-active" class="form-check-label">Active (available for new sales)</label>
                </div>
              </div>
            </div>
          </div>
          <div class="modal-footer">
            <button type="button" class="btn btn-light" (click)="cancel()" [disabled]="saving()">Cancel</button>
            <button type="submit" class="btn btn-primary" [disabled]="saving()">
              @if (saving()) { <span class="spinner-border spinner-border-sm me-1" aria-hidden="true"></span> }
              {{ product ? 'Save changes' : 'Add product' }}
            </button>
          </div>
        </form>
      </div>
    </div>
  `,
})
export class ProductFormComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly productService = inject(ProductService);
  private readonly notify = inject(NotificationService);

  @Input() product: Product | null = null;
  @Input() categories: string[] = [];
  @Output() saved = new EventEmitter<Product>();
  @Output() cancelled = new EventEmitter<void>();

  readonly saving = signal(false);
  readonly serverError = signal<string | null>(null);
  categoryOptions: string[] = [];

  readonly form = this.fb.nonNullable.group({
    name: ['', [Validators.required, Validators.maxLength(120)]],
    category: ['', Validators.required],
    price: [0, [Validators.required, Validators.min(0)]],
    stock: [0, [Validators.required, Validators.min(0), Validators.pattern(/^\d+$/)]],
    isActive: [true],
  });

  ngOnInit(): void {
    const own = this.product?.category;
    this.categoryOptions = own && !this.categories.includes(own) ? [own, ...this.categories] : this.categories;
    if (this.product) this.form.patchValue(this.product);
  }

  submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const v = this.form.getRawValue();
    const payload = { ...v, name: v.name.trim(), price: Number(v.price), stock: Number(v.stock) };
    const request$ = this.product
      ? this.productService.updateProduct(this.product._id, payload)
      : this.productService.createProduct(payload);

    this.saving.set(true);
    this.serverError.set(null);
    request$.subscribe({
      next: (p) => {
        this.saving.set(false);
        this.notify.success(this.product ? `${p.name} updated` : `${p.name} added`);
        this.saved.emit(p);
      },
      error: (err) => {
        this.saving.set(false);
        this.serverError.set(getErrorMessage(err, 'Failed to save the product.'));
      },
    });
  }

  cancel(): void {
    if (!this.saving()) this.cancelled.emit();
  }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    this.cancel();
  }

  invalid(name: ProductControl): boolean {
    const c = this.form.controls[name];
    return c.invalid && (c.touched || c.dirty);
  }
}
