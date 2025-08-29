import { Component, OnInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';

// Interfaces for request DTOs
interface CreateAddressRequest {
  firstName: string;
  lastName: string;
  email: string;
  phoneNumber: string;
  address1: string;
  city: string;
  stateProvinceId: number;
  zipPostalCode: string;
  countryId: number;
}

interface CreateOrderRequest {
  customerId: number;
  billingAddressId: number;
  shippingAddressId: number;
  paymentMethodSystemName: string;
  shippingMethodName: string;
  orderNotes?: string;
}

interface AddOrderItemRequest {
  orderId: number;
  productId: number;
  quantity: number;
  unitPriceInclTax: number;
}

interface CartItem {
  Id: number;
  Name: string;
  Price: number;
  ShortDescription: string;
  ImageUrl?: string;
  quantity?: number;
  pictureId?: number;
  seoFilename?: string;
  mimeType?: string;
}

@Component({
  selector: 'app-checkout',
  templateUrl: './checkout.component.html',
  styleUrls: ['./checkout.component.css']
})
export class CheckoutComponent implements OnInit {
  cartItems: CartItem[] = [];
  selectedPaymentMethod: string = 'cash';
  private apiUrl = 'https://localhost:59579/api';
  private orderApiUrl = 'https://localhost:59579/api/order';
  shippingForm: FormGroup;
  isLoading: boolean = false;
  orderPlaced: boolean = false;
  orderError: string | null = null;
  orderId: number | null = null;
  
  // Invoice data
  orderDate: Date = new Date();
  customerInfo: any = null;
  shippingInfo: any = null;
  orderItems: CartItem[] = [];
  
  // Tax rate constant
  private readonly TAX_RATE = 0.07; // 7%
  private readonly SHIPPING_COST = 9; // Fixed shipping cost

  constructor(private https: HttpClient, private fb: FormBuilder, private router: Router) {
    this.shippingForm = this.fb.group({
      firstName: ['', [Validators.required, Validators.minLength(2)]],
      lastName: ['', [Validators.required, Validators.minLength(2)]],
      phoneNumber: ['', [Validators.required, Validators.pattern('^\\+216[0-9]{8}$')]],
      email: ['', [Validators.required, Validators.email]],
      address: ['', [Validators.required, Validators.minLength(5)]],
      city: ['', [Validators.required]],
      state: ['', [Validators.required]],
      zipCode: ['', [Validators.required, Validators.pattern('^[0-9]{4}$')]]
    });
  }

  ngOnInit() {
    this.loadCartItems();
  }

  loadCartItems() {
    const customer = localStorage.getItem('customer');
    if (customer) {
      const customerData = JSON.parse(customer);
      const customerId = customerData.id;
      
      this.https.get(`${this.apiUrl}/customers/cart/items/${customerId}`).subscribe({
        next: (response: any) => {
          if (Array.isArray(response)) {
            const basicCartItems = response.map(item => ({
              Id: item.ProductId,
              Name: item.ProductName,
              Price: item.ProductPrice,
              ShortDescription: '',
              ImageUrl: '',
              quantity: item.Quantity,
              pictureId: 0,
              seoFilename: 'default',
              mimeType: 'image/jpeg'
            }));

            // Load pictures for cart items
            this.loadPicturesForCartItems(basicCartItems);
          }
        },
        error: (error) => {
          console.error('Error loading cart items:', error);
          // Fallback to localStorage
          const localCart = localStorage.getItem('guest_cart');
          if (localCart) {
            const localCartItems = JSON.parse(localCart);
            this.loadPicturesForCartItems(localCartItems);
          }
        }
      });
    } else {
      const localCart = localStorage.getItem('guest_cart');
      if (localCart) {
        const localCartItems = JSON.parse(localCart);
        this.loadPicturesForCartItems(localCartItems);
      }
    }
  }

  // Add the loadPicturesForCartItems method like in cartpop
  loadPicturesForCartItems(cartItems: CartItem[]) {
    if (cartItems.length === 0) {
      this.cartItems = [];
      return;
    }

    const pictureRequests = cartItems.map(item => {
      return this.https.get<any>(`https://localhost:59579/api/pictures/by-product/${item.Id}`).pipe(
        catchError(err => {
          console.error(`Failed to load picture for product ${item.Id}:`, err);
          return of({ PictureId: 0, SeoFilename: 'default', MimeType: 'image/jpeg' });
        })
      );
    });

    forkJoin(pictureRequests).subscribe({
      next: (pictures) => {
        this.cartItems = cartItems.map((item, index) => {
          const picture = pictures[index];
          return {
            ...item,
            pictureId: picture?.PictureId ?? 0,
            seoFilename: picture?.SeoFilename ?? 'default',
            mimeType: picture?.MimeType ?? 'image/jpeg'
          };
        });
        
        console.log('Cart items with pictures loaded:', this.cartItems);
        console.log('Total amount:', this.getTotal());
      },
      error: (err) => {
        console.error('Error loading pictures for cart items:', err);
        this.cartItems = cartItems.map(item => ({
          ...item,
          pictureId: 0,
          seoFilename: 'default',
          mimeType: 'image/jpeg'
        }));
      }
    });
  }

  getTotal(): number {
    if (!this.cartItems || this.cartItems.length === 0) {
      console.log('No cart items found');
      return 0;
    }
    
    const total = this.cartItems.reduce((sum, item) => {
      const price = parseFloat(item.Price?.toString() || '0');
      const quantity = parseInt(item.quantity?.toString() || '1');
      const itemTotal = price * quantity;
      
      console.log(`Item: ${item.Name}, Price: ${price}, Qty: ${quantity}, Total: ${itemTotal}`);
      
      return sum + itemTotal;
    }, 0);
    
    console.log('Cart total:', total);
    return total;
  }

  // Add method to calculate tax (7% of subtotal)
  getTax(): number {
    const subtotal = this.getTotal();
    const tax = Math.round(subtotal * (this.TAX_RATE || 0.07) * 100) / 100;
    return tax;
  }

  // Add method to get shipping cost
  getShipping(): number {
    return this.SHIPPING_COST || 9;
  }

  // Add method to calculate final total (subtotal + tax + shipping)
  getFinalTotal(): number {
    const subtotal = this.getTotal();
    const tax = this.getTax();
    const shipping = this.getShipping();
    
    console.log('Final total calculation:', {
      subtotal: subtotal,
      tax: tax,
      shipping: shipping,
      total: subtotal + tax + shipping,
      cartItems: this.cartItems
    });
    
    return subtotal + tax + shipping;
  }

  // Direct API methods for OrderAPI
  createAddress(addressData: CreateAddressRequest) {
    return this.https.post(`${this.orderApiUrl}/create-address`, addressData);
  }

  createOrder(orderData: CreateOrderRequest) {
    return this.https.post(`${this.orderApiUrl}/create`, orderData);
  }

  addOrderItem(itemData: AddOrderItemRequest) {
    return this.https.post(`${this.orderApiUrl}/add-item`, itemData);
  }

  placeOrder() {
    console.log('Placing order with form data:', this.shippingForm.value);
    if (this.shippingForm.invalid) {
      this.markFormGroupTouched(this.shippingForm);
      alert('Veuillez remplir tous les champs obligatoires correctement');
      return;
    }
    console.log('Placing order with form data:', this.shippingForm.value);
    const customer = localStorage.getItem('customer');
    if (!customer) {
      alert('Veuillez vous connecter pour passer une commande');
      return;
    }

    const customerData = JSON.parse(customer);
    const customerId = customerData.id;
    
    // Set loading state
    this.isLoading = true;
    this.orderError = null;

    // Prepare address data from form
    const addressData: CreateAddressRequest = {
      firstName: this.shippingForm.get('firstName')?.value,
      lastName: this.shippingForm.get('lastName')?.value,
      email: this.shippingForm.get('email')?.value,
      phoneNumber: this.shippingForm.get('phoneNumber')?.value,
      address1: this.shippingForm.get('address')?.value,
      city: this.shippingForm.get('city')?.value,
      stateProvinceId: 0, // You might want to get this from a dropdown
      zipPostalCode: this.shippingForm.get('zipCode')?.value,
      countryId: 0 // You might want to get this from a dropdown
    };

    // Step 1: Create address
    this.createAddress(addressData).subscribe({
      next: (addressResponse: any) => {
        const addressId = addressResponse.addressId;
        
        // Step 2: Create order
        const orderData: CreateOrderRequest = {
          customerId: customerId,
          billingAddressId: addressId,
          shippingAddressId: addressId, // Using same address for billing and shipping
          paymentMethodSystemName: 'Payments.Manual', // Or use this.selectedPaymentMethod
          shippingMethodName: 'Standard', // You could add a shipping method selector in the UI
          orderNotes: ''
        };
        
        this.createOrder(orderData).subscribe({
          next: (orderResponse: any) => {
            const orderId = orderResponse.orderId;
            let itemsProcessed = 0;
            let hasErrors = false;
            
            // If no items, complete the order
            if (this.cartItems.length === 0) {
              this.handleOrderSuccess(orderId);
              return;
            }
            
            // Step 3: Add items to order
            this.cartItems.forEach(item => {
              const orderItem: AddOrderItemRequest = {
                orderId: orderId,
                productId: item.Id,
                quantity: item.quantity || 1,
                unitPriceInclTax: item.Price * (1 + this.TAX_RATE) // Include tax in unit price
              };
              
              this.addOrderItem(orderItem).subscribe({
                next: () => {
                  itemsProcessed++;
                  if (itemsProcessed === this.cartItems.length && !hasErrors) {
                    // All items processed successfully
                    this.handleOrderSuccess(orderId);
                  }
                },
                error: (itemError) => {
                  hasErrors = true;
                  this.handleOrderError(`Error adding item to order: ${itemError.message || 'Unknown error'}`);
                }
              });
            });
          },
          error: (orderError) => {
            this.handleOrderError(`Error creating order: ${orderError.message || 'Unknown error'}`);
          }
        });
      },
      error: (addressError) => {
        this.handleOrderError(`Error creating address: ${addressError.message || 'Unknown error'}`);
      }
    });
  }

  // Enhanced method to clear all cart data and notify components
  private clearAllCartData() {
    const customer = localStorage.getItem('customer');
    
    // Clear all local storage cart data
    localStorage.removeItem('cart');
    localStorage.removeItem('guest_cart');
    
    // Clear the cart items array in the component
    this.cartItems = [];
    
    // Clear the cart in the database for logged-in users
    if (customer) {
      const customerData = JSON.parse(customer);
      const customerId = customerData.id;
      
      // Call API to clear the cart in the database using existing HttpClient
      this.https.delete(`${this.apiUrl}/customers/cart/clear/${customerId}`).subscribe({
        next: () => {
          console.log('Cart cleared from database successfully');
          // Notify other components that cart has been cleared
          this.notifyCartCleared();
        },
        error: (error) => {
          console.error('Error clearing cart from database:', error);
          // Still notify components even if database clear fails
          this.notifyCartCleared();
        }
      });
    } else {
      // For guest users, just notify components
      this.notifyCartCleared();
    }
  }

  // Method to notify other components that cart has been cleared
  private notifyCartCleared() {
    // Dispatch custom event to notify other components
    window.dispatchEvent(new CustomEvent('cartCleared'));
    
    // Also dispatch event with cart count update
    window.dispatchEvent(new CustomEvent('cartCountUpdated', { 
      detail: { count: 0 } 
    }));
    
    console.log('Cart cleared and all components notified');
  }

  // Update the handleOrderSuccess method to use the new clearing logic
  private handleOrderSuccess(orderId: number) {
    this.orderId = orderId;
    this.orderPlaced = true;
    this.isLoading = false;
    
    // Store order details for invoice display
    this.orderDate = new Date();
    this.customerInfo = this.shippingForm.value;
    this.shippingInfo = this.shippingForm.value;
    this.orderItems = [...this.cartItems]; // Store a copy of cart items
    
    // Clear all cart data using the enhanced method
    this.clearAllCartData();
    
    console.log('Order placed successfully with ID:', orderId);
  }

  // Method to print the invoice
  printInvoice() {
    window.print();
  }

  // Helper method to format order date
  getFormattedOrderDate(): string {
    return this.orderDate.toLocaleDateString('fr-FR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  handleOrderError(errorMessage: string) {
    this.isLoading = false;
    this.orderError = errorMessage;
    alert(this.orderError);
  }

  private markFormGroupTouched(formGroup: FormGroup) {
    Object.values(formGroup.controls).forEach(control => {
      control.markAsTouched();
      if (control instanceof FormGroup) {
        this.markFormGroupTouched(control);
      }
    });
  }

  // Helper methods for form validation
  isFieldInvalid(fieldName: string): boolean {
    const field = this.shippingForm.get(fieldName);
    return field ? field.invalid && field.touched : false;
  }

  getErrorMessage(fieldName: string): string {
    const field = this.shippingForm.get(fieldName);
    if (!field) return '';

    if (field.errors?.['required']) {
      return `${fieldName.charAt(0).toUpperCase() + fieldName.slice(1)} is required`;
    }
    
    if (field.errors?.['email']) {
      return 'Please enter a valid email address';
    }
    
    if (field.errors?.['minlength']) {
      const requiredLength = field.errors['minlength'].requiredLength;
      return `${fieldName.charAt(0).toUpperCase() + fieldName.slice(1)} must be at least ${requiredLength} characters`;
    }
    
    if (field.errors?.['pattern']) {
      if (fieldName === 'phoneNumber') {
        return 'Please enter a valid phone number (+216xxxxxxxx)';
      }
      if (fieldName === 'zipCode') {
        return 'Please enter a valid 4-digit ZIP code';
      }
      return 'Please enter a valid format';
    }
    
    return 'Invalid input';
  }

  getImageUrl(item: CartItem): string {
    const paddedId = ('0000000' + (item.pictureId || 0)).slice(-7);
    const seoFilename = item.seoFilename || 'default';
    const extension = this.getImageExtension(item.mimeType || 'image/jpeg');
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
}
