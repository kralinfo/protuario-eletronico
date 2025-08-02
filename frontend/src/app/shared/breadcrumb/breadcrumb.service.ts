import { Injectable } from '@angular/core';
import { Router, NavigationEnd, ActivatedRoute } from '@angular/router';
import { BehaviorSubject, Observable } from 'rxjs';
import { filter, distinctUntilChanged } from 'rxjs/operators';

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
    private activatedRoute: ActivatedRoute
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

    // Mark the last item as active
    if (breadcrumbs.length > 0) {
      breadcrumbs[breadcrumbs.length - 1].isActive = true;
    }

    // Always add Home as first breadcrumb if not present and not on login page
    if (breadcrumbs.length > 0 && breadcrumbs[0].url !== '/' && !this.isLoginPage()) {
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

  private getParentBreadcrumb(parentPath: string): BreadcrumbItem | null {
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
