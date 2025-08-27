import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class WishlistService {
  private apiUrl = 'https://localhost:59579/api/wishlist';

  constructor(private http: HttpClient) {}

  addToWishlist(customerId: number, productId: number, quantity: number = 1): Observable<any> {
    const body = { customerId, productId, quantity };
    return this.http.post(`${this.apiUrl}/add`, body);
  }

  removeFromWishlist(customerId: number, productId: number): Observable<any> {
    const body = { customerId, productId };
    return this.http.post(`${this.apiUrl}/remove`, body);
  }

  getWishlist(customerId: number): Observable<any> {
    return this.http.get(`${this.apiUrl}/${customerId}`);
  }

  isProductInWishlist(customerId: number, productId: number): Observable<boolean> {
    return this.http.get<boolean>(`${this.apiUrl}/check/${customerId}/${productId}`);
  }
}