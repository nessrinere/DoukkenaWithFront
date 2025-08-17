import { Component, OnInit, HostListener } from '@angular/core';
import { Router } from '@angular/router';

@Component({
  selector: 'app-navbar',
  templateUrl: './navbar.component.html',
  styleUrls: ['./navbar.component.css']
})
export class NavbarComponent implements OnInit {
  // Search functionality
  searchQuery: string = '';

  // Mobile menu state
  showMobileMenu: boolean = false;

  // User menu state
  showUserMenu: boolean = false;

  // Cart and wishlist counts (mock data - replace with real service)
  cartCount: number = 0;
  wishlistCount: number = 0;

  // User authentication state (mock data - replace with real auth service)
  isLoggedIn: boolean = false;
  userName: string = '';
  userEmail: string = '';
  userAvatar: string = '';

  constructor(private router: Router) {}

  ngOnInit(): void {
    // Initialize component
    this.loadUserData();
    this.loadCartData();
    this.loadWishlistData();
  }

  // Search functionality
  onSearch(): void {
    if (this.searchQuery.trim()) {
      this.router.navigate(['/search'], { 
        queryParams: { q: this.searchQuery.trim() } 
      });
      this.searchQuery = '';
      this.closeMobileMenu();
    }
  }

  // Mobile menu controls
  toggleMobileMenu(): void {
    this.showMobileMenu = !this.showMobileMenu;
    this.showUserMenu = false; // Close user menu when mobile menu opens
    
    // Prevent body scroll when mobile menu is open
    if (this.showMobileMenu) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
  }

  closeMobileMenu(): void {
    this.showMobileMenu = false;
    document.body.style.overflow = '';
  }

  // User menu controls
  toggleUserMenu(): void {
    this.showUserMenu = !this.showUserMenu;
  }

  // Cart functionality
  toggleCart(): void {
    // Navigate to cart page or open cart modal
    this.router.navigate(['/cart']);
  }

  // Wishlist functionality
  toggleWishlist(): void {
    // Navigate to wishlist page or open wishlist modal
    this.router.navigate(['/wishlist']);
  }

  // Authentication
  openLoginModal(): void {
    // Open login modal or navigate to login page
    this.router.navigate(['/auth/login']);
  }

  logout(): void {
    // Implement logout logic
    this.isLoggedIn = false;
    this.userName = '';
    this.userEmail = '';
    this.userAvatar = '';
    this.showUserMenu = false;
    
    // Clear any stored user data
    localStorage.removeItem('user');
    sessionStorage.removeItem('user');
    
    // Navigate to home page
    this.router.navigate(['/']);
  }

  // Load user data (mock implementation)
  private loadUserData(): void {
    // Check if user is logged in (replace with real auth service)
    const userData = localStorage.getItem('user') || sessionStorage.getItem('user');
    
    if (userData) {
      try {
        const user = JSON.parse(userData);
        this.isLoggedIn = true;
        this.userName = user.name || 'User';
        this.userEmail = user.email || '';
        this.userAvatar = user.avatar || '';
      } catch (error) {
        console.error('Error parsing user data:', error);
        this.isLoggedIn = false;
      }
    }
  }

  // Load cart data (mock implementation)
  private loadCartData(): void {
    // Replace with real cart service
    const cartData = localStorage.getItem('cart');
    if (cartData) {
      try {
        const cart = JSON.parse(cartData);
        this.cartCount = cart.items?.length || 0;
      } catch (error) {
        console.error('Error parsing cart data:', error);
        this.cartCount = 0;
      }
    }
  }

  // Load wishlist data (mock implementation)
  private loadWishlistData(): void {
    // Replace with real wishlist service
    const wishlistData = localStorage.getItem('wishlist');
    if (wishlistData) {
      try {
        const wishlist = JSON.parse(wishlistData);
        this.wishlistCount = wishlist.items?.length || 0;
      } catch (error) {
        console.error('Error parsing wishlist data:', error);
        this.wishlistCount = 0;
      }
    }
  }

  // Close dropdowns when clicking outside
  @HostListener('document:click', ['$event'])
  onDocumentClick(event: Event): void {
    const target = event.target as HTMLElement;
    
    // Close user menu if clicking outside
    if (!target.closest('.user-menu')) {
      this.showUserMenu = false;
    }
  }

  // Close mobile menu on escape key
  @HostListener('document:keydown.escape')
  onEscapeKey(): void {
    if (this.showMobileMenu) {
      this.closeMobileMenu();
    }
    if (this.showUserMenu) {
      this.showUserMenu = false;
    }
  }

  // Handle window resize
  @HostListener('window:resize')
  onWindowResize(): void {
    // Close mobile menu on larger screens
    if (window.innerWidth > 768 && this.showMobileMenu) {
      this.closeMobileMenu();
    }
  }

  // Update cart count (called from other components)
  updateCartCount(count: number): void {
    this.cartCount = count;
  }

  // Update wishlist count (called from other components)
  updateWishlistCount(count: number): void {
    this.wishlistCount = count;
  }

  // Update user data (called from auth service)
  updateUserData(user: any): void {
    this.isLoggedIn = true;
    this.userName = user.name || 'User';
    this.userEmail = user.email || '';
    this.userAvatar = user.avatar || '';
  }
} 