import { CurrencyPipe, DatePipe } from '@angular/common';
import { Component, ElementRef, EventEmitter, HostListener, OnInit, Output, ViewChild, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, NavigationEnd, Router, RouterLink } from '@angular/router';
import { filter, map, startWith } from 'rxjs';
import { Product } from '../core/models/sales.models';
import { AnalyticsService } from '../core/services/analytics.service';
import { ProductService } from '../core/services/product.service';
import { SettingsService } from '../core/services/settings.service';
import { ClickOutsideDirective } from '../shared/directives/click-outside.directive';
import { DateRangePickerComponent } from './date-range-picker.component';

interface RouteMeta {
  section?: string;
  heading?: string;
  range?: boolean;
}

const LOW_STOCK = 10;

@Component({
  selector: 'app-topbar',
  standalone: true,
  imports: [FormsModule, RouterLink, CurrencyPipe, DatePipe, ClickOutsideDirective, DateRangePickerComponent],
  templateUrl: './topbar.component.html',
  styleUrl: './topbar.component.css',
})
export class TopbarComponent implements OnInit {
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly productService = inject(ProductService);
  readonly analytics = inject(AnalyticsService);
  readonly settings = inject(SettingsService);

  @Output() menuToggle = new EventEmitter<void>();
  @ViewChild('searchInput') private searchInput?: ElementRef<HTMLInputElement>;

  readonly meta = toSignal(
    this.router.events.pipe(
      filter((e) => e instanceof NavigationEnd),
      startWith(null),
      map(() => {
        let r = this.route;
        while (r.firstChild) r = r.firstChild;
        return r.snapshot.data as RouteMeta;
      })
    ),
    { initialValue: {} as RouteMeta }
  );

  readonly openMenu = signal<'notifications' | 'profile' | null>(null);
  readonly products = signal<Product[]>([]);
  searchTerm = '';

  readonly pendingSales = computed(() =>
    this.analytics.sales().filter((s) => s.status === 'Pending').sort((a, b) => b.saleDate.localeCompare(a.saleDate))
  );
  readonly lowStock = computed(() =>
    this.products().filter((p) => p.isActive && p.stock <= LOW_STOCK).sort((a, b) => a.stock - b.stock)
  );
  readonly notificationCount = computed(() => (this.pendingSales().length ? 1 : 0) + this.lowStock().length);

  ngOnInit(): void {
    this.analytics.ensureLoaded();
    this.productService.getProducts().subscribe({ next: (p) => this.products.set(p), error: () => undefined });
  }

  toggleMenu(menu: 'notifications' | 'profile'): void {
    this.openMenu.update((current) => (current === menu ? null : menu));
  }

  closeMenu(menu: 'notifications' | 'profile'): void {
    if (this.openMenu() === menu) this.openMenu.set(null);
  }

  search(): void {
    const term = this.searchTerm.trim();
    this.router.navigate(['/sales'], { queryParams: term ? { search: term } : {} });
    this.searchInput?.nativeElement.blur();
  }

  /** Ctrl/⌘+K or "/" focuses the global search. */
  @HostListener('document:keydown', ['$event'])
  onKeydown(e: KeyboardEvent): void {
    const target = e.target as HTMLElement | null;
    const typing = !!target && (['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName) || target.isContentEditable);
    if ((e.key === 'k' && (e.ctrlKey || e.metaKey)) || (e.key === '/' && !typing)) {
      e.preventDefault();
      this.searchInput?.nativeElement.focus();
    }
  }
}
