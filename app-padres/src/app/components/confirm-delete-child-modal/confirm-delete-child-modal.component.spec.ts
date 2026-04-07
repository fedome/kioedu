import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';
import { IonicModule } from '@ionic/angular';

import { ConfirmDeleteChildModalComponent } from './confirm-delete-child-modal.component';

describe('ConfirmDeleteChildModalComponent', () => {
  let component: ConfirmDeleteChildModalComponent;
  let fixture: ComponentFixture<ConfirmDeleteChildModalComponent>;

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      declarations: [ ConfirmDeleteChildModalComponent ],
      imports: [IonicModule.forRoot()]
    }).compileComponents();

    fixture = TestBed.createComponent(ConfirmDeleteChildModalComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }));

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
