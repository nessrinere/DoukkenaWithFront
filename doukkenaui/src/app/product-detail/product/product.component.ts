import { Component, OnInit, HostListener, ViewChild, ElementRef } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ActivatedRoute, Router} from '@angular/router';
import { HttpClient } from '@angular/common/http';

interface CartItemDto {
  customerId: number;
  productId: number;
  quantity: number;
}

@Component({
  selector: 'app-product',
  templateUrl: './product.component.html',
  styleUrls: ['./product.component.css']
})
export class ProductComponent implements OnInit {
  id:any;
  details:any;
  quantity = 1;
  imageSrc:any;
  reviewForm: FormGroup;
  reviews: any[] = [];
  showReviewForm = false;
  submitMessage = '';
  currentCustomerId: number | null = null;
  reviewSectionClass = '';
  productRating: any = null;
  averageRating: number = 0;
  totalReviews: number = 0;
  
  // Cart related properties
  private apiUrl = 'https://localhost:59579/api/customers';
  cartItems: any[] = [];
  showCartPopup = false;

  activeTab: string = 'details';

  increaseQty() {
    this.quantity++;
  }

  decreaseQty() {
    if (this.quantity > 1) {
      this.quantity--;
    }
  }

  constructor (private route: ActivatedRoute, private http: HttpClient, private fb: FormBuilder, private router: Router) {
    // Initialize review form
    this.reviewForm = this.fb.group({
      title: ['', [Validators.required, Validators.minLength(3)]],
      reviewText: ['', [Validators.required, Validators.minLength(10)]],
      rating: [5, [Validators.required, Validators.min(1), Validators.max(5)]]
    });

    this.route.params.subscribe(params => {
      this.id = params['id'];
      // Fetch product details using this ID
    });
    
    this.route.queryParams.subscribe(params => {
      const imageName = params['image'];
      this.imageSrc = 'https://localhost:59579/images/thumbs/' + imageName;
    });

    // Get current customer ID from localStorage
    this.getCurrentCustomerId();
  }
  
  loadProductRating() {
    this.http.get<any>(`https://localhost:59579/api/products/product/${this.id}/rating`)
      .subscribe({
        next: (ratingData) => {
          this.productRating = ratingData;
          this.averageRating = ratingData.averageRating || 0;
          this.totalReviews = ratingData.totalReviews || 0;
          console.log('Product rating loaded:', ratingData);
        },
        error: (error) => {
          console.error('Error loading product rating:', error);
          this.averageRating = 0;
          this.totalReviews = 0;
        }
      });
  }
  
  getStarDisplay(rating: number): string {
    const fullStars = Math.floor(rating);
    const hasHalfStar = rating % 1 >= 0.5;
    const emptyStars = 5 - fullStars - (hasHalfStar ? 1 : 0);
    
    let stars = '★'.repeat(fullStars);
    if (hasHalfStar) {
      stars += '☆';
    }
    stars += '☆'.repeat(emptyStars);
    
    return stars;
  }
    
    ngOnInit() {
    //  console.log("ness:"+this.imageSrc);
    console.log('Loading product details for ID:', this.id);
    this.http.get<any[]>(`https://localhost:59579/api/products/spec/${this.id}`)
        .subscribe({
        next: (prod) => {
          console.log('Product details received:', prod);
          this.details = prod;
          // Load cart items after product details are loaded
          this.loadCartItems();
          // Load product attributes
          this.loadProductAttributes();
        },
        error: (error) => {
          console.error('Error loading product details:', error);
          alert('Error loading product details. Please try again.');
        }
      });
      
    // Load existing reviews for this product
    this.loadReviews();
    
    // Load product rating
    this.loadProductRating();
    
    // Set initial adaptive class
    this.updateReviewSectionClass();
    
    // Re-check customer ID on init in case it was set after constructor
    this.getCurrentCustomerId();
    }
    
    getCurrentCustomerId() {
      // First check for customer object (main storage method)
      const customerData = localStorage.getItem('customer');
      if (customerData) {
        try {
          const customer = JSON.parse(customerData);
          if (customer && customer.id) {
            this.currentCustomerId = parseInt(customer.id);
            console.log('Customer ID found in customer object:', this.currentCustomerId);
            return;
          }
        } catch (error) {
          console.error('Error parsing customer data:', error);
        }
      }
      
      // Fallback: Check multiple possible localStorage keys for customer ID
      const possibleKeys = ['id_cust', 'customerId', 'customer_id', 'userId', 'user_id', 'id'];
      
      for (const key of possibleKeys) {
        const value = localStorage.getItem(key);
        if (value) {
          this.currentCustomerId = parseInt(value);
          console.log(`Customer ID found with key '${key}':`, this.currentCustomerId);
          return;
        }
      }
      
      // If no ID found, log all localStorage contents for debugging
      console.log('No customer ID found. Current localStorage contents:');
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        const value = localStorage.getItem(key!);
        console.log(`${key}: ${value}`);
      }
      
      this.currentCustomerId = null;
    }
    
    @HostListener('window:resize', ['$event'])
    onResize(event: any) {
      this.updateReviewSectionClass();
    }
    
    updateReviewSectionClass() {
      const screenHeight = window.innerHeight;
      const screenWidth = window.innerWidth;
      const reviewCount = this.reviews.length;
      
      // Determine adaptive class based on screen size and content
      if (screenHeight < 400 || (screenWidth < 480 && reviewCount > 3)) {
        this.reviewSectionClass = 'minimal';
      } else if (screenHeight < 600 || (screenWidth < 768 && reviewCount > 2) || reviewCount > 5) {
        this.reviewSectionClass = 'compact';
      } else {
        this.reviewSectionClass = '';
      }
    }

    loadReviews() {
      this.http.get<any[]>(`https://localhost:59579/api/review/product/${this.id}`)
        .subscribe({
          next: (reviews) => {
            this.reviews = reviews;
            // Update adaptive class when reviews are loaded
            this.updateReviewSectionClass();
          },
          error: (error) => {
            console.error('Error loading reviews:', error);
          }
        });
    }

    toggleReviewForm() {
      // Re-check customer ID before showing form
      this.getCurrentCustomerId();
      
      if (!this.currentCustomerId) {
        console.log('No customer ID found when trying to show review form');
        alert('Please login to submit a review. If you are already logged in, please refresh the page.');
        return;
      }
      
      console.log('Customer ID verified:', this.currentCustomerId);
      this.showReviewForm = !this.showReviewForm;
      this.submitMessage = '';
    }

    onSubmitReview() {
      // Re-check customer ID before submitting
      this.getCurrentCustomerId();
      
      console.log('Attempting to submit review...');
      console.log('Form valid:', this.reviewForm.valid);
      console.log('Customer ID:', this.currentCustomerId);
      console.log('Form values:', this.reviewForm.value);
      
      if (!this.reviewForm.valid) {
        this.submitMessage = 'Please fill in all required fields correctly.';
        console.log('Form validation errors:', this.reviewForm.errors);
        Object.keys(this.reviewForm.controls).forEach(key => {
          const control = this.reviewForm.get(key);
          if (control && control.errors) {
            console.log(`${key} errors:`, control.errors);
          }
        });
        return;
      }
      
      if (!this.currentCustomerId) {
        this.submitMessage = 'Please login to submit a review.';
        console.log('No customer ID available for review submission');
        return;
      }
      
      const reviewData = {
        productId: parseInt(this.id),
        customerId: this.currentCustomerId,
        title: this.reviewForm.value.title,
        reviewText: this.reviewForm.value.reviewText,
        rating: this.reviewForm.value.rating
      };
      
      console.log('Submitting review data:', reviewData);

      this.http.post('https://localhost:59579/api/review', reviewData)
        .subscribe({
          next: (response) => {
            console.log('Review submitted successfully:', response);
            this.submitMessage = 'Review submitted successfully!';
            this.reviewForm.reset();
            this.reviewForm.patchValue({ rating: 5 });
            this.showReviewForm = false;
            this.loadReviews(); // Reload reviews
            // Update adaptive class after new review is added
            setTimeout(() => this.updateReviewSectionClass(), 100);
          },
          error: (error) => {
            console.error('Error submitting review:', error);
            console.error('Error details:', error.error);
            this.submitMessage = `Error submitting review: ${error.error?.message || error.message || 'Please try again.'}`;
          }
        });
    }

    getStars(rating: number): string {
      return '★'.repeat(rating) + '☆'.repeat(5 - rating);
    }

    get f() {
      return this.reviewForm.controls;
    }

    // Cart functionality methods
  addToCart(): void {
    console.log('Starting addToCart method');
    if (!this.details) {
      console.error('Product details not loaded');
      alert('Error: Product details not loaded. Please refresh the page.');
      return;
    }

    console.log('Product details:', this.details);
    console.log('Adding item to cart:', this.details.Name, 'Quantity:', this.quantity);
    const customer = localStorage.getItem('customer');
    console.log('Customer data from localStorage:', customer);
    
    if (customer) {
      // User is logged in - save to database
      console.log('User is logged in, saving to database...');
      this.saveItemToDatabase(this.details.Id, this.quantity);
    } else {
      // User is guest - save to localStorage
      console.log('User is guest, saving to localStorage...');
      this.addToLocalStorage();
    }
    
    // Show cart popup
    this.showCartPopup = true;
    this.loadCartItems();
  }

    private addToLocalStorage(): void {
      console.log('Starting addToLocalStorage method');
      
      if (!this.details || !this.details.Id) {
        console.error('Invalid product details');
        alert('Error: Product details are invalid');
        return;
      }

      try {
        const storedCart = localStorage.getItem('guest_cart');
        let cartItems = [];
        
        if (storedCart) {
          try {
            cartItems = JSON.parse(storedCart);
            if (!Array.isArray(cartItems)) {
              console.error('Stored cart is not an array');
              cartItems = [];
            }
          } catch (error) {
            console.error('Error parsing stored cart:', error);
            cartItems = [];
          }
        }
        
        const existingItemIndex = cartItems.findIndex((item: any) => item.Id === this.details.Id);
        
        if (existingItemIndex > -1) {
          // Item already exists, update quantity
          cartItems[existingItemIndex].quantity = (cartItems[existingItemIndex].quantity || 1) + this.quantity;
          console.log('Updated quantity for existing item:', cartItems[existingItemIndex]);
        } else {
          // New item, add to cart
          const newItem = { 
            ...this.details, 
            quantity: this.quantity 
          };
          cartItems.push(newItem);
          console.log('Added new item to cart:', newItem);
        }
        
        localStorage.setItem('guest_cart', JSON.stringify(cartItems));
        console.log('Cart saved to localStorage:', cartItems);
        alert('Item added to cart successfully!');
      } catch (error) {
        console.error('Error saving to localStorage:', error);
        alert('Error saving item to cart. Please try again.');
      }
    }

    private saveItemToDatabase(productId: number, quantity: number): void {
      console.log('Starting saveItemToDatabase method');
      
      // Validate input parameters
      if (!productId || productId <= 0) {
        console.error('Invalid product ID:', productId);
        return;
      }
      
      if (!quantity || quantity <= 0) {
        console.error('Invalid quantity:', quantity);
        return;
      }

      const customer = localStorage.getItem('customer');
      if (!customer) {
        console.log('User not logged in, saving to localStorage only');
        this.addToLocalStorage();
        return;
      }

      try {
        const customerData = JSON.parse(customer);
        console.log('Parsed customer data:', customerData);
        
        if (!customerData.id) {
          console.error('Customer ID not found in customer data');
          alert('Error: Customer ID not found. Please try logging in again.');
          return;
        }

        const cartItemDto: CartItemDto = {
          customerId: customerData.id,
          productId: productId,
          quantity: quantity
        };
        
        console.log('Sending cart item to API:', cartItemDto);
        console.log('API URL:', `${this.apiUrl}/cart/items`); // Using customers API endpoint

        this.http.post(`https://localhost:59579/api/customers/cart/items`, cartItemDto, {
          headers: {
            'Content-Type': 'application/json'
          }
        }).subscribe({
          next: (response: any) => {
            console.log('API Response:', response);
            console.log('Item saved to database:', response.message);
            this.loadCartItems(); // Reload cart items after successful save
            alert('Item added to cart successfully!');
          },
          error: (error) => {
            console.error('Error saving item to database:', error);
            console.error('Error details:', error.error);
            alert('Error saving item to cart. Please try again.');
            // Fallback to localStorage if database save fails
            this.addToLocalStorage();
          }
        });
      } catch (error) {
        console.error('Error processing customer data:', error);
        alert('Error processing customer data. Please try logging in again.');
      }
    }

    buyNow(): void {
    // Add to cart first
    this.addToCart();
    // Navigate to checkout
    this.router.navigate(['/checkout']);
  }

  loadCartItems(): void {
    console.log('Starting loadCartItems method');
    const customer = localStorage.getItem('customer');
    console.log('Customer data from localStorage:', customer);

    if (customer) {
      try {
        // Load from database for logged-in users
        const customerData = JSON.parse(customer);
        console.log('Parsed customer data:', customerData);

        if (!customerData.id) {
          console.error('Customer ID not found in customer data');
          this.cartItems = [];
          return;
        }

        const customerId = customerData.id;
        console.log('Loading cart items for customer ID:', customerId);
        console.log('API URL:', `${this.apiUrl}/cart/items/${customerId}`); // Using customers API endpoint
        
        this.http.get(`https://localhost:59579/api/customers/cart/items/${customerId}`).subscribe({
          next: (response: any) => {
            console.log('API Response:', response);
            if (Array.isArray(response)) {
              this.cartItems = response.map(item => ({
                Id: item.ProductId,
                Name: item.ProductName,
                Price: item.ProductPrice,
                quantity: item.Quantity
              }));
              console.log('Cart items loaded from database:', this.cartItems);
            } else {
              console.log('Response is not an array, setting empty cart');
              this.cartItems = [];
            }
          },
          error: (error) => {
            console.error('Error loading cart items from database:', error);
            console.error('Error details:', error.error);
            alert('Error loading cart items. Please try again.');
            this.cartItems = [];
          }
        });
      } catch (error) {
        console.error('Error processing customer data:', error);
        alert('Error processing customer data. Please try logging in again.');
        this.cartItems = [];
      }
    } else {
      // Load from localStorage for guest users
      console.log('Loading cart items from localStorage');
      const storedCart = localStorage.getItem('guest_cart');
      if (storedCart) {
        try {
          this.cartItems = JSON.parse(storedCart);
          console.log('Cart items loaded from localStorage:', this.cartItems);
        } catch (error) {
          console.error('Error parsing cart data from localStorage:', error);
          this.cartItems = [];
        }
      } else {
        console.log('No cart items found in localStorage');
        this.cartItems = [];
      }
    }
  }

  closeCartPopup() {
    this.showCartPopup = false;
  }

 // Calculate total price including attribute adjustments
 getTotalPrice(): number {
  let total = parseFloat(this.details?.Price || 0);
  
  
  if (this.productAttributes && this.selectedAttributes) {
    this.productAttributes.forEach(attribute => {
      if (this.isMultiSelectAttribute(attribute.AttributeControlType)) {
        // Handle multi-select attributes
        const selectedValues = this.selectedAttributes[attribute.AttributeId] as number[];
        if (selectedValues && Array.isArray(selectedValues)) {
          selectedValues.forEach(valueId => {
            const selectedValue = attribute.Values.find((v: any) => v.Id === valueId);
            if (selectedValue && selectedValue.PriceAdjustment) {
              total += selectedValue.PriceAdjustment;
            }
          });
        }
      } else {
        // Handle single-select attributes
        const selectedValueId = this.selectedAttributes[attribute.AttributeId] as number;
        if (selectedValueId) {
          const selectedValue = attribute.Values.find((v: any) => v.Id === selectedValueId);
          if (selectedValue && selectedValue.PriceAdjustment) {
            total += selectedValue.PriceAdjustment;
          }
        }
      }
    });
  }
  
  return total;
}

  // Method to remove item from cart
  removeItem(id: number) {
    const customer = localStorage.getItem('customer');
    
    if (customer) {
      // For logged-in users, delete from database
      this.deleteItemFromDatabase(id);
    } else {
      // For guest users, remove from localStorage
      this.cartItems = this.cartItems.filter(item => item.Id !== id);
      this.saveCartToLocalStorage();
    }
  }

  // Method to delete item from database
  deleteItemFromDatabase(productId: number): void {
    const customer = localStorage.getItem('customer');
    if (!customer) {
      console.error('No customer found in localStorage');
      return;
    }

    const customerData = JSON.parse(customer);
    const customerId = customerData.id;

    // Call API to delete cart item from database
    this.http.delete(`${this.apiUrl}/${customerId}/cart/items/${productId}`).subscribe({
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

  // Helper method to save cart to localStorage for guests
  saveCartToLocalStorage(): void {
    localStorage.setItem('guest_cart', JSON.stringify(this.cartItems));
  }

   // Product attributes properties
   productAttributes: any[] = [];
   selectedAttributes: { [key: number]: number | number[] } = {}; // Can be single value or array
 
   loadProductAttributes() {
     this.http.get<any>(`https://localhost:59579/api/products/attributes/${this.id}`)
       .subscribe({
         next: (response) => {
           console.log('Product attributes received:', response);
           this.productAttributes = response.attributes || [];
           
           // Set preselected attributes
           this.productAttributes.forEach(attribute => {
             if (this.isMultiSelectAttribute(attribute.AttributeControlType)) {
               // For multi-select, collect all preselected values
               const preselectedValues = attribute.Values
                 .filter((value: any) => value.IsPreSelected)
                 .map((value: any) => value.Id);
               if (preselectedValues.length > 0) {
                 this.selectedAttributes[attribute.AttributeId] = preselectedValues;
               }
             } else {
               // For single-select, get the first preselected value
               const preselectedValue = attribute.Values.find((value: any) => value.IsPreSelected);
               if (preselectedValue) {
                 this.selectedAttributes[attribute.AttributeId] = preselectedValue.Id;
               }
             }
           });
         },
         error: (error) => {
           console.error('Error loading product attributes:', error);
           this.productAttributes = [];
         }
       });
   }
   
   // Check if attribute is single-select
   isSingleSelectAttribute(controlType: string): boolean {
     return ['DropdownList', 'RadioList', 'ColorSquares', 'ImageSquares', 
             'TextBox', 'MultilineTextbox', 'Datepicker', 'FileUpload'].includes(controlType);
   }
   
   // Check if attribute is multi-select
   isMultiSelectAttribute(controlType: string): boolean {
     return ['Checkboxes', 'ReadonlyCheckboxes'].includes(controlType);
   }
   
   // Handle single-select change
   onAttributeChange(attributeId: number, event: Event) {
     const target = event.target as HTMLSelectElement;
     const valueId = parseInt(target.value);
     this.selectedAttributes[attributeId] = valueId;
     console.log('Selected attributes:', this.selectedAttributes);
   }
   
   
   
   // Handle multi-select checkbox change
   onCheckboxChange(attributeId: number, valueId: number, event: Event) {
     const target = event.target as HTMLInputElement;
     const isChecked = target.checked;
     
     if (!this.selectedAttributes[attributeId]) {
       this.selectedAttributes[attributeId] = [];
     }
     
     const selectedValues = this.selectedAttributes[attributeId] as number[];
     
     if (isChecked) {
       // Add value if not already selected
       if (!selectedValues.includes(valueId)) {
         selectedValues.push(valueId);
       }
     } else {
       // Remove value if unchecked
       const index = selectedValues.indexOf(valueId);
       if (index > -1) {
         selectedValues.splice(index, 1);
       }
     }
     
     console.log('Selected attributes:', this.selectedAttributes);
   }
   
   // Check if a value is selected for multi-select attributes
   isValueSelected(attributeId: number, valueId: number): boolean {
     const selectedValues = this.selectedAttributes[attributeId];
     if (Array.isArray(selectedValues)) {
       return selectedValues.includes(valueId);
     }
     return false;
   }
   
   getSelectedAttributeValue(attributeId: number): number | null {
     const selected = this.selectedAttributes[attributeId];
     // For single-select attributes, return the number directly
     if (typeof selected === 'number') {
       return selected;
     }
     // For multi-select attributes, we don't use this method
     return null;
   }
   
  
   
   // Helper method to get preselected value for an attribute
   getPreselectedValue(attribute: any): number | null {
     const preselectedValue = attribute.Values.find((value: any) => value.IsPreSelected);
     return preselectedValue ? preselectedValue.Id : null;
   }

   setActiveTab(tab: string): void {
     this.activeTab = tab;
   }
}



