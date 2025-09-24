import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AtendimentoAmbulatorioComponent } from './atendimento-ambulatorio.component';

describe('AtendimentoAmbulatorioComponent', () => {
  let component: AtendimentoAmbulatorioComponent;
  let fixture: ComponentFixture<AtendimentoAmbulatorioComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AtendimentoAmbulatorioComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(AtendimentoAmbulatorioComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
