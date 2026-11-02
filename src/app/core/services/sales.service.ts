import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, Subject, map, tap } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ApiResponse, PaginatedResponse, Sale, SalePayload, SalesQuery } from '../models/sales.models';

@Injectable({ providedIn: 'root' })
export class SalesService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/sales`;
  private readonly changedSubject = new Subject<void>();

  /** Emits after any successful create, update or delete so views can refresh. */
  readonly changed$ = this.changedSubject.asObservable();

  getSales(query: SalesQuery): Observable<PaginatedResponse<Sale>> {
    let params = new HttpParams();
    Object.entries(query).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        params = params.set(key, String(value));
      }
    });
    return this.http.get<PaginatedResponse<Sale>>(this.baseUrl, { params });
  }

  getSale(id: string): Observable<Sale> {
    return this.http.get<ApiResponse<Sale>>(`${this.baseUrl}/${id}`).pipe(map((res) => res.data));
  }

  createSale(payload: SalePayload): Observable<ApiResponse<Sale>> {
    return this.http.post<ApiResponse<Sale>>(this.baseUrl, payload).pipe(tap(() => this.changedSubject.next()));
  }

  updateSale(id: string, payload: SalePayload): Observable<ApiResponse<Sale>> {
    return this.http
      .put<ApiResponse<Sale>>(`${this.baseUrl}/${id}`, payload)
      .pipe(tap(() => this.changedSubject.next()));
  }

  deleteSale(id: string): Observable<ApiResponse<{ _id: string }>> {
    return this.http
      .delete<ApiResponse<{ _id: string }>>(`${this.baseUrl}/${id}`)
      .pipe(tap(() => this.changedSubject.next()));
  }
}
