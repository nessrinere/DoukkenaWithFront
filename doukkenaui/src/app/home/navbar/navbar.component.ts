import { Component, EventEmitter, OnInit, OnDestroy, Output, ViewChild, HostListener } from '@angular/core';
import { CartpopComponent } from '../cartpop/cartpop.component';
import { WishlistpopComponent } from '../wishlistpop/wishlistpop.component';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { Subscription, catchError, forkJoin, of } from 'rxjs';
import { WishlistService } from '../../services/wishlist.service';
import { AlgoliaService } from './algolia.service';

export interface WishlistItem {
  customerId: number;
  productId: number;
  quantity: number;
}

@Component({
  selector: 'app-navbar',
  templateUrl: './navbar.component.html',
  styleUrls: ['./navbar.component.css']
})
export class NavbarComponent implements OnInit, OnDestroy {
  @ViewChild('cartPopup') cartPopup!: CartpopComponent;
  @ViewChild('wishlistPopup') wishlistPopup!: WishlistpopComponent;
  @Output() searchEvent = new EventEmitter<string>();
  @Output() categorySelected = new EventEmitter<number>();
  @Output() showAllProductsEvent = new EventEmitter<void>();
  
  // Existing properties
  searchTerm: string = '';
  categories: any[] = [];
  showCategoriesDropdown: boolean = false;
  isLoggedIn: boolean = false;
  showLogin: boolean = false;
  products: any[] = [];
  
  // Wishlist properties
  wishlistItemsCount: number = 0;
  showWishlist: boolean = false;
  customerId: number | null = null;
  wishlistItems: any[] = [];
  
  // Cart properties
  cartItemsCount: number = 0;
  showCart: boolean = false;
  
  // Product ratings
  productRatings: { [key: number]: { rating: number; total: number } } = {};
  
  // API URLs
  private apiUrlone = 'https://localhost:59579/api/products/search';
  private wishlistApiUrl = 'https://localhost:59579/api/wishlist';
  suggestions: any;

  // Subscriptions
  private wishlistSubscription?: Subscription;

  constructor(
    private https: HttpClient,
    private router: Router,
    private wishlistService: WishlistService,
    private algoliaService: AlgoliaService
  ) {}

  ngOnInit(): void {
    this.loadCategories();
    this.checkLoginStatus();
    this.subscribeToWishlistChanges();
    
    // Listen for cart update events
    this.setupCartUpdateListener();
  }

  ngOnDestroy(): void {
    if (this.wishlistSubscription) {
      this.wishlistSubscription.unsubscribe();
    }
    
    // Remove cart update listener
    window.removeEventListener('cartUpdated', this.handleCartUpdate.bind(this));
  }

  private subscribeToWishlistChanges(): void {
    this.wishlistSubscription = this.wishlistService.wishlistItems$.subscribe(
      items => {
        this.wishlistItems = items;
        this.wishlistItemsCount = items.length;
      }
    );
  }
  
  async onInputChange(query: string) {
    if (query && query.length > 0) {
      console.log('Search suggestions algolia:', this.suggestions);
      this.suggestions = await this.algoliaService.getSearchSuggestions(query);
      this.suggestions.forEach((item: any, index: any) => {
          console.log(item);
        });
    } else {
      this.suggestions = [];
    }
    //console.log('Search suggestions:', this.suggestions);
  }

  loadCategories() {
    // Try the homeV endpoint first
    this.https.get<any[]>(`https://localhost:59579/api/categories/homeV`).subscribe({
      next: (data) => {
        console.log('Categories loaded:', data);
        this.categories = data;
        if (data && data.length > 0) {
          console.log('Sample category structure:', data[0]);
        }
      },
      error: (err) => {
        console.error('Failed to load categories from homeV:', err);
        // Fallback to the simple categories endpoint
        this.https.get<any[]>(`https://localhost:59579/api/categories`).subscribe({
          next: (data) => {
            console.log('Categories loaded from fallback:', data);
            this.categories = data;
          },
          error: (fallbackErr) => {
            console.error('Failed to load categories from fallback:', fallbackErr);
            this.categories = [];
          }
        });
      }
    });
  }

  checkLoginStatus() {
    const customer = localStorage.getItem('customer');
    if (customer) {
      try {
        const customerData = JSON.parse(customer);
        if (customerData && customerData.id) {
          this.isLoggedIn = true;
          this.customerId = customerData.id;
          console.log('User is logged in with ID:', this.customerId);
          return;
        }
      } catch (e) {
        console.error('Error parsing customer data from localStorage:', e);
      }
    }
    // If we get here, user is not logged in
    this.isLoggedIn = false;
    this.customerId = null;
    this.wishlistItemsCount = 0;
    this.wishlistItems = [];
    console.log('User is not logged in');
  }

  // Load wishlist items for the customer
  loadWishlistItems(): void {
    if (!this.customerId) return;
    this.wishlistService.loadWishlistItems();
  }

  // Toggle wishlist display
  toggleWishlist(): void {
    if (!this.isLoggedIn || !this.customerId) {
      this.showLogin = true;
      return;
    }
    
    this.showWishlist = !this.showWishlist;
    
    // Close cart if it's open
    if (this.showWishlist && this.showCart) {
      this.showCart = false;
    }
  }

  // Handle wishlist toggle from popup
  onWishlistToggled(isOpen: boolean): void {
    this.showWishlist = isOpen;
  }

  // Handle item removed from wishlist
  onWishlistItemRemoved(): void {
    // The wishlist service will automatically update the count
    // through the subscription, so no additional action needed
    console.log('Item removed from wishlist');
  }

  // Handle item added to cart from wishlist
  onWishlistItemAddedToCart(): void {
    // Refresh cart count if you have cart service
    console.log('Item moved from wishlist to cart');
    
    // You can emit an event to update cart count
    // this.cartService.loadCartItems();
  }

  // Add product to wishlist
  addToWishlist(productId: number): void {
    if (!this.customerId) {
      this.showLogin = true;
      return;
    }

    this.wishlistService.addToWishlist(productId, 1).subscribe({
      next: (response) => {
        console.log('Product added to wishlist:', response);
        this.showNotification('Product added to wishlist successfully!', 'success');
      },
      error: (error) => {
        console.error('Error adding to wishlist:', error);
        if (error.status === 400) {
          this.showNotification('Product is already in your wishlist!', 'warning');
        } else {
          this.showNotification('Failed to add product to wishlist. Please try again.', 'error');
        }
      }
    });
  }

  // Remove from wishlist
  removeFromWishlist(productId: number): void {
    if (!this.customerId) return;

    this.wishlistService.removeFromWishlist(productId).subscribe({
      next: () => {
        console.log('Product removed from wishlist');
        this.showNotification('Product removed from wishlist', 'success');
      },
      error: (error) => {
        console.error('Error removing from wishlist:', error);
        this.showNotification('Failed to remove product from wishlist', 'error');
      }
    });
  }

  // Check if product is in wishlist
  isInWishlist(productId: number): boolean {
    return this.wishlistService.isInWishlist(productId);
  }

  // Show notification
  private showNotification(message: string, type: 'success' | 'error' | 'warning' = 'success'): void {
    const notificationContainer = document.getElementById('global-notifications');
    if (notificationContainer) {
      const notification = document.createElement('div');
      notification.className = `notification ${type}`;
      notification.innerHTML = `
        <div style="display: flex; align-items: center; gap: 8px;">
          <i class="material-icons">${type === 'success' ? 'check_circle' : type === 'error' ? 'error' : 'warning'}</i>
          <span>${message}</span>
        </div>
      `;
      
      notificationContainer.appendChild(notification);
      
      // Auto remove after 3 seconds
      setTimeout(() => {
        if (notification.parentNode) {
          notification.parentNode.removeChild(notification);
        }
      }, 3000);
    }
  }

  private setupCartUpdateListener(): void {
    // Listen for cart update events from product component
    window.addEventListener('cartUpdated', this.handleCartUpdate.bind(this));
  }

  private handleCartUpdate = (event: any) => {
    console.log('Cart update event received:', event.detail);
    
    // Force reload cart popup if it exists and is open
    if (this.cartPopup) {
      this.cartPopup.loadCartItems();
    }
    
    // Update cart count
    this.updateCartCount();
  }

  private updateCartCount(): void {
    // Get cart count from localStorage or API
    const customer = localStorage.getItem('customer');
    
    if (customer) {
      // For logged-in users, get count from API
      const customerData = JSON.parse(customer);
      this.https.get(`https://localhost:59579/api/customers/${customerData.id}/cart/`).subscribe({
        next: (response: any) => {
          if (Array.isArray(response)) {
            this.cartItemsCount = response.reduce((total, item) => total + (item.Quantity || 1), 0);
          } else {
            this.cartItemsCount = 0;
          }
        },
        error: (error) => {
          console.error('Error loading cart count:', error);
          this.cartItemsCount = 0;
        }
      });
    } else {
      // For guest users, get count from localStorage
      const localCart = localStorage.getItem('guest_cart');
      if (localCart) {
        try {
          const cartItems = JSON.parse(localCart);
          this.cartItemsCount = cartItems.reduce((total: number, item: any) => total + (item.quantity || 1), 0);
        } catch (error) {
          this.cartItemsCount = 0;
        }
      } else {
        this.cartItemsCount = 0;
      }
    }
  }

  // Toggle cart
  toggleCart(): void {
    this.showCart = !this.showCart;
    
    if (this.showCart) {
      if (this.cartPopup) {
        this.cartPopup.toggleCart();
        // Force reload cart items when opening cart
        setTimeout(() => {
          this.cartPopup.loadCartItems();
        }, 100);
      }
    } else {
      if (this.cartPopup) {
        this.cartPopup.toggleCart();
      }
    }
    
    // Close wishlist if it's open
    if (this.showCart && this.showWishlist) {
      this.showWishlist = false;
    }
  }

  // Handle login success
  onLoginSuccess(customerData: any): void {
    this.isLoggedIn = true;
    this.customerId = customerData.id;
    this.showLogin = false;
    
    // Load wishlist data for newly logged-in user
    this.loadWishlistItems();
    
    this.showNotification('Login successful!', 'success');
  }

  // Handle logout
  logout(): void {
    this.isLoggedIn = false;
    this.customerId = null;
    this.wishlistItemsCount = 0;
    this.wishlistItems = [];
    this.showWishlist = false;
    this.showCart = false;
    
    localStorage.removeItem('customer');
    
    this.showNotification('Logged out successfully', 'success');
    this.router.navigate(['/']);
  }

  // Existing methods for categories, search, etc.
  toggleCategoriesDropdown(): void {
    this.showCategoriesDropdown = !this.showCategoriesDropdown;
  }

  loadProductsByCategory(categoryId: number): void {
    this.categorySelected.emit(categoryId);
  }

  showAllProducts(): void {
    this.showAllProductsEvent.emit();
  }

  searchProducts(): void {
    if (this.searchTerm && this.searchTerm.trim()) {
      console.log('Searching for:', this.searchTerm);
      
      // Make HTTP request to search API
      this.https.get<any[]>(`https://localhost:59579/api/products/search?name=${encodeURIComponent(this.searchTerm.trim())}`)
        .subscribe({
          next: (products) => {
            console.log('Search results:', products);
            this.products = products || [];
            this.loadProductPictures(products);
            // You can also emit the results to parent component if needed
            this.searchEvent.emit(this.searchTerm);
            
            // Optionally navigate to search results page or update UI
            // this.router.navigate(['/search'], { queryParams: { q: this.searchTerm } });
          },
          error: (error) => {
            console.error('Search error:', error);
            this.products = [];
            this.showNotification('Search failed. Please try again.', 'error');
          }
        });
    } else {
      // If search term is empty, you might want to show all products or clear results
      this.products = [];
      this.showAllProducts();
    }
    console.log('Search completed');
    console.log(this.products);
  }
private loadProductPictures(products: any[]): void {
    const pictureRequests = products.map(product => {
      if (!product.Id) {
        return of({ PictureId: 0, SeoFilename: 'default', mimeType: 'image/jpeg' });
      }
      
      return this.https.get<any>(`https://localhost:59579/api/pictures/by-product/${product.Id}`).pipe(
        catchError(err => {
          console.error(`Failed to load picture for product ${product.Id}:`, err);
          return of({ PictureId: 0, SeoFilename: 'default', mimeType: 'image/jpeg' });
        })
      );
    });

    forkJoin(pictureRequests).subscribe({
      next: (pictures) => {
        this.products = products.map((product, index) => {
          const pic = pictures[index];
          
          return {
            ...product,
            pictureId: pic?.PictureId ?? 0,
            seoFilename: pic?.SeoFilename ?? 'default',
            mimeType: pic?.MimeType ?? 'image/jpeg'
          };
        });
        
      },
      error: (err) => {
        console.error('Error loading pictures:', err);
        this.products = products.map(product => ({
          ...product,
          pictureId: 0,
          seoFilename: 'default',
          mimeType: 'image/jpeg'
        }));
      }
    });
  }

  getImageExtension(mimeType: string): string {
  if (!mimeType) return '.jpeg';
  
  const parts = mimeType.toLowerCase().split('/');
  const lastPart = parts[parts.length - 1];
  
  switch (lastPart) {
    case 'jpeg':
    case 'jpg':
    case 'pjpeg':
      return '.jpeg';
    case 'png':
    case 'x-png':
      return '.png';
    case 'gif':
      return '.gif';
    case 'webp':
      return '.webp';
    case 'bmp':
      return '.bmp';
    case 'tiff':
    case 'tif':
      return '.tiff';
    case 'svg+xml':
      return '.svg';
    case 'x-icon':
      return '.ico';
    default:
      return '.jpeg'; // Default fallback
  }
}

  handleImageError(event: any): void {
    event.target.src = 'assets/placeholder.png';
  }
}

