import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { HomeRoutingModule } from './home-routing.module';
import { HomeComponent } from './home.component';
import { HeaderComponent } from './header/header.component';
import { FooterComponent } from './footer/footer.component';
import { CartComponent } from './cart/cart.component';
import { LoginComponent } from './login/login.component';
import { FormGroup, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { RegisterComponent } from './register/register.component';
import { HttpClientModule } from '@angular/common/http';
import { CartpopComponent } from './cartpop/cartpop.component';
import { NavbarComponent } from './navbar/navbar.component';
import { FilterComponent } from './filter/filter.component';
import { SharedModule } from '../shared/shared.module';
import { CoreModule } from '../core/core.module';
import { WishlistpopComponent } from './wishlistpop/wishlistpop.component';

@NgModule({
  declarations: [
    HomeComponent,
    HeaderComponent,
    FooterComponent,
    CartComponent,
    LoginComponent,
    RegisterComponent,
    CartpopComponent,
    NavbarComponent,
    FilterComponent,
    WishlistpopComponent
  ],
  imports: [
    CommonModule,
    HomeRoutingModule,
    FormsModule,
    RouterModule,
    HttpClientModule,
    ReactiveFormsModule,
    SharedModule,
    CoreModule
  ],
   exports: [
    FooterComponent,
    CartComponent,
    NavbarComponent
  ]
})
export class HomeModule { }
