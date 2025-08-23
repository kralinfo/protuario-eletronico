import { TestBed } from '@angular/core/testing';

import { AmbulatorioService } from './ambulatorio.service';

describe('AmbulatorioService', () => {
  let service: AmbulatorioService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(AmbulatorioService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
