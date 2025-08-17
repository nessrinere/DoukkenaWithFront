import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CartpopComponent } from './cartpop.component';

describe('CartpopComponent', () => {
  let component: CartpopComponent;
  let fixture: ComponentFixture<CartpopComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [CartpopComponent]
    });
    fixture = TestBed.createComponent(CartpopComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
