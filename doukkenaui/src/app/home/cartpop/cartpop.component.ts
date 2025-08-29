import { Component, OnInit, OnDestroy } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { forkJoin } from 'rxjs';
import { Router } from '@angular/router';

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
  quantity?: number;
}

interface CartItemDto {
  customerId: number;
  productId: number;
  quantity: number;
}

@Component({
  selector: 'app-cartpop',
  templateUrl: './cartpop.component.html',
  styleUrls: ['./cartpop.component.css']
})
export class CartpopComponent implements OnInit {
  cartItems: CartItem[] = [];
  isOpen: boolean = false;
  private apiUrl = 'https://localhost:59579/api/customers';

  proceedToCheckout() {
    this.router.navigate(['/command/checkout']);
    this.toggleCart();
  }

  constructor(private https: HttpClient, private router: Router) {}

  ngOnInit() {
    this.loadCartItems();
    console.log(this.cartItems);
    
    // Listen for cart update events
    this.setupCartUpdateListener();
  }

  private setupCartUpdateListener(): void {
    // Listen for cart update events
    window.addEventListener('cartUpdated', this.handleCartUpdate.bind(this));
  }

  private handleCartUpdate = (event: any) => {
    console.log('Cart popup received update event:', event.detail);
    // Immediately reload cart items when notified
    this.loadCartItems();
  }



  private consolidateItems(items: CartItem[]): CartItem[] {
    const map = new Map<number, CartItem>();
    for (const it of items) {
      const existing = map.get(it.Id);
      if (existing) {
        existing.quantity = (existing.quantity || 1) + (it.quantity || 1);
      } else {
        map.set(it.Id, { ...it, quantity: it.quantity || 1 });
      }
    }
    return Array.from(map.values());
  }

  // Make loadCartItems public so it can be called from navbar
  public loadCartItems() {
    const customer = localStorage.getItem('customer');
    if (customer) {
      // Load from database for logged-in users
      const customerData = JSON.parse(customer);
      const customerId = customerData.id;
      
      this.https.get(`${this.apiUrl}/cart/items/${customerId}`).subscribe({
        next: (response: any) => {
          if (Array.isArray(response)) {
            // First, get basic cart items
            const basicCartItems = response.map(item => ({
              Id: item.ProductId,
              Name: item.ProductName,
              Price: item.ProductPrice,
              ShortDescription: '',
              FullDescription: '',
              CreatedOnUtc: item.CreatedOnUtc,
              UpdatedOnUtc: '',
              Published: true,
              pictureId: 0,
              seoFilename: 'default',
              mimeType: 'image/jpeg',
              quantity: item.Quantity
            }));

            // Then fetch picture information for each item
            this.loadPicturesForCartItems(basicCartItems);
            console.log("loadedCartPictures");
            console.log(this.cartItems);
          } else {
            console.log('No items found in cart or unexpected response format');
            this.cartItems = [];
          }
        },
        error: (error) => {
          console.error('Error loading cart items from database:', error);
          this.cartItems = [];
        }
      });
    } else {
      // Load from localStorage for guest users
      const storedCart = localStorage.getItem('guest_cart');
      if (storedCart) {
        this.cartItems = JSON.parse(storedCart);
        // Ensure each item has a quantity property
        this.cartItems = this.cartItems.map(item => {
          if (!item.quantity) {
            return { ...item, quantity: 1 };
          }
          return item;
        });
        
        // Load pictures for localStorage items too
        this.loadPicturesForCartItems(this.cartItems);
      }
    }
  }

  loadPicturesForCartItems(cartItems: CartItem[]) {
    const merged = this.consolidateItems(cartItems);
    if (merged.length === 0) {
      this.cartItems = [];
      return;
    }

    const pictureRequests = merged.map(item => {
      return this.https.get<any>(`https://localhost:59579/api/pictures/by-product/${item.Id}`);
    });

    // Use forkJoin to wait for all picture requests to complete
     forkJoin(pictureRequests).subscribe({
       next: (pictures) => {
         this.cartItems = merged.map((item, index) => {
           const picture = pictures[index];
           return {
             ...item,
             pictureId: picture?.PictureId ?? 0,
             seoFilename: picture?.SeoFilename ?? 'default',
             mimeType: picture?.mimeType ?? 'image/jpeg'
           };
         });
       },
       error: (err) => {
         console.error('Error loading pictures for cart items:', err);
         // Use cart items without pictures as fallback
         this.cartItems = merged;
       }
     });
  }

  // Fixed: Added missing saveItemToDatabase method
  // Treat quantity param as a delta (change) for logged-in user (backend adds this value)
  saveItemToDatabase(productId: number, quantityDelta: number): void {
    const customer = localStorage.getItem('customer');
    if (!customer) return;

    const customerData = JSON.parse(customer);
    const cartItemDto: CartItemDto = {
      customerId: customerData.id,
      productId: productId,
      quantity: quantityDelta // delta (+1 or -1 or initial amount)
    };

    this.https.post(`${this.apiUrl}/cart/items`, cartItemDto).subscribe({
      next: () => {
        // Do not remove from local list here; we keep local state updated already
      },
      error: (error) => console.error('Error updating item (delta) in database:', error)
    });
  }

  // Fixed: Added missing addToCart method
  addToCart(item: CartItem, quantity: number = 1): void {
    const customer = localStorage.getItem('customer');
    if (customer) {
      const existing = this.cartItems.find(ci => ci.Id === item.Id);
      if (existing) {
        existing.quantity = (existing.quantity || 1) + quantity;
      } else {
        this.cartItems.push({ ...item, quantity });
      }
      this.cartItems = this.consolidateItems(this.cartItems);
      // Send only the delta (quantity just added), NOT the new total
      this.saveItemToDatabase(item.Id, quantity);
    } else {
      const existing = this.cartItems.find(ci => ci.Id === item.Id);
      if (existing) {
        existing.quantity = (existing.quantity || 1) + quantity;
      } else {
        this.cartItems.push({ ...item, quantity });
      }
      this.cartItems = this.consolidateItems(this.cartItems);
      this.saveCartItems();
    }
  }

  // Fixed: Added missing migrateLocalStorageToDatabase method
  migrateLocalStorageToDatabase(): void {
    const customer = localStorage.getItem('customer');
    if (!customer) return;

    const storedCart = localStorage.getItem('guest_cart');
    if (storedCart) {
      const localCartItems = JSON.parse(storedCart);
      localCartItems.forEach((item: CartItem) => {
        if (item.quantity && item.quantity > 0) {
          // For migration we send full quantity as initial add
          this.saveItemToDatabase(item.Id, item.quantity);
        }
      });
      localStorage.removeItem('guest_cart');
      this.cartItems = [];
    }
  }

  // Fixed: Added missing updateQuantity method
  updateQuantity(id: number, change: number) {
    const customer = localStorage.getItem('customer');
    const item = this.cartItems.find(ci => ci.Id === id);
    if (!item) return;

    const newQuantity = (item.quantity || 1) + change;
    if (newQuantity < 1) {
      this.removeItem(id);
      return;
    }

    item.quantity = newQuantity;
    this.cartItems = this.consolidateItems(this.cartItems);

    if (customer) {
      // Send only the delta (+1 / -1)
      this.saveItemToDatabase(id, change);
    } else {
      this.saveCartItems();
    }
  }

  removeFromLocalStorage(productId: number): void {
    this.cartItems = this.cartItems.filter(item => item.Id !== productId);
    this.saveCartItems();
  }

  saveCartItems() {
    this.cartItems = this.consolidateItems(this.cartItems);
    localStorage.setItem('guest_cart', JSON.stringify(this.cartItems));
  }

  toggleCart() {
    this.isOpen = !this.isOpen;
    
    // Reload items when cart is opened
    if (this.isOpen) {
      this.loadCartItems();
    }
  }

  removeItem(productId: number) {
    const item = this.cartItems.find(ci => ci.Id === productId);
    if (!item) return;

    // Optimistically remove locally
    this.cartItems = this.cartItems.filter(ci => ci.Id !== productId);

    const customer = localStorage.getItem('customer');
    if (!customer) {
      // Guest: just persist local change
      this.saveCartItems();
      window.dispatchEvent(new CustomEvent('cartUpdated', {
        detail: { productRemoved: true, productId, timestamp: Date.now() }
      }));
      return;
    }

    // Logged-in: call global removal endpoint (removes all occurrences in all carts)
    this.https.delete(`https://localhost:59579/api/wishlist/cart/remove/${productId}`).subscribe({
      next: (res: any) => {
        console.log('Global remove response:', res);
        window.dispatchEvent(new CustomEvent('cartUpdated', {
          detail: { productRemoved: true, productId, removedCount: res?.removedCount, timestamp: Date.now() }
        }));
      },
      error: (err) => {
        console.error('Global remove failed, reverting local state', err);
        // Optional: reload to resync
        this.loadCartItems();
      }
    });
  }

  // New method to delete item from database
  deleteItemFromDatabase(productId: number): void {
    const customer = localStorage.getItem('customer');
    if (!customer) {
      console.error('No customer found in localStorage');
      return;
    }

    const customerData = JSON.parse(customer);
    const customerId = customerData.id;

    // Call API to delete cart item from database
    this.https.delete(`${this.apiUrl}/${customerId}/cart/items/${productId}`).subscribe({
      next: (response: any) => {
        console.log('Item deleted from database:', response.message);
        // Remove item from local array after successful database deletion
        this.cartItems = this.cartItems.filter(item => item.Id !== productId);
      },
      error: (error) => {
        console.error('Error deleting item from database:', error);
        // Optionally show user-friendly error message
        alert('Failed to remove item from cart. Please try again.');
      }
    });
  }

  getTotal(): number {
    return this.cartItems.reduce((total, item) => total + (item.Price * (item.quantity || 1)), 0);
  }
  
  getImageUrl(item: CartItem): string {
    const paddedId = ('0000000' + item.pictureId).slice(-7);
    const extension = this.getImageExtension(item.mimeType);
    console.log(item)
    return `https://localhost:59579/images/thumbs/${paddedId}_${item.seoFilename}${extension}`;
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


  // Call this method when user logs in
  onUserLogin(): void {
    this.migrateLocalStorageToDatabase();
  }

  // Check if user is logged in
  isUserLoggedIn(): boolean {
    return !!localStorage.getItem('customer');
  }
}
