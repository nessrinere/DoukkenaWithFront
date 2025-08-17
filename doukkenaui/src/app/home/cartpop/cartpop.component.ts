import { Component, OnInit } from '@angular/core';
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
  }

  loadPicturesForCartItems(cartItems: CartItem[]) {
    if (cartItems.length === 0) {
      this.cartItems = [];
      return;
    }

    const pictureRequests = cartItems.map(item => {
      return this.https.get<any>(`https://localhost:59579/api/pictures/by-product/${item.Id}`);
    });

    // Use forkJoin to wait for all picture requests to complete
     forkJoin(pictureRequests).subscribe({
       next: (pictures) => {
         this.cartItems = cartItems.map((item, index) => {
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
         this.cartItems = cartItems;
       }
     });
  }

  loadCartItems() {
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
      }
    }
  }

  // Fixed: Added missing saveItemToDatabase method
  saveItemToDatabase(productId: number, quantity: number): void {
    const customer = localStorage.getItem('customer');
    if (!customer) {
      console.log('User not logged in, saving to localStorage only');
      return;
    }

    const customerData = JSON.parse(customer);
    const cartItemDto: CartItemDto = {
      customerId: customerData.id,
      productId: productId,
      quantity: quantity
    };

    this.https.post(`${this.apiUrl}/cart/items`, cartItemDto).subscribe({
      next: (response: any) => {
        console.log('Item saved to database:', response.message);
        this.removeFromLocalStorage(productId);
      },
      error: (error) => {
        console.error('Error saving item to database:', error);
      }
    });
  }

  // Fixed: Added missing addToCart method
  addToCart(item: CartItem, quantity: number = 1): void {
    console.log("Adding item to cart");
    const customer = localStorage.getItem('customer');
    if (customer) {
      // User is logged in - save to database
      this.saveItemToDatabase(item.Id, quantity);
    } else {
      // User is guest - save to localStorage
      const existingItemIndex = this.cartItems.findIndex(cartItem => cartItem.Id === item.Id);
      if (existingItemIndex > -1) {
        // Item already exists, update quantity
        this.cartItems[existingItemIndex].quantity = (this.cartItems[existingItemIndex].quantity || 1) + quantity;
      } else {
        // New item, add to cart
        this.cartItems.push({ ...item, quantity: quantity });
      }

      this.saveCartItems();
    }
  }

  // Fixed: Added missing migrateLocalStorageToDatabase method
  migrateLocalStorageToDatabase(): void {
    const customer = localStorage.getItem('customer');
    if (!customer) return;

    // Load items from localStorage first
    const storedCart = localStorage.getItem('guest_cart');
    if (storedCart) {
      const localCartItems = JSON.parse(storedCart);
      
      localCartItems.forEach((item: CartItem) => {
        if (item.quantity && item.quantity > 0) {
          this.saveItemToDatabase(item.Id, item.quantity);
        }
      });

      // Clear localStorage after migration
      localStorage.removeItem('guest_cart');
      this.cartItems = [];
    }
  }

  // Fixed: Added missing updateQuantity method
  updateQuantity(id: number, change: number) {
    const customer = localStorage.getItem('customer');
    
    if (customer) {
      // For logged-in users, update in database
      const item = this.cartItems.find(item => item.Id === id);
      if (item) {
        const newQuantity = (item.quantity || 1) + change;
        if (newQuantity > 0) {
          // Update the item quantity and save to database
          item.quantity = newQuantity;
          this.saveItemToDatabase(id, newQuantity);
        } else {
          // Remove item if quantity becomes 0 or negative
          this.removeItem(id);
        }
      }
    } else {
      // For guest users, update localStorage
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

  removeFromLocalStorage(productId: number): void {
    this.cartItems = this.cartItems.filter(item => item.Id !== productId);
    this.saveCartItems();
  }

  saveCartItems() {
    localStorage.setItem('guest_cart', JSON.stringify(this.cartItems));
  }

  toggleCart() {
    this.isOpen = !this.isOpen;
  }

  removeItem(id: number) {
    const customer = localStorage.getItem('customer');
    
    if (customer) {
      // For logged-in users, delete from database
      this.deleteItemFromDatabase(id);
    } else {
      // For guest users, remove from localStorage
      this.cartItems = this.cartItems.filter(item => item.Id !== id);
      this.saveCartItems();
    }
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
