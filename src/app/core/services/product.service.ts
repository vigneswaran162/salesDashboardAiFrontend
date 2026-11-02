import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ApiResponse, Product } from '../models/sales.models';

export type ProductPayload = Pick<Product, 'name' | 'category' | 'price'> & Partial<Pick<Product, 'stock' | 'isActive'>>;

@Injectable({ providedIn: 'root' })
export class ProductService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/products`;

  /** Active products (or all, with includeInactive), sorted by name. */
  getProducts(includeInactive = false): Observable<Product[]> {
    const options = includeInactive ? { params: { includeInactive: 'true' } } : {};
    return this.http.get<ApiResponse<Product[]>>(this.baseUrl, options).pipe(map((res) => res.data));
  }

  createProduct(payload: ProductPayload): Observable<Product> {
    return this.http.post<ApiResponse<Product>>(this.baseUrl, payload).pipe(map((res) => res.data));
  }

  updateProduct(id: string, payload: Partial<ProductPayload>): Observable<Product> {
    return this.http.put<ApiResponse<Product>>(`${this.baseUrl}/${id}`, payload).pipe(map((res) => res.data));
  }

  deleteProduct(id: string): Observable<ApiResponse<Product | { _id: string }>> {
    return this.http.delete<ApiResponse<Product | { _id: string }>>(`${this.baseUrl}/${id}`);
  }
}
