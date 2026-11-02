import { Routes } from '@angular/router';

/**
 * Route `data`:
 *  - section: breadcrumb parent
 *  - heading: breadcrumb leaf
 *  - range:   show the global date-range picker in the top bar
 */
export const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'dashboard' },
  {
    path: 'dashboard',
    title: 'Dashboard | SalesDesk',
    data: { section: 'Overview', heading: 'Dashboard', range: true },
    loadComponent: () => import('./features/dashboard/dashboard.component').then((m) => m.DashboardComponent),
  },
  {
    path: 'analytics',
    title: 'Sales Analytics | SalesDesk',
    data: { section: 'Overview', heading: 'Sales Analytics', range: true },
    loadComponent: () => import('./features/analytics/analytics.component').then((m) => m.AnalyticsComponent),
  },
  {
    path: 'sales',
    title: 'Sales Management | SalesDesk',
    data: { section: 'Manage', heading: 'Sales' },
    loadComponent: () => import('./features/sales/sales.component').then((m) => m.SalesComponent),
  },
  {
    path: 'products',
    title: 'Products | SalesDesk',
    data: { section: 'Manage', heading: 'Products', range: true },
    loadComponent: () => import('./features/products/products.component').then((m) => m.ProductsComponent),
  },
  {
    path: 'categories',
    title: 'Categories | SalesDesk',
    data: { section: 'Manage', heading: 'Categories', range: true },
    loadComponent: () => import('./features/categories/categories.component').then((m) => m.CategoriesComponent),
  },
  {
    path: 'customers',
    title: 'Customers | SalesDesk',
    data: { section: 'Manage', heading: 'Customers', range: true },
    loadComponent: () => import('./features/customers/customers.component').then((m) => m.CustomersComponent),
  },
  {
    path: 'reports',
    title: 'Reports | SalesDesk',
    data: { section: 'Insights', heading: 'Reports', range: true },
    loadComponent: () => import('./features/reports/reports.component').then((m) => m.ReportsComponent),
  },
  {
    path: 'settings',
    title: 'Settings | SalesDesk',
    data: { section: 'Workspace', heading: 'Settings' },
    loadComponent: () => import('./features/settings/settings.component').then((m) => m.SettingsComponent),
  },
  { path: '**', redirectTo: 'dashboard' },
];
