import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { HttpClient } from '@angular/common/http';

export interface FilterCriteria {
  priceRange?: { min: number; max: number };
  categoryIds?: number[];
  onSale?: boolean;
  products?: any[];
}

@Component({
  selector: 'app-filter',
  templateUrl: './filter.component.html',
  styleUrls: ['./filter.component.css']
})
export class FilterComponent implements OnInit {
  // Price filter properties
  minPrice: number = 0;
  maxPrice: number = 1000;
  onSaleOnly: boolean = false;

  // Category filter properties
  categories: any[] = [];
  selectedCategoryIds: number[] = [];
  expandedCategories: Set<number> = new Set();

  // Section expansion state
  expandedSections = {
    categories: true,
    price: false,
    offers: false
  };

  // Filtered products count for display
  filteredProductsCount: number = 0;

  @Input() products: any[] = [];
  @Output() filterChange = new EventEmitter<any>();

  constructor(private http: HttpClient) {}

  ngOnInit(): void {
    this.fetchCategories();
    setTimeout(() => {
      this.getAllProducts();
    }, 100);
  }

  // Toggle section expansion
  toggleSection(section: 'categories' | 'price' | 'offers'): void {
    this.expandedSections[section] = !this.expandedSections[section];
  }

  // Clear category filters
  clearCategoryFilters(): void {
    this.selectedCategoryIds = [];
    this.applyFilters();
  }

  // Clear price filters only
  clearPriceFilters(): void {
    this.minPrice = 0;
    this.maxPrice = 1000;
    this.applyFilters();
  }

  // Check if any filters are currently active
  hasActiveFilters(): boolean {
    return this.selectedCategoryIds.length > 0 || 
           this.minPrice > 0 || 
           this.maxPrice < 1000 || 
           this.onSaleOnly;
  }

  // Set price range preset
  setPriceRange(min: number, max: number): void {
    this.minPrice = min;
    this.maxPrice = max;
    this.applyFilters();
  }

  // Handle image error
  handleImageError(event: Event): void {
    const target = event.target as HTMLImageElement;
    if (target) {
      target.style.display = 'none';
    }
  }

  // Fetch categories from API (same endpoint as navbar)
  fetchCategories(): void {
    // Use the same endpoint as navbar for consistency
    this.http.get<any[]>('https://localhost:59579/api/categories/homeV')
      .subscribe({
        next: (categories) => {
          this.categories = categories || [];
          console.log('Categories loaded in filter:', this.categories);
          if (categories && categories.length > 0) {
            console.log('Sample category structure:', categories[0]);
          }
        },
        error: (err) => {
          console.error('Failed to load categories from homeV:', err);
          // Fallback to the simple categories endpoint
          this.http.get<any[]>('https://localhost:59579/api/categories')
            .subscribe({
              next: (categories) => {
                this.categories = categories || [];
                console.log('Categories loaded from fallback:', this.categories);
              },
              error: (fallbackErr) => {
                console.error('Both category endpoints failed:', fallbackErr);
                this.categories = [];
              }
            });
        }
      });
  }

  // Check if category is selected
  isCategorySelected(categoryId: number): boolean {
    return this.selectedCategoryIds.includes(categoryId);
  }

  // Check if category is expanded
  isCategoryExpanded(categoryId: number): boolean {
    return this.expandedCategories.has(categoryId);
  }

  // Toggle category expansion
  toggleCategoryExpansion(categoryId: number, event: Event): void {
    event.stopPropagation(); // Prevent category selection when clicking expand button
    if (this.expandedCategories.has(categoryId)) {
      this.expandedCategories.delete(categoryId);
    } else {
      this.expandedCategories.add(categoryId);
    }
  }

  // Handle category selection (parent or child)
  onCategorySelect(categoryId: number): void {
    const index = this.selectedCategoryIds.indexOf(categoryId);
    if (index > -1) {
      // Remove category if already selected
      this.selectedCategoryIds.splice(index, 1);
    } else {
      // Add category if not selected
      this.selectedCategoryIds.push(categoryId);
    }
    // Apply filters immediately when category is selected
    this.applyFilters();
  }

  // Handle parent category selection with children
  onParentCategorySelect(category: any): void {
    const categoryId = category.Id;
    const hasChildren = category.Children && category.Children.length > 0;
    
    if (hasChildren) {
      // If parent has children, toggle expansion
      if (this.expandedCategories.has(categoryId)) {
        this.expandedCategories.delete(categoryId);
      } else {
        this.expandedCategories.add(categoryId);
      }
      
      // Also allow selection of parent category
      const index = this.selectedCategoryIds.indexOf(categoryId);
      if (index > -1) {
        this.selectedCategoryIds.splice(index, 1);
      } else {
        this.selectedCategoryIds.push(categoryId);
      }
      this.applyFilters();
    } else {
      // If no children, select the category directly
      this.onCategorySelect(categoryId);
    }
  }

  // Apply comprehensive filter (both category and price)
  applyFilters(): void {
    console.log('Applying comprehensive filter');
    console.log('Current filters:', {
      minPrice: this.minPrice,
      maxPrice: this.maxPrice,
      selectedCategories: this.selectedCategoryIds,
      onSale: this.onSaleOnly
    });
    
    // If no filters are applied, get all homepage products
    if (this.minPrice === 0 && this.maxPrice >= 1000 && this.selectedCategoryIds.length === 0 && !this.onSaleOnly) {
      this.getAllProducts();
      return;
    }
    
    // Build query parameters object for proper array handling
    const params: any = {};
    
    // Add price range
    if (this.minPrice > 0) {
      params.minPrice = this.minPrice;
    }
    if (this.maxPrice < 1000) {
      params.maxPrice = this.maxPrice;
    }
    
    // Add category filters as array
    if (this.selectedCategoryIds.length > 0) {
      params.categoryIds = this.selectedCategoryIds;
    }
    
    // Add sale filter as boolean
    if (this.onSaleOnly) {
      params.onSale = true;
    }
    
    console.log('Filter params:', params);
    
    // Use HttpClient with params option for proper array serialization
    this.http.get<any>('https://localhost:59579/api/products/filter', { params })
      .subscribe({
        next: (response) => {
          console.log('Filtered products received:', response);
          const products = response.products || response;
          this.filteredProductsCount = Array.isArray(products) ? products.length : 0;
          this.filterChange.emit({
            products: products,
            priceRange: { min: this.minPrice, max: this.maxPrice },
            categoryIds: this.selectedCategoryIds,
            onSale: this.onSaleOnly
          });
        },
        error: (err) => {
          console.error('Filter failed:', err);
          console.error('Error details:', err.error);
          // If filter endpoint fails, try alternative approach
          if (this.selectedCategoryIds.length > 0) {
            // Try category-specific endpoint for the first selected category
            this.getProductsByCategory(this.selectedCategoryIds[0]);
          } else {
            // Fallback to all products
            this.getAllProducts();
          }
        }
      });
  }

  // Fallback method to get products by category
  private getProductsByCategory(categoryId: number): void {
    console.log('Fetching products for category:', categoryId);
    this.http.get<any[]>(`https://localhost:59579/api/products/category/${categoryId}/products`)
      .subscribe({
        next: (products) => {
          console.log('Products by category received:', products);
          this.filteredProductsCount = Array.isArray(products) ? products.length : 0;
          this.filterChange.emit({
            products: products || [],
            categoryIds: [categoryId]
          });
        },
        error: (err) => {
          console.error('Category products failed:', err);
          this.getAllProducts();
        }
      });
  }

  // Fallback method to get all products
  private getAllProducts(): void {
    console.log('Fetching all products');
    this.http.get<any[]>('https://localhost:59579/api/products/homepage')
      .subscribe({
        next: (products) => {
          console.log('All products received:', products);
          this.filteredProductsCount = Array.isArray(products) ? products.length : 0;
          this.filterChange.emit({
            products: products || []
          });
        },
        error: (err) => {
          console.error('All products failed:', err);
          this.filteredProductsCount = 0;
          this.filterChange.emit({
            products: [],
            error: 'Failed to load products'
          });
        }
      });
  }

  // Clear all filters
  clearFilters(): void {
    this.minPrice = 0;
    this.maxPrice = 1000;
    this.onSaleOnly = false;
    this.selectedCategoryIds = [];
    this.expandedCategories.clear();
    this.filteredProductsCount = 0;
    this.getAllProducts();
  }

  // Handle sale filter change
  onSaleFilterChange(): void {
    console.log('Sale filter changed:', this.onSaleOnly);
    this.applyFilters();
  }

  // Handle slider change
  onSliderChange(event: any): void {
    const value = parseInt(event.target.value);
    if (!isNaN(value)) {
      this.maxPrice = value;
      console.log('Slider changed to:', this.maxPrice);
      this.applyFilters();
    }
  }

  // Handle min price input change
  onMinPriceChange(event: any): void {
    const value = parseInt(event.target.value);
    this.minPrice = isNaN(value) ? 0 : Math.max(0, value);
    console.log('Min price changed to:', this.minPrice);
    // Debounce the filter application for better UX
    this.debounceFilter();
  }

  // Handle max price input change
  onMaxPriceChange(event: any): void {
    const value = parseInt(event.target.value);
    this.maxPrice = isNaN(value) ? 1000 : Math.max(0, value);
    console.log('Max price changed to:', this.maxPrice);
    // Debounce the filter application for better UX
    this.debounceFilter();
  }

  // Debounce filter application for price inputs
  private filterTimeout: any;
  private debounceFilter(): void {
    if (this.filterTimeout) {
      clearTimeout(this.filterTimeout);
    }
    this.filterTimeout = setTimeout(() => {
      this.applyFilters();
    }, 500); // Wait 500ms after user stops typing
  }
}
