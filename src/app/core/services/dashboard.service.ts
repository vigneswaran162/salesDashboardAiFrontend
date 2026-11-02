import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  ApiResponse,
  CategorySales,
  DashboardSummary,
  MonthlySales,
  PaymentSummary,
  RecentSale,
} from '../models/sales.models';

@Injectable({ providedIn: 'root' })
export class DashboardService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/dashboard`;

  private get<T>(path: string): Observable<T> {
    return this.http.get<ApiResponse<T>>(`${this.baseUrl}/${path}`).pipe(map((res) => res.data));
  }

  getSummary(): Observable<DashboardSummary> {
    return this.get<DashboardSummary>('summary');
  }

  getMonthlySales(): Observable<MonthlySales[]> {
    return this.get<MonthlySales[]>('monthly-sales');
  }

  getCategorySales(): Observable<CategorySales[]> {
    return this.get<CategorySales[]>('category-sales');
  }

  getPaymentSummary(): Observable<PaymentSummary[]> {
    return this.get<PaymentSummary[]>('payment-summary');
  }

  getRecentSales(): Observable<RecentSale[]> {
    return this.get<RecentSale[]>('recent-sales');
  }
}
