import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { HomeComponent } from './home.component';
import { CartComponent } from './cart/cart.component';
import { HeaderComponent } from './header/header.component';
import { FooterComponent } from './footer/footer.component';
import { LoginComponent } from './login/login.component';
import { RegisterComponent } from './register/register.component';
import { CartpopComponent } from './cartpop/cartpop.component';
import { NavbarComponent } from './navbar/navbar.component';
import { FilterComponent } from './filter/filter.component';



const routes: Routes = [{ path: '', component: HomeComponent , children: [
       
    
  { path: 'cart', component: CartComponent },
  { path: 'header', component: HeaderComponent },
  { path: 'footer', component:FooterComponent },
  {path: 'login',  component:LoginComponent},
  {path: 'register',  component:RegisterComponent},
  {path:'popcart',  component:CartpopComponent},
  {path:'navbar',component:NavbarComponent},
{path:'filter',component:FilterComponent},

  { path: '**', pathMatch: 'full', redirectTo: '' }
]
}];


@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class HomeRoutingModule { }
