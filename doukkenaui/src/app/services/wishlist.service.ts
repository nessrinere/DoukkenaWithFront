import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, forkJoin, Observable } from 'rxjs';
import { tap, catchError } from 'rxjs/operators';
import { of } from 'rxjs';

export interface WishlistItem {
  Id: number;
  Name: string;
  Price: number;
  ShortDescription?: string;
  FullDescription?: string;
  CreatedOnUtc?: string;
  UpdatedOnUtc?: string;
  Published?: boolean;
  PictureId?: number;
  SeoFilename?: string;
  MimeType?: string;
  Quantity: number;
}

@Injectable({
  providedIn: 'root'
})
export class WishlistService {
  private apiUrl = 'https://localhost:59579/api/wishlist';
  private wishlistItemsSubject = new BehaviorSubject<WishlistItem[]>([]);
  public wishlistItems$ = this.wishlistItemsSubject.asObservable();
  
  private _totalItems = 0;
  private _subtotal = 0;
  
  constructor(private http: HttpClient) {
    this.loadWishlistItems();
  }
  
  get totalItems(): number {
    return this._totalItems;
  }
  
  get subtotal(): number {
    return this._subtotal;
  }
  
  private getCustomerId(): number | null {
    const customerData = localStorage.getItem('customer');
    if (customerData) {
      try {
        const customer = JSON.parse(customerData);
        return customer.id;
      } catch (e) {
        console.error('Error parsing customer data:', e);
      }
    }
    return null;
  }
  
  loadWishlistItems(): void {
    const customerId = this.getCustomerId();
    if (!customerId) {
      this.wishlistItemsSubject.next([]);
      return;
    }
    
    this.http.get<WishlistItem[]>(`${this.apiUrl}/${customerId}`)
      .pipe(
        catchError(error => {
          console.error('Error loading wishlist:', error);
          return of([]);
        })
      )
      .subscribe(items => {
        this.wishlistItemsSubject.next(items);
        this.calculateSummary(items);
      });
  }
  
  private calculateSummary(items: WishlistItem[]): void {
    this._totalItems = items.reduce((total, item) => total + (item.Quantity || 1), 0);
    this._subtotal = items.reduce((sum, item) => sum + (item.Price * (item.Quantity || 1)), 0);
  }
  
  addToWishlist(productId: number, quantity: number = 1): Observable<any> {
    const customerId = this.getCustomerId();
    if (!customerId) {
      throw new Error('User not logged in');
    }
    
    const wishlistItem = {
      CustomerId: customerId,
      ProductId: productId,
      Quantity: quantity
    };
    
    return this.http.post(`${this.apiUrl}/add`, wishlistItem)
      .pipe(
        tap(() => {
          this.loadWishlistItems(); // Reload items after adding
        }),
        catchError(error => {
          console.error('Error adding to wishlist:', error);
          throw error;
        })
      );
  }
  
  removeFromWishlist(itemId: number): Observable<any> {
    const customerId = this.getCustomerId();
    console.log('=== WishlistService.removeFromWishlist ===');
    console.log('customerId:', customerId);
    console.log('productId:', itemId);
    
    if (!customerId) {
      console.log('ERROR: No customer ID in service');
      throw new Error('User not logged in');
    }

    const url = `${this.apiUrl}/remove-by-id/${itemId}?customerId=${customerId}`;
    console.log('API URL:', url);
    
    return this.http.delete(url)
      .pipe(
        tap((response: any) => {
          console.log('API Response:', response);
          // Update local items without making another API call
          const currentItems = this.wishlistItemsSubject.getValue();
          console.log('Current items before filter:', currentItems.map(i => i.Id));
          // Fix: Use itemId instead of undefined productId
          const updatedItems = currentItems.filter(item => item.Id !== itemId);
          console.log('Updated items after filter:', updatedItems.map(i => i.Id));
          this.wishlistItemsSubject.next(updatedItems);
          this.calculateSummary(updatedItems);
        }),
        catchError(error => {
          console.error('API Error in service:', error);
          // For 404 errors, the item might already be removed, so update the UI anyway
          if (error.status === 404) {
            console.log('Item not found in backend, removing from frontend');
            const currentItems = this.wishlistItemsSubject.getValue();
            const updatedItems = currentItems.filter(item => item.Id !== itemId);
            this.wishlistItemsSubject.next(updatedItems);
            this.calculateSummary(updatedItems);
            // Return a success response since the item is effectively removed
            return of({ message: 'Item was already removed' });
          }
          throw error;
        })
      );
  }
  
  clearWishlist(): Observable<any> {
    const customerId = this.getCustomerId();
    if (!customerId) {
      throw new Error('User not logged in');
    }
    
    return this.http.delete(`${this.apiUrl}/clear?customerId=${customerId}`)
      .pipe(
        tap((response: any) => {
          console.log('Clear response:', response);
          this.wishlistItemsSubject.next([]);
          this._totalItems = 0;
          this._subtotal = 0;
        }),
        catchError(error => {
          console.error('Error clearing wishlist:', error);
          throw error;
        })
      );
  }
  
  moveToCart(item: WishlistItem): Observable<any> {
    const customerId = this.getCustomerId();
    if (!customerId) {
      throw new Error('User not logged in');
    }
    
    const cartItem = {
      customerId: customerId,
      productId: item.Id,
      quantity: item.Quantity || 1
    };
    
    return this.http.post('https://localhost:59579/api/cart/add', cartItem)
      .pipe(
        tap(() => {
          // After successfully adding to cart, remove from wishlist
          this.removeFromWishlist(item.Id).subscribe();
        }),
        catchError(error => {
          console.error('Error moving to cart:', error);
          throw error;
        })
      );
  }
  
  moveAllToCart(): Observable<any[]> {
    const currentItems = this.wishlistItemsSubject.getValue();
    const moveOperations = currentItems.map(item => this.moveToCart(item));
    
    // Return all operations as an array of observables
    return forkJoin(moveOperations);
  }
  
  isInWishlist(productId: number): boolean {
    const items = this.wishlistItemsSubject.getValue();
    return items.some(item => item.Id === productId);
  }
  
  getWishlistCount(): number {
    return this.wishlistItemsSubject.getValue().length;
  }
}