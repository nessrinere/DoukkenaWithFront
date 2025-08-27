import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { Product, ProductVariant } from '../shared/components/product-card/product-card.component';




@Component({
  selector: 'app-home',
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.css']
})
export class HomeComponent implements OnInit {
  ngOnInit(): void {
    throw new Error('Method not implemented.');
  }
}