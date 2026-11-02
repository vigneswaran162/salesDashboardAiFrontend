import { Component, HostListener, computed, inject, signal } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { SettingsService } from './core/services/settings.service';
import { TopbarComponent } from './layout/topbar.component';
import { NotificationComponent } from './shared/components/notification/notification.component';

interface NavItem {
  path: string;
  label: string;
  icon: string;
  /** Not available yet: rendered disabled with a "Soon" tag. */
  soon?: boolean;
}

interface NavGroup {
  label: string;
  items: NavItem[];
}

const MOBILE_QUERY = '(max-width: 991.98px)';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive, NotificationComponent, TopbarComponent],
  templateUrl: './app.component.html',
  styleUrl: './app.component.css',
})
export class AppComponent {
  private readonly settings = inject(SettingsService);

  readonly navGroups: NavGroup[] = [
    {
      label: 'Overview',
      items: [
        { path: '/dashboard', label: 'Dashboard', icon: 'bi-grid-1x2' },
        { path: '/analytics', label: 'Sales Analytics', icon: 'bi-graph-up-arrow' },
      ],
    },
    {
      label: 'Manage',
      items: [
        { path: '/sales', label: 'Sales', icon: 'bi-receipt' },
        { path: '/products', label: 'Products', icon: 'bi-box-seam' },
        { path: '/categories', label: 'Categories', icon: 'bi-tags' },
        { path: '/customers', label: 'Customers', icon: 'bi-people' },
      ],
    },
    {
      label: 'Insights',
      items: [
        { path: '/reports', label: 'Reports', icon: 'bi-file-earmark-bar-graph' },
        { path: '/expenses', label: 'Expenses', icon: 'bi-wallet2', soon: true },
      ],
    },
  ];

  /** Off-canvas visibility on small screens. */
  readonly mobileOpen = signal(false);
  readonly isMobile = signal(window.matchMedia(MOBILE_QUERY).matches);
  /** Icon-rail mode on desktop. */
  readonly collapsed = computed(() => this.settings.sidebarCollapsed() && !this.isMobile());

  constructor() {
    window.matchMedia(MOBILE_QUERY).addEventListener('change', (e) => {
      this.isMobile.set(e.matches);
      if (!e.matches) this.mobileOpen.set(false);
    });
  }

  toggleSidebar(): void {
    if (this.isMobile()) this.mobileOpen.update((open) => !open);
    else this.settings.sidebarCollapsed.update((c) => !c);
  }

  closeMobile(): void {
    this.mobileOpen.set(false);
  }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    this.closeMobile();
  }
}
