import { Component, EventEmitter, HostListener, Input, OnInit, Output, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Category } from '../../core/models/sales.models';
import { CategoryService } from '../../core/services/category.service';
import { NotificationService } from '../../core/services/notification.service';
import { getErrorMessage } from '../../core/utils/http-error';

/** Add/edit category modal. Render it with @if when it should be visible. */
@Component({
  selector: 'app-category-form',
  standalone: true,
  imports: [ReactiveFormsModule],
  template: `
    <div class="modal-backdrop fade show"></div>
    <div class="modal fade show d-block" tabindex="-1" role="dialog" aria-modal="true" aria-labelledby="category-form-title">
      <div class="modal-dialog modal-dialog-centered">
        <form class="modal-content border-0 shadow" [formGroup]="form" (ngSubmit)="submit()" novalidate>
          <div class="modal-header">
            <h5 class="modal-title" id="category-form-title">
              <i class="bi {{ category ? 'bi-pencil-square' : 'bi-plus-circle' }} me-2 text-primary" aria-hidden="true"></i>
              {{ category ? 'Edit Category' : 'Add Category' }}
            </h5>
            <button type="button" class="btn-close" aria-label="Close" (click)="cancel()" [disabled]="saving()"></button>
          </div>
          <div class="modal-body">
            @if (serverError()) {
              <div class="alert alert-danger py-2" role="alert">
                <i class="bi bi-exclamation-triangle-fill me-2" aria-hidden="true"></i>{{ serverError() }}
              </div>
            }
            <div class="mb-3">
              <label for="c-name" class="form-label">Name <span class="text-danger">*</span></label>
              <input id="c-name" type="text" class="form-control" formControlName="name" [class.is-invalid]="invalidName()" />
              <div class="invalid-feedback">
                @if (form.controls.name.hasError('required')) { Category name is required. } @else { Maximum 60 characters. }
              </div>
              @if (category && category.productCount) {
                <div class="form-text">Renaming also updates its {{ category.productCount }} product(s).</div>
              }
            </div>
            <div class="mb-3">
              <label for="c-desc" class="form-label">Description</label>
              <textarea id="c-desc" rows="2" class="form-control" formControlName="description"
                        [class.is-invalid]="form.controls.description.invalid"></textarea>
              <div class="invalid-feedback">Maximum 200 characters.</div>
            </div>
            <div class="form-check form-switch">
              <input id="c-active" type="checkbox" class="form-check-input" role="switch" formControlName="isActive" />
              <label for="c-active" class="form-check-label">Active</label>
            </div>
          </div>
          <div class="modal-footer">
            <button type="button" class="btn btn-light" (click)="cancel()" [disabled]="saving()">Cancel</button>
            <button type="submit" class="btn btn-primary" [disabled]="saving()">
              @if (saving()) { <span class="spinner-border spinner-border-sm me-1" aria-hidden="true"></span> }
              {{ category ? 'Save changes' : 'Add category' }}
            </button>
          </div>
        </form>
      </div>
    </div>
  `,
})
export class CategoryFormComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly categoryService = inject(CategoryService);
  private readonly notify = inject(NotificationService);

  @Input() category: Category | null = null;
  @Output() saved = new EventEmitter<Category>();
  @Output() cancelled = new EventEmitter<void>();

  readonly saving = signal(false);
  readonly serverError = signal<string | null>(null);

  readonly form = this.fb.nonNullable.group({
    name: ['', [Validators.required, Validators.maxLength(60)]],
    description: ['', Validators.maxLength(200)],
    isActive: [true],
  });

  ngOnInit(): void {
    if (this.category) this.form.patchValue(this.category);
  }

  submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const v = this.form.getRawValue();
    const payload = { ...v, name: v.name.trim(), description: v.description.trim() };
    const request$ = this.category
      ? this.categoryService.updateCategory(this.category._id, payload)
      : this.categoryService.createCategory(payload);

    this.saving.set(true);
    this.serverError.set(null);
    request$.subscribe({
      next: (c) => {
        this.saving.set(false);
        this.notify.success(this.category ? `${c.name} updated` : `${c.name} added`);
        this.saved.emit(c);
      },
      error: (err) => {
        this.saving.set(false);
        this.serverError.set(getErrorMessage(err, 'Failed to save the category.'));
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

  invalidName(): boolean {
    const c = this.form.controls.name;
    return c.invalid && (c.touched || c.dirty);
  }
}
