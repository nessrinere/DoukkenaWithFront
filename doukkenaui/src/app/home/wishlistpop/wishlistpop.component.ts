import { Component, OnInit, OnDestroy, Input, Output, EventEmitter } from '@angular/core';
import { Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { Subscription, forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { WishlistService, WishlistItem } from '../../services/wishlist.service';

@Component({
  selector: 'app-wishlistpop',
  templateUrl: './wishlistpop.component.html',
  styleUrls: ['./wishlistpop.component.css']
})
export class WishlistpopComponent implements OnInit, OnDestroy {
  @Input() customerId: number | null = null;
  @Output() itemRemoved = new EventEmitter<void>();
  @Output() itemAddedToCart = new EventEmitter<void>();
  @Output() wishlistToggled = new EventEmitter<boolean>();
  
  wishlistItems: any[] = [];  // Changed from 'any' to 'any[]' for consistency
  isLoading: boolean = false;
  errorMessage: string | null = null;
  isWishlistOpen: boolean = false;
  totalItems: number = 0;
  subtotal: number = 0;
  isLoggedIn: boolean = false;
  isRemoving: boolean = false;
  private wishlistSubscription?: Subscription;
  
  constructor(
    private wishlistService: WishlistService,
    private router: Router,
    private https: HttpClient
  ) { }

  ngOnInit(): void {
    this.initializeComponent();
  }

  ngOnDestroy(): void {
    this.cleanup();
  }

  private initializeComponent(): void {
    this.loadCustomerId();
    this.checkLoginStatus();
    this.subscribeToWishlist();
    this.isWishlistOpen = true;
    
    if (this.isLoggedIn && this.customerId) {
      this.loadWishlistItems();
    }
    // Remove this line as wishlistItems1 is no longer needed
    
  }

  private cleanup(): void {
    if (this.wishlistSubscription) {
      this.wishlistSubscription.unsubscribe();
    }
  }

  private subscribeToWishlist(): void {
    this.wishlistSubscription = this.wishlistService.wishlistItems$.subscribe({
      next: (items) => {
        this.totalItems = this.wishlistService.totalItems;
        this.subtotal = this.wishlistService.subtotal;
        
        // Load product pictures for wishlist items
        if (items.length > 0) {
          this.loadProductPictures(items);
        } else {
          this.wishlistItems = [];
          this.isLoading = false;
        }
      },
      error: (error) => {
        console.error('Error in wishlist subscription:', error);
        this.errorMessage = 'Failed to load wishlist items.';
        this.isLoading = false;
      }
    });
  }

  private loadProductPictures(items: WishlistItem[]): void {
    const pictureRequests = items.map(item => {
      // Use item.ProductId (not item.Id) as that's the actual product ID
      const productId = item.ProductId || item.Id;
      
      if (!productId) {
        return of({ PictureId: 0, SeoFilename: 'default', MimeType: 'image/jpeg' });
      }
      
      return this.https.get<any>(`https://localhost:59579/api/pictures/by-product/${productId}`).pipe(
        catchError(err => {
          console.error(`Failed to load picture for product ${productId}:`, err);
          return of({ PictureId: 0, SeoFilename: 'default', MimeType: 'image/jpeg' });
        })
      );
    });

    forkJoin(pictureRequests).subscribe({
      next: (pictures) => {
        // Combine wishlist items with their picture information and assign to main wishlistItems
        this.wishlistItems = items.map((item, index) => {
          const pic = pictures[index];
          
          return {
            ...item,
            PictureId: pic?.PictureId ?? 0,
            SeoFilename: pic?.SeoFilename ?? 'default',
            MimeType: pic?.MimeType ?? 'image/jpeg'
          };
        });
        
        this.isLoading = false;
      },
      error: (err) => {
        console.error('Error loading pictures:', err);
        // Keep original items without picture updates
        this.wishlistItems = items.map(item => ({
          ...item,
          PictureId: 0,
          SeoFilename: 'default',
          MimeType: 'image/jpeg'
        }));
        this.isLoading = false;
      }
    });
  }

  private checkLoginStatus(): void {
    const customerData = localStorage.getItem('customer');
    this.isLoggedIn = !!customerData;
    
    if (!this.isLoggedIn) {
      this.customerId = null;
      this.wishlistItems = [];
      this.totalItems = 0;
      this.subtotal = 0;
    }
  }

  loadCustomerId(): void {
    if (this.customerId === null) {
      const customerData = localStorage.getItem('customer');
      if (customerData) {
        try {
          const customer = JSON.parse(customerData);
          this.customerId = customer.id;
          this.isLoggedIn = true;
        } catch (e) {
          console.error('Error parsing customer data:', e);
          this.isLoggedIn = false;
          this.customerId = null;
        }
      } else {
        this.isLoggedIn = false;
        this.customerId = null;
      }
    }
  }

  toggleWishlist(): void {
    this.isWishlistOpen = !this.isWishlistOpen;
    this.wishlistToggled.emit(this.isWishlistOpen);
    
    if (this.isWishlistOpen) {
      this.checkLoginStatus();
      if (this.isLoggedIn && this.customerId) {
        this.loadWishlistItems();
      }
    }
  }

  closeWishlist(): void {
    this.isWishlistOpen = false;
    this.wishlistToggled.emit(false);
    this.clearMessages();
  }

  loadWishlistItems(): void {
    if (!this.customerId) {
      this.errorMessage = 'Please login to view your wishlist';
      return;
    }

    this.isLoading = true;
    this.errorMessage = null;
    this.wishlistService.loadWishlistItems();
  }

  addToCart(item: WishlistItem): void {
    if (!this.customerId) {
      this.errorMessage = 'Please login to add items to cart';
      return;
    }
    
    this.clearMessages();
    this.isLoading = true;
    
    this.wishlistService.moveToCart(item).subscribe({
      next: () => {
        this.showSuccessMessage('success-message');
        this.itemAddedToCart.emit();
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Error adding item to cart:', error);
        this.errorMessage = 'Failed to add item to cart. Please try again.';
        this.isLoading = false;
      }
    });
  }

  removeFromWishlist(itemId: number): void {
    console.log('=== DEBUG: removeFromWishlist called ===');
    console.log('productId:', itemId);
    console.log('customerId:', this.customerId);
    console.log('isRemoving:', this.isRemoving);

    if (!this.customerId) {
      console.log('ERROR: No customer ID');
      this.errorMessage = 'Please login to remove items from wishlist';
      return;
    }

    if (this.isRemoving) {
      console.log('ERROR: Already removing an item');
      return;
    }

    // Temporarily remove confirmation for debugging
    // if (!confirm('Are you sure you want to remove this item from your wishlist?')) {
    //   return;
    // }

    this.isRemoving = true;
    this.clearMessages();

    console.log('Making API call to remove item...');
    
    this.wishlistService.removeFromWishlist(itemId).subscribe({
      next: (response) => {
        console.log('SUCCESS: Item removed successfully', response);
        this.showSuccessMessage('success-remove-message');
        this.itemRemoved.emit();
        this.isRemoving = false;
        // Force reload the wishlist to ensure UI is updated
        setTimeout(() => {
          this.loadWishlistItems();
        }, 500);
      },
      error: (error) => {
        console.error('ERROR: Failed to remove item', error);
        console.error('Error details:', {
          status: error.status,
          statusText: error.statusText,
          message: error.message,
          error: error.error
        });
        
        let errorMsg = 'Failed to remove item from wishlist.';
        if (error.status === 404) {
          errorMsg = 'Item not found in wishlist.';
        } else if (error.status === 401) {
          errorMsg = 'Please login to remove items from wishlist.';
        } else if (error.status === 500) {
          errorMsg = 'Server error. Please try again later.';
        } else if (error.status === 0) {
          errorMsg = 'Network error. Please check your connection.';
        }
        
        this.errorMessage = errorMsg;
        this.isRemoving = false;
      }
    });
  }

  clearWishlist(): void {
    if (!this.customerId || this.isLoading) return;

    if (!confirm('Are you sure you want to clear your entire wishlist?')) {
      return;
    }

    this.isLoading = true;
    this.clearMessages();

    this.wishlistService.clearWishlist().subscribe({
      next: () => {
        this.showSuccessMessage('success-clear-message');
        this.itemRemoved.emit();
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Error clearing wishlist:', error);
        this.errorMessage = 'Failed to clear wishlist. Please try again.';
        this.isLoading = false;
      }
    });
  }

  addAllToCart(): void {
    if (!this.customerId || this.wishlistItems.length === 0 || this.isLoading) return;

    if (!confirm(`Add all ${this.wishlistItems.length} items to your cart?`)) {
      return;
    }

    this.isLoading = true;
    this.clearMessages();
    
    this.wishlistService.moveAllToCart().subscribe({
      next: () => {
        this.showSuccessMessage('success-all-message');
        this.itemAddedToCart.emit();
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Error adding items to cart:', error);
        this.errorMessage = 'Failed to add all items to cart. Please try again.';
        this.isLoading = false;
      }
    });
  }

  navigateToLogin(): void {
    this.closeWishlist();
    this.router.navigate(['/login']);
  }

  navigateToWishlist(): void {
    this.closeWishlist();
    this.router.navigate(['/wishlist']);
  }

  navigateToProduct(productId: number): void {
    this.closeWishlist();
    this.router.navigate(['/product/product', productId]);
  }

  private showSuccessMessage(messageId: string): void {
    const successMessage = document.getElementById(messageId);
    if (successMessage) {
      successMessage.style.display = 'block';
      setTimeout(() => {
        if (successMessage) {
          successMessage.style.display = 'none';
        }
      }, 3000);
    }
  }

  private clearMessages(): void {
    this.errorMessage = null;
    // Hide all success messages
    const successMessages = ['success-message', 'success-all-message', 'success-remove-message', 'success-clear-message'];
    successMessages.forEach(id => {
      const element = document.getElementById(id);
      if (element) {
        element.style.display = 'none';
      }
    });
  }

  getImageUrl(item: WishlistItem): string {
    // Use the loaded picture information from loadProductPictures
    const paddedId = ('0000000' + (item.PictureId || 0)).slice(-7);
    const seoFilename = item.SeoFilename || 'default';
    const extension = this.getImageExtension(item.MimeType || 'image/jpeg');
    return `https://localhost:59579/images/thumbs/${paddedId}_${seoFilename}${extension}`;
  }

  private getImageExtension(mimeType: string): string {
    if (!mimeType) return '.jpeg';
    
    switch (mimeType.toLowerCase()) {
      case 'image/jpeg':
      case 'image/jpg':
        return '.jpeg';
      case 'image/png':
        return '.png';
      case 'image/webp':
        return '.webp';
      case 'image/gif':
        return '.gif';
      default:
        return '.jpeg';
    }
  }
  
  handleImageError(event: any): void {
    if (event?.target) {
      event.target.src = 'assets/placeholder.png';
    }
  }

  getFormattedPrice(price: number): string {
    return (price || 0).toFixed(2);
  }

  trackByItemId(index: number, item: WishlistItem): number {
    return item.Id;
  }

  // Utility method to check if an item is being processed
  isItemBeingProcessed(): boolean {
    return this.isLoading || this.isRemoving;
  }
}
