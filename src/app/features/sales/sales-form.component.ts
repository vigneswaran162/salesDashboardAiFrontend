import { CurrencyPipe } from '@angular/common';
import { Component, DestroyRef, EventEmitter, HostListener, Input, OnInit, Output, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { AbstractControl, FormBuilder, ReactiveFormsModule, ValidationErrors, ValidatorFn, Validators } from '@angular/forms';
import {
  PAYMENT_METHODS,
  PaymentMethod,
  Product,
  SALE_STATUSES,
  Sale,
  SalePayload,
  SaleStatus,
} from '../../core/models/sales.models';
import { NotificationService } from '../../core/services/notification.service';
import { SalesService } from '../../core/services/sales.service';
import { getErrorMessage } from '../../core/utils/http-error';

const PHONE_PATTERN = /^\+?[0-9][0-9\s-]{6,14}$/;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Today's date as YYYY-MM-DD in the user's local time zone. */
const today = (): string => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

type SaleFormControl = keyof SalesFormComponent['form']['controls'];

/** Discount must not exceed quantity x unit price. */
const discountWithinSubtotal: ValidatorFn = (group: AbstractControl): ValidationErrors | null => {
  const quantity = Number(group.get('quantity')?.value) || 0;
  const unitPrice = Number(group.get('unitPrice')?.value) || 0;
  const discount = Number(group.get('discount')?.value) || 0;
  return discount > quantity * unitPrice ? { discountTooHigh: true } : null;
};

@Component({
  selector: 'app-sales-form',
  standalone: true,
  imports: [ReactiveFormsModule, CurrencyPipe],
  templateUrl: './sales-form.component.html',
  styleUrl: './sales-form.component.css',
})
export class SalesFormComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly salesService = inject(SalesService);
  private readonly notify = inject(NotificationService);
  private readonly destroyRef = inject(DestroyRef);

  /** The sale to edit, or null to create a new one. */
  @Input() sale: Sale | null = null;
  @Input() products: Product[] = [];
  @Output() saved = new EventEmitter<Sale>();
  @Output() cancelled = new EventEmitter<void>();

  readonly paymentMethods = PAYMENT_METHODS;
  readonly statuses = SALE_STATUSES;
  readonly saving = signal(false);
  readonly serverError = signal<string | null>(null);
  readonly subtotal = signal(0);
  productOptions: Product[] = [];

  readonly form = this.fb.nonNullable.group(
    {
      customerName: ['', [Validators.required, Validators.maxLength(100)]],
      customerEmail: ['', [Validators.required, Validators.email, Validators.pattern(EMAIL_PATTERN)]],
      customerPhone: ['', [Validators.required, Validators.pattern(PHONE_PATTERN)]],
      productId: ['', Validators.required],
      quantity: [1, [Validators.required, Validators.min(1), Validators.pattern(/^\d+$/)]],
      unitPrice: [{ value: 0, disabled: true }],
      discount: [0, [Validators.min(0)]],
      totalAmount: [{ value: 0, disabled: true }],
      paymentMethod: ['' as PaymentMethod | '', Validators.required],
      saleDate: [today(), Validators.required],
      status: ['Completed' as SaleStatus, Validators.required],
      notes: ['', Validators.maxLength(500)],
    },
    { validators: discountWithinSubtotal }
  );

  get isEdit(): boolean {
    return !!this.sale;
  }

  ngOnInit(): void {
    this.productOptions = this.buildProductOptions();

    this.form.controls.productId.valueChanges.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((id) => {
      const product = this.productOptions.find((p) => p._id === id);
      // When editing, keep the price recorded on the sale unless the product changes.
      const keepRecordedPrice = this.sale && id === this.sale.productId;
      this.form.controls.unitPrice.setValue(keepRecordedPrice ? this.sale!.unitPrice : product?.price ?? 0);
    });

    this.form.valueChanges.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(() => this.recalculate());

    this.reset();
  }

  /** Restores the initial state: blank for a new sale, original values when editing. */
  reset(): void {
    const s = this.sale;
    this.form.reset({
      customerName: s?.customerName ?? '',
      customerEmail: s?.customerEmail ?? '',
      customerPhone: s?.customerPhone ?? '',
      productId: s?.productId ?? '',
      quantity: s?.quantity ?? 1,
      unitPrice: s?.unitPrice ?? 0,
      discount: s?.discount ?? 0,
      totalAmount: s?.totalAmount ?? 0,
      paymentMethod: s?.paymentMethod ?? '',
      saleDate: s ? s.saleDate.slice(0, 10) : today(),
      status: s?.status ?? 'Completed',
      notes: s?.notes ?? '',
    });
    this.serverError.set(null);
    this.recalculate();
  }

  submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const v = this.form.getRawValue();
    const payload: SalePayload = {
      customerName: v.customerName.trim(),
      customerEmail: v.customerEmail.trim(),
      customerPhone: v.customerPhone.trim(),
      productId: v.productId,
      quantity: Number(v.quantity),
      discount: Number(v.discount) || 0,
      paymentMethod: v.paymentMethod as PaymentMethod,
      status: v.status,
      saleDate: v.saleDate,
      notes: v.notes.trim(),
    };

    const request$ = this.sale
      ? this.salesService.updateSale(this.sale._id, payload)
      : this.salesService.createSale(payload);

    this.saving.set(true);
    this.serverError.set(null);
    request$.subscribe({
      next: (res) => {
        this.saving.set(false);
        this.notify.success(this.sale ? `Sale ${res.data.invoiceNumber} updated` : `Sale ${res.data.invoiceNumber} created`);
        this.saved.emit(res.data);
      },
      error: (err) => {
        this.saving.set(false);
        this.serverError.set(getErrorMessage(err, 'Failed to save the sale.'));
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

  /** True when a control should display its validation error. */
  invalid(name: SaleFormControl): boolean {
    const control = this.form.controls[name];
    return control.invalid && (control.touched || control.dirty);
  }

  private recalculate(): void {
    const { quantity, unitPrice, discount } = this.form.getRawValue();
    const subtotal = (Number(quantity) || 0) * (Number(unitPrice) || 0);
    const total = Math.max(0, Math.round((subtotal - (Number(discount) || 0)) * 100) / 100);
    this.subtotal.set(subtotal);
    this.form.controls.totalAmount.setValue(total, { emitEvent: false });
  }

  /** Active products, plus the sale's own product if it has since been deactivated. */
  private buildProductOptions(): Product[] {
    const options = [...this.products];
    const s = this.sale;
    if (s && !options.some((p) => p._id === s.productId)) {
      options.unshift({
        _id: s.productId,
        name: `${s.productName} (inactive)`,
        category: s.category,
        price: s.unitPrice,
        stock: 0,
        isActive: false,
      });
    }
    return options;
  }
}
