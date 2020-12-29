import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SubentryTableComponent } from './subentry-table.component';

describe('SubentryTableComponent', () => {
  let component: SubentryTableComponent;
  let fixture: ComponentFixture<SubentryTableComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ SubentryTableComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(SubentryTableComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
