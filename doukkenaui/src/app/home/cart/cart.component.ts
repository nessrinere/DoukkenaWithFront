import { Component, OnInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { of, forkJoin } from 'rxjs';
import { catchError, map } from 'rxjs/operators';

@Component({
  selector: 'app-cart',
  templateUrl: './cart.component.html',
  styleUrls: ['./cart.component.css']
})
export class CartComponent implements OnInit {

  featuredProducts: any[] = [];
  productRatings: { [productId: number]: { rating: number; total: number } } = {};

  constructor(private https: HttpClient) {}

  ngOnInit() {
    this.loadFeaturedProducts();
  }

  loadFeaturedProducts() {
    this.https.get<any[]>('https://localhost:59579/api/products/')
      .subscribe({
        next: (products) => {
          if (!products || products.length === 0) {
            this.featuredProducts = [];
            return;
          }

          const pictureRequests = products.map(product => {
            if (!product.Id) {
              return of({ PictureId: 0, SeoFilename: 'default', mimeType: 'image/jpeg' });
            }
            
            return this.https.get<any>(`https://localhost:59579/api/pictures/by-product/${product.Id}`);
          });

          forkJoin(pictureRequests).subscribe({
            next: (pictures) => {
              const productsWithPictures = products.map((product, index) => {
                const pic = pictures[index];
                
                return {
                  ...product,
                  pictureId: pic?.PictureId ?? 0,
                  seoFilename: pic?.SeoFilename ?? 'default',
                  mimeType: pic?.mimeType ?? 'image/jpeg'
                };
              });
              
              this.loadRatingsAndSort(productsWithPictures);
            },
            error: (err) => {
              console.error('Error loading pictures:', err);
              this.loadRatingsAndSort(products.map(product => ({
                ...product,
                pictureId: 0,
                seoFilename: 'default',
                mimeType: 'image/jpeg'
              })));
            }
          });
        },
        error: (err) => {
          console.error('Error loading products:', err);
          this.featuredProducts = [];
        }
      });
  }

  loadRatingsAndSort(products: any[]): void {
    if (!products || products.length === 0) {
      return;
    }

    const ratingRequests = products.map(product => {
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
        // Store all ratings
        ratings.forEach(ratingData => {
          if (ratingData.productId) {
            this.productRatings[ratingData.productId] = {
              rating: ratingData.rating,
              total: ratingData.total
            };
          }
        });

        // Sort products by highest rating and take top 4
        const sortedProducts = products.sort((a, b) => {
          const ratingA = this.productRatings[a.Id]?.rating || 0;
          const ratingB = this.productRatings[b.Id]?.rating || 0;
          return ratingB - ratingA;
        }).slice(0, 4); // Take only top 4 products

        this.featuredProducts = sortedProducts;
        console.log('Featured products (top rated):', this.featuredProducts.map(p => ({
          id: p.Id,
          name: p.Name,
          rating: this.productRatings[p.Id]?.rating || 0
        })));
      },
      error: (err) => {
        console.error('Error loading ratings:', err);
        this.featuredProducts = products.slice(0, 4); // Fallback to first 4 products
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

  onImageError(event: any): void {
    console.log('Image failed to load, using fallback:', event.target.src);
    event.target.src = 'assets/image.png';
  }

  getStarIcons(rating: number): string[] {
    const stars = [];
    const fullStars = Math.floor(rating);
    const hasHalfStar = rating % 1 >= 0.5;
    
    for (let i = 0; i < fullStars; i++) {
      stars.push('★');
    }
    
    if (hasHalfStar) {
      stars.push('☆');
    }
    
    while (stars.length < 5) {
      stars.push('☆');
    }
    
    return stars;
  }
}
