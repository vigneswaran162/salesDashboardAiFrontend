import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ApiResponse, Category } from '../models/sales.models';

export type CategoryPayload = Pick<Category, 'name'> & Partial<Pick<Category, 'description' | 'isActive'>>;

@Injectable({ providedIn: 'root' })
export class CategoryService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/categories`;

  /** Active categories (or all, with includeInactive), sorted by name. */
  getCategories(includeInactive = false): Observable<Category[]> {
    const options = includeInactive ? { params: { includeInactive: 'true' } } : {};
    return this.http.get<ApiResponse<Category[]>>(this.baseUrl, options).pipe(map((res) => res.data));
  }

  createCategory(payload: CategoryPayload): Observable<Category> {
    return this.http.post<ApiResponse<Category>>(this.baseUrl, payload).pipe(map((res) => res.data));
  }

  updateCategory(id: string, payload: Partial<CategoryPayload>): Observable<Category> {
    return this.http.put<ApiResponse<Category>>(`${this.baseUrl}/${id}`, payload).pipe(map((res) => res.data));
  }

  deleteCategory(id: string): Observable<ApiResponse<{ _id: string }>> {
    return this.http.delete<ApiResponse<{ _id: string }>>(`${this.baseUrl}/${id}`);
  }
}
