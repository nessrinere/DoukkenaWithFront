import { Component, OnInit, ViewChild, OnDestroy } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { CartpopComponent } from '../cartpop/cartpop.component';
import { forkJoin, Observable, of } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
//import { algoliasearch, SearchClient } from 'algoliasearch';

// Algolia imports - only add if you want recommendations
// import instantsearch from 'instantsearch.js';
// import algoliasearch from 'algoliasearch';

interface CartItem {
  Id: number;
  Name: string;
  Price: number;
  ShortDescription: string;
  FullDescription: string;
  CreatedOnUtc: string;
  UpdatedOnUtc: string;
  Published: boolean;
  pictureId: number;
  seoFilename: string;
  mimeType: string;
  quantity: number;
}

interface CartItemDto {
  customerId: number;
  productId: number;
  quantity: number;
}

interface Product {
  Id: number;
  Name: string;
  Price: number;
  ShortDescription: string;
  FullDescription: string;
  CreatedOnUtc: string;
  UpdatedOnUtc: string;
  Published: boolean;
  pictureId?: number;
  seoFilename?: string;
  mimeType?: string;
}

@Component({
  selector: 'app-header',
  templateUrl: './header.component.html',
  styleUrls: ['./header.component.css']
})
export class HeaderComponent implements OnInit, OnDestroy {
  @ViewChild(CartpopComponent) cartPopup!: CartpopComponent;
  
  searchTerm: string = '';
  products: any[] = [];
  categories: any[] = [];
  showCategoriesDropdown: boolean = false;
  productRatings: { [key: number]: { rating: number; total: number } } = {};
  isLoggedIn: boolean = false;
  showLogin: boolean = false;
  cartItems: CartItem[] = [];
  isLoadingProducts: boolean = false;
  private storageKey = 'guest_cart';
  private apiUrl = 'https://localhost:59579/api/customers';
  
  // Wishlist properties - using constructor injection approach
  wishlistItems: Set<number> = new Set();
  wishlistLoading: { [key: number]: boolean } = {};
  private wishlistApiUrl = 'https://localhost:59579/api/wishlist';
  
  // algoliaClient: SearchClient;
  index: any;
  //const index = client.initIndex('products');
  //const client = algoliasearch('KASW3K68MI', 'd4cb123f7437004f69410bec22f72703');

  // Algolia properties - uncomment when you want to use recommendations
  // private algoliaClient: any;
  // private homepageRecommendations: any;

  constructor(private https: HttpClient) {
    // Initialize Algolia client - uncomment when ready
    // this.algoliaClient = algoliasearch('KASW3K68MI', 'd4cb123f7437004f69410bec22f72703');
  }

  ngOnInit() {
    // Check if there are category products in localStorage first
    const categoryProducts = localStorage.getItem('categoryProducts');
    if (categoryProducts) {
      try {
        this.products = JSON.parse(categoryProducts);
        console.log('Loaded category products from localStorage:', this.products);
        // Load ratings for category products
        this.products.forEach(product => {
          if (product.Id) {
            this.loadProductRating(product.Id);
          }
        });
        // Clear the localStorage after loading
        localStorage.removeItem('categoryProducts');
      } catch (e) {
        console.error('Error parsing category products from localStorage:', e);
        // Fallback to loading all products
        this.getProducts();
      }
    } else {
      // Load all products if no category products
      this.getProducts();
    }
    
    this.loadCategories();
    this.checkLoginStatus();
    this.loadWishlistItems();
    
    // Listen for custom events from navbar
    window.addEventListener('showAllProducts', () => {
      console.log('Received showAllProducts event');
      this.getProducts();
    });
    
    window.addEventListener('loadCategoryProducts', (event: any) => {
      console.log('Received loadCategoryProducts event:', event.detail);
      if (event.detail && event.detail.categoryId) {
        const categoryId = parseInt(event.detail.categoryId);
        if (!isNaN(categoryId) && categoryId > 0) {
          this.loadProductsByCategory(categoryId);
        } else {
          console.error('Invalid categoryId received:', event.detail.categoryId);
        }
      } else {
        console.error('No categoryId found in event detail:', event.detail);
      }
    });
    
    // Initialize Algolia recommendations - uncomment when ready
    // this.initializeHomepageRecommendations();
    
    if (this.isLoggedIn) {
      this.loadCartItemsFromDatabase();
      this.migrateLocalStorageToDatabase();
    } else {
      const storedCart = localStorage.getItem(this.storageKey);
      if (storedCart) {
        this.cartItems = JSON.parse(storedCart);
      }
    }
  }

  ngOnDestroy(): void {
    // Remove event listeners
    window.removeEventListener('showAllProducts', () => {});
    window.removeEventListener('loadCategoryProducts', () => {});
    
    // Cleanup Algolia instances - uncomment when using recommendations
    // if (this.homepageRecommendations) {
    //   this.homepageRecommendations.dispose();
    // }
  }

  // Search functionality
  searchProducts() {
    if (this.searchTerm.trim()) {
      this.https.get<any[]>(`https://localhost:59579/api/products/search?term=${encodeURIComponent(this.searchTerm)}`)
        .subscribe({
          next: (products) => {
            this.products = products || [];
            this.loadProductPictures(this.products);
          },
          error: (err) => {
            console.error('Search error:', err);
            this.products = [];
          }
        });
    } else {
      this.getProducts();
    }
  }

  // Category methods
  loadProductsByCategory(categoryId: number) {
    console.log('Starting loadProductsByCategory with categoryId:', categoryId);
    this.isLoadingProducts = true; // Add loading state
    
    // Fixed API endpoint - add /products at the end
    this.https.get<any[]>(`https://localhost:59579/api/products/category/${categoryId}/products`)
      .subscribe({
        next: (products) => {
          console.log('Products received for category', categoryId, ':', products);
          this.products = products || [];
          this.isLoadingProducts = false; // Stop loading
          
          if (this.products.length > 0) {
            this.loadProductPictures(this.products);
            // Load ratings for each product
            this.products.forEach(product => {
              if (product.Id) {
                this.loadProductRating(product.Id);
              }
            });
          }
          
          this.showCategoriesDropdown = false;
          
          // Scroll to products section
          setTimeout(() => {
            const productsSection = document.getElementById('products-section');
            if (productsSection) {
              productsSection.scrollIntoView({ 
                behavior: 'smooth', 
                block: 'start' 
              });
            }
          }, 500);
        },
        error: (err) => {
          console.error('Error loading products by category:', err);
          console.error('API endpoint:', `https://localhost:59579/api/products/category/${categoryId}/products`);
          console.error('Error details:', err.error);
          console.error('Status:', err.status);
          console.error('Status text:', err.statusText);
          
          this.products = [];
          this.isLoadingProducts = false; // Stop loading on error
          
          // Show user-friendly error message
          alert(`Échec du chargement des produits pour cette catégorie. Veuillez réessayer plus tard.`);
        }
      });
  }

  // Update the showAllProducts method around line 140
  showAllProducts() {
    this.isLoadingProducts = true;
    this.getProducts();
    this.showCategoriesDropdown = false;
    
    // Scroll to products section after a short delay to ensure products are loaded
    setTimeout(() => {
      const productsSection = document.getElementById('products-section');
      if (productsSection) {
        productsSection.scrollIntoView({ 
          behavior: 'smooth', 
          block: 'start' 
        });
      }
    }, 500);
  }

  toggleCategoriesDropdown() {
    this.showCategoriesDropdown = !this.showCategoriesDropdown;
  }

  // Product and rating methods
  loadProductRating(productId: number): void {
    this.https.get<any>(`https://localhost:59579/api/review/product/${productId}/rating`).subscribe({
      next: (res) => {
        const rating = res?.rating !== undefined ? res.rating : 0;
        const total = res?.total !== undefined ? res.total : 0;
        this.productRatings[productId] = { rating, total };
      },
      error: (err) => {
        console.error('Failed to load rating for product:', productId, err);
        this.productRatings[productId] = { rating: 0, total: 0 };
      }
    });
  }

  loadRatingsAndSort(): void {
    if (!this.products || this.products.length === 0) return;

    const ratingRequests = this.products.map(product => {
      if (!product.Id) {
        return of({ productId: product.Id, rating: 0, total: 0 });
      }
      
      return this.https.get<any>(`https://localhost:59579/api/review/product/${product.Id}/rating`).pipe(
        catchError(() => of({ rating: 0, total: 0 })),
        map(res => ({
          productId: product.Id,
          rating: res?.rating !== undefined ? res.rating : 0,
          total: res?.total !== undefined ? res.total : 0
        }))
      );
    });

    forkJoin(ratingRequests).subscribe({
      next: (ratings) => {
        ratings.forEach(ratingData => {
          if (ratingData.productId) {
            this.productRatings[ratingData.productId] = {
              rating: ratingData.rating,
              total: ratingData.total
            };
          }
        });

        this.products.sort((a, b) => {
          const ratingA = this.productRatings[a.Id]?.rating || 0;
          const ratingB = this.productRatings[b.Id]?.rating || 0;
          return ratingB - ratingA;
        });
      },
      error: (err) => {
        console.error('Error loading ratings:', err);
        this.products.forEach(product => {
          if (product.Id) {
            this.loadProductRating(product.Id);
          }
        });
      }
    });
  }

  getRoundedRating(productId: number): number {
    const rating = this.productRatings[productId]?.rating || 0;
    return Math.round(rating);
  }

  getStarIcons(rating: number): string[] {
    const stars: string[] = [];
    const fullStars = Math.floor(rating);
    const hasHalfStar = rating % 1 >= 0.5;
    const emptyStars = 5 - fullStars - (hasHalfStar ? 1 : 0);

    for (let i = 0; i < fullStars; i++) {
      stars.push('star');
    }

    if (hasHalfStar) {
      stars.push('star_half');
    }

    for (let i = 0; i < emptyStars; i++) {
      stars.push('star_border');
    }

    return stars;
  }

  // Cart methods
  loadCartItemsFromDatabase(): void {
    const customer = localStorage.getItem('customer');
    if (!customer) return;

    const customerData = JSON.parse(customer);
    const customerId = customerData.id;

    this.https.get<any[]>(`${this.apiUrl}/${customerId}/cart/`).subscribe({
      next: (cartItemsFromDb) => {
        if (cartItemsFromDb && cartItemsFromDb.length > 0) {
          const formattedCartItems: CartItem[] = [];
          
          const productRequests = cartItemsFromDb.map(dbItem => 
            this.https.get<any>(`https://localhost:59579/api/products/${dbItem.productId}`)
          );

          forkJoin(productRequests).subscribe({
            next: (products) => {
              cartItemsFromDb.forEach((dbItem, index) => {
                const product = products[index];
                if (product) {
                  this.https.get<any>(`https://localhost:59579/api/pictures/by-product/${product.Id}`).subscribe({
                    next: (picture) => {
                      const cartItem: CartItem = {
                        Id: product.Id,
                        Name: product.Name,
                        Price: product.Price,
                        ShortDescription: product.ShortDescription,
                        FullDescription: product.FullDescription,
                        CreatedOnUtc: product.CreatedOnUtc,
                        UpdatedOnUtc: product.UpdatedOnUtc,
                        Published: product.Published,
                        pictureId: picture?.PictureId ?? 0,
                        seoFilename: picture?.SeoFilename ?? 'default',
                        mimeType: picture?.mimeType ?? 'image/jpeg',
                        quantity: dbItem.quantity
                      };
                      formattedCartItems.push(cartItem);
                      
                      if (formattedCartItems.length === cartItemsFromDb.length) {
                        this.saveCartItemsToLocalStorage(formattedCartItems);
                      }
                    },
                    error: (err) => {
                      console.error('Error loading product picture:', err);
                      const cartItem: CartItem = {
                        Id: product.Id,
                        Name: product.Name,
                        Price: product.Price,
                        ShortDescription: product.ShortDescription,
                        FullDescription: product.FullDescription,
                        CreatedOnUtc: product.CreatedOnUtc,
                        UpdatedOnUtc: product.UpdatedOnUtc,
                        Published: product.Published,
                        pictureId: 0,
                        seoFilename: 'default',
                        mimeType: 'image/jpeg',
                        quantity: dbItem.quantity
                      };
                      formattedCartItems.push(cartItem);
                      
                      if (formattedCartItems.length === cartItemsFromDb.length) {
                        this.saveCartItemsToLocalStorage(formattedCartItems);
                      }
                    }
                  });
                }
              });
            },
            error: (err) => {
              console.error('Error loading products for cart items:', err);
            }
          });
        }
      },
      error: (error) => {
        console.error('Error loading cart items from database:', error);
      }
    });
  }

  saveCartItemsToLocalStorage(cartItems: CartItem[]): void {
    localStorage.setItem(this.storageKey, JSON.stringify(cartItems));
    this.cartItems = cartItems;
    
    if (this.cartPopup) {
      this.cartPopup.loadCartItems();
    }
  }

  saveItemToDatabase(productId: number, quantity: number): void {
    const customer = localStorage.getItem('customer');
    if (!customer) return;

    const customerData = JSON.parse(customer);
    const cartItemDto: CartItemDto = {
      customerId: customerData.id,
      productId: productId,
      quantity: quantity
    };

    this.https.post(`${this.apiUrl}/cart/items/`, cartItemDto).subscribe({
      next: (response: any) => {
        console.log('Item saved to database:', response.message);
        this.removeFromLocalStorage(productId);
        this.loadCartItemsFromDatabase();
        if (this.cartPopup) {
          this.cartPopup.loadCartItems();
        }
      },
      error: (error) => {
        console.error('Error saving item to database:', error);
      }
    });
  }

  addToCart(item: any, quantity: number = 1): void {
    const customer = localStorage.getItem('customer');
    if (customer) {
      this.saveItemToDatabase(item.Id, quantity);
    } else {
      const existingItemIndex = this.cartItems.findIndex(cartItem => cartItem.Id === item.Id);
      if (existingItemIndex > -1) {
        this.cartItems[existingItemIndex].quantity = (this.cartItems[existingItemIndex].quantity || 1) + quantity;
      } else {
        this.cartItems.push({ ...item, quantity: quantity });
      }

      this.saveCartItems();
      
      if (this.cartPopup) {
        this.cartPopup.loadCartItems();
      }
    }
  }

  migrateLocalStorageToDatabase(): void {
    const customer = localStorage.getItem('customer');
    if (!customer) return;

    const storedCart = localStorage.getItem('guest_cart');
    if (storedCart) {
      const localCartItems = JSON.parse(storedCart);
      
      localCartItems.forEach((item: CartItem) => {
        if (item.quantity && item.quantity > 0) {
          this.saveItemToDatabase(item.Id, item.quantity);
        }
      });

      localStorage.removeItem('guest_cart');
    }
  }

  updateQuantity(id: number, change: number) {
    const customer = localStorage.getItem('customer');
    
    if (customer) {
      const item = this.cartItems.find(item => item.Id === id);
      if (item) {
        const newQuantity = (item.quantity || 1) + change;
        if (newQuantity > 0) {
          item.quantity = newQuantity;
          this.saveItemToDatabase(id, newQuantity);
        } else {
          this.removeItem(id);
        }
        if (this.cartPopup) {
          this.cartPopup.loadCartItems();
        }
      }
    } else {
      this.cartItems = this.cartItems.map(item => {
        if (item.Id === id) {
          const newQuantity = (item.quantity || 1) + change;
          return {
            ...item,
            quantity: newQuantity > 0 ? newQuantity : 1
          };
        }
        return item;
      });
      this.saveCartItems();
    }
  }

  saveCartItems() {
    localStorage.setItem('guest_cart', JSON.stringify(this.cartItems));
  }

  removeFromLocalStorage(productId: number): void {
    this.cartItems = this.cartItems.filter(item => item.Id !== productId);
    this.saveCartItems();
  }

  removeItem(id: number) {
    this.cartItems = this.cartItems.filter(item => item.Id !== id);
    this.saveCartItems();
  }

  toggleCart() {
    if (this.cartPopup) {
      this.cartPopup.toggleCart();
    }
  }

  getCart(): any[] {
    const cart = localStorage.getItem(this.storageKey);
    return cart ? JSON.parse(cart) : [];
  }

  clearCart(): void {
    localStorage.removeItem(this.storageKey);
  }

  // Authentication methods
  checkLoginStatus() {
    const customerData = localStorage.getItem('customer');
    if (customerData) {
      try {
        const customer = JSON.parse(customerData);
        this.isLoggedIn = !!(customer.id || customer.Id || customer.customerId || customer.CustomerId);
        console.log('Login status:', this.isLoggedIn, 'Customer:', customer);
      } catch (e) {
        console.error('Invalid customer data in localStorage:', e);
        this.isLoggedIn = false;
        localStorage.removeItem('customer'); // Clean up invalid data
      }
    } else {
      this.isLoggedIn = false;
    }
  }

   onLoginSuccess(customer: any) {
    localStorage.setItem('customer', JSON.stringify(customer));
    this.showLogin = false;
    this.checkLoginStatus();
    
    // Load cart items from database after successful login
    this.loadCartItemsFromDatabase();
  }

  logout() {
    localStorage.removeItem('customer');
    localStorage.removeItem(this.storageKey); // Clear cart on logout
    this.checkLoginStatus();
  }

  // Product loading methods
  loadCategories() {
    this.https.get<any[]>('https://localhost:59579/api/categories/homeV')
      .subscribe({
        next: (data) => {
          this.categories = data;
        },
        error: (error) => {
          console.error('Error fetching categories:', error);
        }
      });
  }

  getProducts() {
    this.isLoadingProducts = true; // Set loading to true at start
    this.https.get<any[]>('https://localhost:59579/api/products/')
      .subscribe({
        next: (products) => {
          if (!products || products.length === 0) {
            this.products = [];
            this.isLoadingProducts = false; // Set loading to false
            return;
          }

          this.loadProductPictures(products);
        },
        error: (err) => {
          console.error('Error loading products:', err);
          this.products = [];
          this.isLoadingProducts = false; // Set loading to false on error
        }
      });
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
        
        this.loadRatingsAndSort();
        this.isLoadingProducts = false; // Set loading to false when complete
      },
      error: (err) => {
        console.error('Error loading pictures:', err);
        this.products = products.map(product => ({
          ...product,
          pictureId: 0,
          seoFilename: 'default',
          mimeType: 'image/jpeg'
        }));
        this.isLoadingProducts = false; // Set loading to false on error
      }
    });
  }

  getImageExtension(mimeType: string | undefined): string {
    if (!mimeType) return '.jpeg';
    switch (mimeType) {
      case 'image/jpeg': return '.jpeg';
      case 'image/png': return '.png';
      case 'image/webp': return '.webp';
      default: return '.jpeg';
    }
  }

  handleFilterResults(event: any): void {
    if (event.products && event.products.length > 0) {
      this.products = event.products;
      this.loadProductPictures(this.products);
      
      // Refresh recommendations after filtering - uncomment when using Algolia
      // if (this.homepageRecommendations) {
      //   this.homepageRecommendations.refresh();
      // }
    } else if (event.error) {
      console.error('Filter error:', event.error);
    }
  }

  // WISHLIST METHODS
  private getCustomerId(): number | null {
    const customerData = localStorage.getItem('customer');
    console.log('Raw customer data from localStorage:', customerData);
    
    if (!customerData) {
      console.log('No customer data found in localStorage');
      return null;
    }
    
    try {
      const customer = JSON.parse(customerData);
      console.log('Parsed customer object:', customer);
      console.log('Available properties:', Object.keys(customer));
      
      // Try different possible property names
      const customerId = customer.id || customer.Id || customer.customerId || customer.CustomerId;
      console.log('Found customer ID:', customerId);
      
      return customerId ? parseInt(customerId) : null;
    } catch (e) {
      console.error('Error parsing customer data:', e);
      return null;
    }
  }

  loadWishlistItems(): void {
    const customerId = this.getCustomerId();
    if (!customerId) {
      this.wishlistItems.clear();
      return;
    }

    this.https.get<any[]>(`${this.wishlistApiUrl}/${customerId}`)
      .pipe(
        catchError(error => {
          console.error('Error loading wishlist:', error);
          return of([]);
        })
      )
      .subscribe(items => {
        this.wishlistItems.clear();
        items.forEach(item => {
          this.wishlistItems.add(item.Id);
        });
        console.log('Loaded wishlist items:', this.wishlistItems);
      });
  }

  isInWishlist(productId: number): boolean {
    return this.wishlistItems.has(productId);
  }

  addToWishlist(product: any, quantity: number = 1): void {
    const customerId = this.getCustomerId();
    if (!customerId) {
      this.showLogin = true;
      this.showNotification('Please log in to add items to wishlist', 'warning');
      return;
    }

    if (this.wishlistLoading[product.Id]) {
      return;
    }

    this.wishlistLoading[product.Id] = true;
    const productId = typeof product === 'number' ? product : product.Id;
    
    const wishlistItem = {
      CustomerId: customerId,
      ProductId: productId,
      Quantity: quantity
    };

    console.log('Adding to wishlist:', wishlistItem);

    this.https.post(`${this.wishlistApiUrl}/add`, wishlistItem)
      .pipe(
        catchError(error => {
          console.error('Error adding to wishlist:', error);
          this.showNotification('Failed to add to wishlist', 'error');
          return of(null);
        })
      )
      .subscribe(response => {
        this.wishlistLoading[product.Id] = false;
        if (response) {
          this.wishlistItems.add(productId);
          this.showNotification('Added to wishlist', 'success');
          console.log('Successfully added to wishlist:', response);
        }
      });
  }

  removeFromWishlist(product: any): void {
    const customerId = this.getCustomerId();
    if (!customerId) {
      this.showNotification('Please log in to manage wishlist', 'warning');
      return;
    }

    if (this.wishlistLoading[product.Id]) {
      return;
    }

    this.wishlistLoading[product.Id] = true;
    const productId = typeof product === 'number' ? product : product.Id;

    this.https.delete(`${this.wishlistApiUrl}/remove?customerId=${customerId}&productId=${productId}`)
      .pipe(
        catchError(error => {
          console.error('Error removing from wishlist:', error);
          this.showNotification('Failed to remove from wishlist', 'error');
          return of(null);
        })
      )
      .subscribe(response => {
        this.wishlistLoading[product.Id] = false;
        if (response !== null) {
          this.wishlistItems.delete(productId);
          this.showNotification('Removed from wishlist', 'success');
          console.log('Successfully removed from wishlist:', response);
        }
      });
  }

  toggleWishlist(product: any, event: Event): void {
    event.preventDefault();
    event.stopPropagation();
    
    console.log('toggleWishlist called for product:', product);
    
    if (this.wishlistLoading[product.Id]) {
      console.log('Wishlist loading in progress, skipping...');
      return;
    }
    
    const customer = localStorage.getItem('customer');
    console.log('Customer check:', customer ? 'Logged in' : 'Not logged in');
    
    if (!customer) {
      this.showLogin = true;
      this.showNotification('Please log in to add items to wishlist', 'warning');
      return;
    }
    
    if (this.isInWishlist(product.Id)) {
      console.log('Removing from wishlist...');
      this.removeFromWishlist(product);
    } else {
      console.log('Adding to wishlist...');
      this.addToWishlist(product, 1);
    }
  }

  clearWishlist(): void {
    const customerId = this.getCustomerId();
    if (!customerId) {
      this.showNotification('Please log in to clear wishlist', 'warning');
      return;
    }

    this.https.delete(`${this.wishlistApiUrl}/clear?customerId=${customerId}`)
      .pipe(
        catchError(error => {
          console.error('Error clearing wishlist:', error);
          this.showNotification('Failed to clear wishlist', 'error');
          return of(null);
        })
      )
      .subscribe(response => {
        if (response !== null) {
          this.wishlistItems.clear();
          this.showNotification('Wishlist cleared', 'success');
          console.log('Successfully cleared wishlist');
        }
      });
  }

  moveToCart(product: any): void {
    const customerId = this.getCustomerId();
    if (!customerId) {
      this.showNotification('Please log in to move items to cart', 'warning');
      return;
    }

    const cartItem = {
      customerId: customerId,
      productId: product.Id,
      quantity: 1
    };

    this.https.post('https://localhost:59579/api/cart/add', cartItem)
      .pipe(
        catchError(error => {
          console.error('Error moving to cart:', error);
          this.showNotification('Failed to move to cart', 'error');
          return of(null);
        })
      )
      .subscribe(response => {
        if (response) {
          // After successfully adding to cart, remove from wishlist
          this.removeFromWishlist(product);
          this.showNotification('Moved to cart', 'success');
          
          // Refresh cart if cart popup exists
          if (this.cartPopup) {
            this.cartPopup.loadCartItems();
          }
        }
      });
  }

  // Performance optimization
  trackByProductId(index: number, product: any): number {
    return product.Id;
  }

  // Notification system
  private showNotification(message: string, type: 'success' | 'error' | 'warning'): void {
    const notification = document.createElement('div');
    notification.className = `wishlist-notification ${type}`;
    notification.textContent = message;
    
    Object.assign(notification.style, {
      position: 'fixed',
      top: '20px',
      right: '20px',
      padding: '12px 20px',
      borderRadius: '6px',
      color: 'white',
      fontWeight: '500',
      zIndex: '9999',
      animation: 'slideInRight 0.3s ease-out',
      backgroundColor: type === 'success' ? '#10b981' : type === 'error' ? '#ef4444' : '#f59e0b'
    });
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
      notification.style.animation = 'slideOutRight 0.3s ease-in';
      setTimeout(() => {
        if (notification.parentNode) {
          notification.parentNode.removeChild(notification);
        }
      }, 300);
    }, 3000);
  }

  // ... rest of existing methods (search, categories, cart, etc.) ...
}
