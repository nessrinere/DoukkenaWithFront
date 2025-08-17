import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { ProductDetailComponent } from './product-detail.component';
import { ProductComponent } from './product/product.component';

const routes: Routes = [{ path: '', component: ProductDetailComponent , children: [
       
    
  { path: 'product/:id', component: ProductComponent },
]}];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class ProductDetailRoutingModule { }
