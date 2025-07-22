
import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { ModuloGuard } from './modulo.guard';
import { AuthService } from './auth.service';

describe('ModuloGuard', () => {
  let guard: ModuloGuard;
  let authServiceSpy: any;
  let routerSpy: any;

  beforeEach(() => {
    authServiceSpy = { user: null, getSelectedModule: () => null };
    routerSpy = { navigate: jasmine.createSpy('navigate') };
    TestBed.configureTestingModule({
      providers: [
        ModuloGuard,
        { provide: AuthService, useValue: authServiceSpy },
        { provide: Router, useValue: routerSpy }
      ]
    });
    guard = TestBed.inject(ModuloGuard);
  });

  it('deve permitir acesso se selectedModule for recepcao', () => {
    authServiceSpy.user = { modulos: ['pacientes', 'recepcao'] };
    authServiceSpy.getSelectedModule = () => 'recepcao';
    const can = guard.canActivate({ data: { modulo: 'qualquer' } } as any, {} as any);
    expect(can).toBeTrue();
  });

  it('deve permitir acesso se selectedModule for igual ao modulo exigido', () => {
    authServiceSpy.user = { modulos: ['pacientes', 'usuarios'] };
    authServiceSpy.getSelectedModule = () => 'usuarios';
    const can = guard.canActivate({ data: { modulo: 'usuarios' } } as any, {} as any);
    expect(can).toBeTrue();
  });

  it('deve negar acesso se selectedModule for diferente do modulo exigido', () => {
    authServiceSpy.user = { modulos: ['pacientes', 'usuarios'] };
    authServiceSpy.getSelectedModule = () => 'pacientes';
    const can = guard.canActivate({ data: { modulo: 'usuarios' } } as any, {} as any);
    expect(can).toBeFalse();
    expect(routerSpy.navigate).toHaveBeenCalledWith(['/']);
  });

  it('deve redirecionar para login se não houver user', () => {
    authServiceSpy.user = null;
    authServiceSpy.getSelectedModule = () => 'pacientes';
    const can = guard.canActivate({ data: { modulo: 'pacientes' } } as any, {} as any);
    expect(can).toBeFalse();
    expect(routerSpy.navigate).toHaveBeenCalledWith(['/login']);
  });

  it('deve permitir acesso se não exigir modulo', () => {
    authServiceSpy.user = { modulos: ['pacientes'] };
    authServiceSpy.getSelectedModule = () => 'pacientes';
    const can = guard.canActivate({ data: { } } as any, {} as any);
    expect(can).toBeTrue();
  });
});
