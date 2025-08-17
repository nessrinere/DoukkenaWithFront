import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';

import { CommandRoutingModule } from './command-routing.module';
import { CommandComponent } from './command.component';
import { CheckoutComponent } from './checkout/checkout.component';
import { HomeComponent } from '../home/home.component';
import { HomeModule } from "../home/home.module";
import { CoreModule } from '../core/core.module';

@NgModule({
  declarations: [
    CommandComponent,
    CheckoutComponent,

  ],
  imports: [
    CommonModule,
    FormsModule,
    CommandRoutingModule,
    ReactiveFormsModule,
    RouterModule,
    HomeModule,
    CoreModule
]
})
export class CommandModule {

 }