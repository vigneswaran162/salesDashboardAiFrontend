import { Component, EventEmitter, Input, Output } from '@angular/core';

/** Table footer: "Showing x–y of n", rows-per-page select and page buttons. */
@Component({
  selector: 'app-pager',
  standalone: true,
  template: `
    <div class="pager">
      <div class="pager-info">
        <span class="tabular">{{ rangeLabel }}</span>
        <span class="sep" aria-hidden="true"></span>
        <label [for]="id" class="mb-0">Rows per page</label>
        <select [id]="id" class="form-select form-select-sm w-auto" (change)="pageSizeChange.emit(+$any($event.target).value)">
          @for (size of pageSizes; track size) {
            <option [value]="size" [selected]="size === pageSize">{{ size }}</option>
          }
        </select>
      </div>
      <nav [attr.aria-label]="label">
        <ul class="pagination pagination-sm mb-0">
          <li class="page-item" [class.disabled]="page <= 1">
            <button type="button" class="page-link" (click)="go(page - 1)" aria-label="Previous page"><i class="bi bi-chevron-left"></i></button>
          </li>
          @for (p of pageNumbers; track $index) {
            @if (p === 0) {
              <li class="page-item disabled"><span class="page-link">…</span></li>
            } @else {
              <li class="page-item" [class.active]="p === page">
                <button type="button" class="page-link" (click)="go(p)" [attr.aria-current]="p === page ? 'page' : null">{{ p }}</button>
              </li>
            }
          }
          <li class="page-item" [class.disabled]="page >= totalPages">
            <button type="button" class="page-link" (click)="go(page + 1)" aria-label="Next page"><i class="bi bi-chevron-right"></i></button>
          </li>
        </ul>
      </nav>
    </div>
  `,
  styles: [`
    .pager { display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: .75rem; padding: .85rem 1.1rem; border-top: 1px solid var(--sd-border); }
    .pager-info { display: flex; align-items: center; gap: .6rem; font-size: .8rem; color: var(--sd-muted); }
    .sep { width: 1px; height: 16px; background: var(--sd-border); }
  `],
})
export class PagerComponent {
  private static nextId = 0;
  readonly id = `pager-size-${PagerComponent.nextId++}`;

  @Input() page = 1;
  @Input() pageSize = 10;
  @Input() total = 0;
  @Input() pageSizes = [10, 25, 50];
  @Input() label = 'Pagination';
  @Output() pageChange = new EventEmitter<number>();
  @Output() pageSizeChange = new EventEmitter<number>();

  get totalPages(): number {
    return Math.max(1, Math.ceil(this.total / this.pageSize));
  }

  get rangeLabel(): string {
    if (!this.total) return 'No results';
    const from = (this.page - 1) * this.pageSize + 1;
    return `${from}–${Math.min(this.page * this.pageSize, this.total)} of ${this.total}`;
  }

  /** First, last and a window around the current page; 0 marks a gap. */
  get pageNumbers(): number[] {
    const last = this.totalPages;
    if (last <= 7) return Array.from({ length: last }, (_, i) => i + 1);
    const start = Math.max(2, this.page - 1);
    const end = Math.min(last - 1, this.page + 1);
    const pages = [1];
    if (start > 2) pages.push(0);
    for (let p = start; p <= end; p++) pages.push(p);
    if (end < last - 1) pages.push(0);
    pages.push(last);
    return pages;
  }

  go(page: number): void {
    const target = Math.min(Math.max(page, 1), this.totalPages);
    if (target !== this.page) this.pageChange.emit(target);
  }
}
