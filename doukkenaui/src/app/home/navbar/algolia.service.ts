import { Injectable } from '@angular/core';

declare const algoliasearch: any;

@Injectable({
  providedIn: 'root'
})
export class AlgoliaService {
  private client: any;
  private index: any;
  private isInitialized = false;

  constructor() {
    this.initializeAlgolia();
  }

  private async initializeAlgolia() {
    try {
      // Load Algolia script if not already loaded
      if (typeof algoliasearch === 'undefined') {
        await this.loadAlgoliaScript();
      }
      
      // Initialize client - replace with your actual credentials
      this.client = algoliasearch('KASW3K68MI', 'd4cb123f7437004f69410bec22f72703');
      this.index = this.client.initIndex('productsfile');
      this.isInitialized = true;
      
      console.log('Algolia initialized successfully');
    } catch (error) {
      console.error('Failed to initialize Algolia:', error);
      this.isInitialized = false;
    }
  }

  private loadAlgoliaScript(): Promise<void> {
    return new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = 'https://cdn.jsdelivr.net/npm/algoliasearch@4/dist/algoliasearch-lite.umd.js';
      script.onload = () => resolve();
      script.onerror = () => reject(new Error('Failed to load Algolia script'));
      document.head.appendChild(script);
    });
  }

  private async ensureInitialized(): Promise<boolean> {
    if (!this.isInitialized) {
      await this.initializeAlgolia();
    }
    return this.isInitialized;
  }

  async searchProducts(query: string): Promise<any> {
    try {
      const isReady = await this.ensureInitialized();
      if (!isReady) {
        throw new Error('Algolia client not initialized');
      }

      const results = await this.index.search(query, {
        hitsPerPage: 20,
        attributesToRetrieve: ['*'],
        attributesToHighlight: ['name', 'description'],
      });
      return results;
    } catch (error) {
      console.error('Algolia search error:', error);
      throw error;
    }
  }

  async searchWithFilters(query: string, filters?: any): Promise<any> {
    try {
      const isReady = await this.ensureInitialized();
      if (!isReady) {
        throw new Error('Algolia client not initialized');
      }

      const searchParams: any = {
        hitsPerPage: 20,
        attributesToRetrieve: ['*'],
        attributesToHighlight: ['name', 'description'],
      };

      if (filters) {
        if (filters.category) {
          searchParams.filters = `categoryId:${filters.category}`;
        }
        if (filters.priceRange) {
          searchParams.numericFilters = [`price >= ${filters.priceRange.min}`, `price <= ${filters.priceRange.max}`];
        }
      }

      const results = await this.index.search(query, searchParams);
      return results;
    } catch (error) {
      console.error('Algolia search with filters error:', error);
      throw error;
    }
  }

  async getSearchSuggestions(query: string): Promise<any> {
    try {
      const isReady = await this.ensureInitialized();
      if (!isReady) {
        return [];
      }

      const results = await this.index.search(query, {
        hitsPerPage: 5,
        //attributesToRetrieve: ['name', 'price', 'imageUrl'],
        attributesToRetrieve: ['*'],
        attributesToHighlight: ['name'],
      });
      console.log('Search suggestions:', results.hits[0]['Build your own computer']);
      return results.hits;
    } catch (error) {
      console.error('Algolia suggestions error:', error);
      return [];
    }
  }
}