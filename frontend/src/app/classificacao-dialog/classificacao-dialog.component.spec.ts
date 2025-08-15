import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ClassificacaoDialogComponent } from './classificacao-dialog.component';

describe('ClassificacaoDialogComponent', () => {
  let component: ClassificacaoDialogComponent;
  let fixture: ComponentFixture<ClassificacaoDialogComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ClassificacaoDialogComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ClassificacaoDialogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
