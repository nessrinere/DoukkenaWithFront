import { Component, Input, OnInit, OnDestroy, AfterViewInit } from '@angular/core';
import instantsearch from 'instantsearch.js';
import { relatedProducts } from 'instantsearch.js/es/widgets';
import { liteClient as algoliasearch } from 'algoliasearch/lite';

@Component({
  selector: 'app-recommendations',
  template: `
    <div class="recommendations-container">
      <h3>{{title}}</h3>
      <div [id]="containerId" class="recommendations-grid"></div>
    </div>
  `,
  styleUrls: ['./recommendations.component.css']
})
export class RecommendationsComponent implements OnInit, OnDestroy, AfterViewInit {
  @Input() productIds: number[] = [];
  @Input() containerId: string = 'recommend-container';
  @Input() title: string = 'Recommended Products';

  private searchClient: any;
  private searchInstance: any;

  constructor() {
    // Initialize Algolia client directly in constructor
    this.searchClient = algoliasearch('KASW3K68MI', 'd4cb123f7437004f69410bec22f72703');
  }

  ngOnInit(): void {}

  ngAfterViewInit(): void {
    if (this.productIds.length > 0) {
      this.loadRecommendations();
    }
  }

  ngOnDestroy(): void {
    if (this.searchInstance) {
      this.searchInstance.dispose();
    }
  }

  private loadRecommendations(): void {
    // Convert product IDs to Algolia object IDs
    const objectIDs = this.productIds.map(id => `${id}_dashboard_generated_id`);
    
    // Clean up existing instance
    if (this.searchInstance) {
      this.searchInstance.dispose();
    }

    setTimeout(() => {
      this.searchInstance = instantsearch({
        searchClient: this.searchClient,
        indexName: 'productsfile',
      }).addWidgets([
        relatedProducts({
          container: `#${this.containerId}`,
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
            header: `<h3>${this.title}</h3>`,
            empty: '<p>No recommendations available</p>'
          }
        }),
      ]);

      this.searchInstance.start();
    }, 100);
  }

  updateRecommendations(newProductIds: number[]): void {
    this.productIds = newProductIds;
    this.loadRecommendations();
  }
}