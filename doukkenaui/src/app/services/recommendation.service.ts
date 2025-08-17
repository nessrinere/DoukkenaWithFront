import { Injectable } from '@angular/core';
import instantsearch from 'instantsearch.js';
import { relatedProducts } from 'instantsearch.js/es/widgets';
import { liteClient as algoliasearch } from 'algoliasearch/lite';

@Injectable({
  providedIn: 'root'
})
export class RecommendationService {
  private searchClient = algoliasearch('KASW3K68MI', 'd4cb123f7437004f69410bec22f72703');
  private searchInstances: Map<string, any> = new Map();

  constructor() {}

  initializeRecommendations(containerId: string, objectIDs: string[]): void {
    // Clean up existing instance if it exists
    if (this.searchInstances.has(containerId)) {
      this.searchInstances.get(containerId).dispose();
    }

    const search = instantsearch({
      searchClient: this.searchClient,
      indexName: 'productsfile',
    }).addWidgets([
      relatedProducts({
        container: `#${containerId}`,
        objectIDs: objectIDs,
        templates: {
          item: `
            <div class="recommendation-item">
              <img src="{{image}}" alt="{{name}}" class="rec-image" />
              <h4 class="rec-title">{{name}}</h4>
              <p class="rec-price">{{price}} DNT</p>
              <button class="rec-btn" onclick="window.location.href='/product/product/{{objectID}}'">View Product</button>
            </div>
          `,
          header: '<h3>Recommended for You</h3>',
          empty: '<p>No recommendations available</p>'
        }
      }),
    ]);

    search.start();
    this.searchInstances.set(containerId, search);
  }

  destroyRecommendations(containerId: string): void {
    if (this.searchInstances.has(containerId)) {
      this.searchInstances.get(containerId).dispose();
      this.searchInstances.delete(containerId);
    }
  }

  // Method to get product ID from your current product data
  getAlgoliaObjectId(productId: number): string {
    // You may need to adjust this mapping based on how your products are indexed in Algolia
    return `${productId}_dashboard_generated_id`;
  }
}