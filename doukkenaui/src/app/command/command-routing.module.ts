import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { CommandComponent } from './command.component';
import { CheckoutComponent } from './checkout/checkout.component';

const routes: Routes = [{ path: '', component: CommandComponent,children:
  [
      { path: 'checkout', component: CheckoutComponent },

  ]
},
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class CommandRoutingModule { }
