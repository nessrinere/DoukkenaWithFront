import { Component, Input, Output, EventEmitter } from '@angular/core';

export interface ProductVariant {
  id: string;
  name: string;
  color?: string;
  size?: string;
  price?: number;
  inStock?: boolean;
}

export interface Product {
  id: string;
  name: string;
  category: string;
  imageUrl: string;
  currentPrice: number;
  originalPrice?: number;
  discountPercentage?: number;
  rating?: number;
  reviewCount?: number;
  inStock: boolean;
  features?: string[];
  variants?: ProductVariant[];
  description?: string;
}

@Component({
  selector: 'app-product-card',
  templateUrl: './product-card.component.html',
  styleUrls: ['./product-card.component.css']
})
export class ProductCardComponent {
  @Input() product!: Product;
  @Output() addToCartEvent = new EventEmitter<{product: Product, variant?: ProductVariant, quantity?: number}>();
  @Output() addToWishlistEvent = new EventEmitter<Product>();
  @Output() removeFromWishlistEvent = new EventEmitter<Product>();
  @Output() quickViewEvent = new EventEmitter<Product>();

  // State
  loading = false;
  isInWishlist = false;
  isInCompare = false;
  selectedVariant?: ProductVariant;
  quantity = 1;

  // Math object for template access
  Math = Math;

  // Image handling
  onImageLoad(): void {
    this.loading = false;
  }

  onImageError(): void {
    this.loading = false;
    // Handle image error
  }

  // Quick actions
  addToCart(): void {
    this.addToCartEvent.emit({
      product: this.product,
      variant: this.selectedVariant,
      quantity: this.quantity
    });
  }

  toggleWishlist(event: Event): void {
    event.preventDefault();
    event.stopPropagation();
    this.isInWishlist = !this.isInWishlist;
    if (this.isInWishlist) {
      this.addToWishlistEvent.emit(this.product);
    } else {
      this.removeFromWishlistEvent.emit(this.product);
    }
  }

  toggleCompare(event: Event): void {
    event.preventDefault();
    event.stopPropagation();
    this.isInCompare = !this.isInCompare;
    // Implement compare logic
  }

  quickView(event: Event): void {
    event.preventDefault();
    event.stopPropagation();
    this.quickViewEvent.emit(this.product);
  }

  selectVariant(variant: ProductVariant): void {
    this.selectedVariant = variant;
  }

  // Utility methods
  getStars(rating?: number): string {
    if (!rating) return '☆☆☆☆☆';
    const fullStars = Math.floor(rating);
    const hasHalfStar = rating % 1 !== 0;
    const emptyStars = 5 - fullStars - (hasHalfStar ? 1 : 0);
    
    return '★'.repeat(fullStars) + (hasHalfStar ? '☆' : '') + '☆'.repeat(emptyStars);
  }

  getDiscountPercentage(): number {
    if (!this.product.originalPrice || !this.product.currentPrice) return 0;
    return Math.round(((this.product.originalPrice - this.product.currentPrice) / this.product.originalPrice) * 100);
  }

  isOnSale(): boolean {
    return this.getDiscountPercentage() > 0;
  }

  getCurrentPrice(): number {
    return this.product.currentPrice || 0;
  }

  getOriginalPrice(): number {
    return this.product.originalPrice || this.product.currentPrice || 0;
  }

  getRating(): number {
    return this.product.rating || 0;
  }

  getReviewCount(): number {
    return this.product.reviewCount || 0;
  }

  getDiscountPercentageValue(): number {
    return this.product.discountPercentage || this.getDiscountPercentage();
  }
}

// Add CSS animations for notifications
const style = document.createElement('style');
style.textContent = `
  @keyframes slideInRight {
    from {
      transform: translateX(100%);
      opacity: 0;
    }
    to {
      transform: translateX(0);
      opacity: 1;
    }
  }
  
  @keyframes slideOutRight {
    from {
      transform: translateX(0);
      opacity: 1;
    }
    to {
      transform: translateX(100%);
      opacity: 0;
    }
  }
`;
document.head.appendChild(style); 