import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormsModule } from '@angular/forms';

import { ProductDetailRoutingModule } from './product-detail-routing.module';
import { ProductDetailComponent } from './product-detail.component';
import { ProductComponent } from './product/product.component';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { HttpClient, HttpClientModule } from '@angular/common/http';
import { HomeComponent } from '../home/home.component';
import { HomeModule } from "../home/home.module";
import { CoreModule } from '../core/core.module';

@NgModule({
  declarations: [
    ProductDetailComponent,
    ProductComponent,
  ],
  imports: [
    CommonModule,
    ProductDetailRoutingModule,
    RouterModule,
    HttpClientModule,
    ReactiveFormsModule,
    FormsModule,
    HomeModule,
    CoreModule
]
})
export class ProductDetailModule { }
