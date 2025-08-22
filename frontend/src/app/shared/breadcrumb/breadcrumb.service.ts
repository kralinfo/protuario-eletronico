import { Injectable } from '@angular/core';
import { Router, NavigationEnd, ActivatedRoute } from '@angular/router';
import { BehaviorSubject, Observable } from 'rxjs';
import { filter, distinctUntilChanged } from 'rxjs/operators';
import { AuthService } from '../../auth/auth.service';

export interface BreadcrumbItem {
  label: string;
  url: string;
  icon?: string;
  title?: string;
  isActive: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class BreadcrumbService {
  private breadcrumbsSubject = new BehaviorSubject<BreadcrumbItem[]>([]);
  public breadcrumbs$: Observable<BreadcrumbItem[]> = this.breadcrumbsSubject.asObservable();

  constructor(
    private router: Router,
    private activatedRoute: ActivatedRoute,
    private authService: AuthService
  ) {
    this.router.events
      .pipe(
        filter(event => event instanceof NavigationEnd),
        distinctUntilChanged()
      )
      .subscribe(() => {
        this.buildBreadcrumbs();
      });
  }

  private buildBreadcrumbs(): void {
    const breadcrumbs: BreadcrumbItem[] = [];
    let route = this.activatedRoute.root;
    let url = '';

    while (route) {
      const children = route.children;
      if (children.length === 0) {
        break;
      }

      route = children[0];

      if (route.snapshot.url.length > 0) {
        url += '/' + route.snapshot.url.map(segment => segment.path).join('/');

        const routeData = route.snapshot.data;

        if (routeData && routeData['breadcrumb'] && !routeData['hideInBreadcrumb']) {
          // Check if parent breadcrumb should be added
          if (routeData['parent']) {
            const parentBreadcrumb = this.getParentBreadcrumb(routeData['parent']);
            if (parentBreadcrumb && !breadcrumbs.find(b => b.url === parentBreadcrumb.url)) {
              breadcrumbs.push(parentBreadcrumb);
            }
          }

          breadcrumbs.push({
            label: routeData['breadcrumb'],
            url: url,
            icon: routeData['icon'],
            title: routeData['title'],
            isActive: false
          });
        }
      }
    }

    // Se for dashboard médico ou ambulatorio, não exibe nenhum breadcrumb
    const modulo = this.authService.getSelectedModule?.() || localStorage.getItem('moduloSelecionado');
    const isMedicoDashboard = modulo === 'medico' && breadcrumbs.length === 1 && (breadcrumbs[0].url === '/medico' || breadcrumbs[0].url === '/medico/');
    const isAmbulatorioDashboard = modulo === 'ambulatorio' && breadcrumbs.length === 1 && (breadcrumbs[0].url === '/ambulatorio' || breadcrumbs[0].url === '/ambulatorio/');
    if (isMedicoDashboard || isAmbulatorioDashboard) {
      this.breadcrumbsSubject.next([]);
      return;
    }
    // Mark the last item as active
    if (breadcrumbs.length > 0) {
      breadcrumbs[breadcrumbs.length - 1].isActive = true;
    }
    // Adiciona Home para módulo médico ou ambulatorio nas demais telas
    if (modulo === 'medico' && breadcrumbs.length > 0 && !this.isLoginPage()) {
      breadcrumbs.unshift({
        label: 'Home',
        url: '/medico',
        icon: 'home',
        title: 'Dashboard Médico',
        isActive: false
      });
    } else if (modulo === 'ambulatorio' && breadcrumbs.length > 0 && !this.isLoginPage()) {
      breadcrumbs.unshift({
        label: 'Home',
        url: '/ambulatorio',
        icon: 'home',
        title: 'Dashboard Ambulatorio',
        isActive: false
      });
    } else if (modulo !== 'medico' && modulo !== 'ambulatorio' && breadcrumbs.length > 0 && breadcrumbs[0].url !== '/' && !this.isLoginPage()) {
      breadcrumbs.unshift({
        label: 'Home',
        url: '/',
        icon: 'home',
        title: 'Dashboard Principal',
        isActive: false
      });
    }
    this.breadcrumbsSubject.next(breadcrumbs);
  }

  private isModuloMedico(): boolean {
    const modulo = localStorage.getItem('moduloSelecionado');
    return modulo === 'medico';
  }

  private getParentBreadcrumb(parentPath: string): BreadcrumbItem | null {
    // Não retorna parent para 'medico' para evitar breadcrumb 'Sala Médica'
    const parentRoutes: { [key: string]: BreadcrumbItem } = {
      'pacientes': {
        label: 'Pacientes',
        url: '/pacientes',
        icon: 'people',
        title: 'Gestão de Pacientes',
        isActive: false
      },
      'atendimentos': {
        label: 'Atendimentos',
        url: '/atendimentos',
        icon: 'medical_services',
        title: 'Atendimentos do Dia',
        isActive: false
      },
      'relatorios': {
        label: 'Relatórios',
        url: '/relatorios',
        icon: 'assessment',
        title: 'Relatórios do Sistema',
        isActive: false
      }
    };
    if (parentPath === 'medico') return null;
    return parentRoutes[parentPath] || null;
  }

  private isLoginPage(): boolean {
    return this.router.url === '/login' ||
           this.router.url.includes('/redefinir-senha') ||
           this.router.url.includes('/reset-password');
  }

  // Method to programmatically set breadcrumbs
  setBreadcrumbs(breadcrumbs: BreadcrumbItem[]): void {
    this.breadcrumbsSubject.next(breadcrumbs);
  }

  // Method to get current breadcrumbs
  getCurrentBreadcrumbs(): BreadcrumbItem[] {
    return this.breadcrumbsSubject.value;
  }

  // Method to clear breadcrumbs
  clearBreadcrumbs(): void {
    this.breadcrumbsSubject.next([]);
  }
}
