import { ComponentFixture, TestBed } from '@angular/core/testing';

import { WishlistpopComponent } from './wishlistpop.component';

describe('WishlistpopComponent', () => {
  let component: WishlistpopComponent;
  let fixture: ComponentFixture<WishlistpopComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [WishlistpopComponent]
    });
    fixture = TestBed.createComponent(WishlistpopComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
