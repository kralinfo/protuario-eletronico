import { Injectable } from '@angular/core';
import { CanActivate, ActivatedRouteSnapshot, RouterStateSnapshot, Router, UrlTree } from '@angular/router';
import { Observable } from 'rxjs';
import { AuthService } from './auth.service';

@Injectable({ providedIn: 'root' })
export class ModuloGuard implements CanActivate {
  constructor(private authService: AuthService, private router: Router) {}

  canActivate(
    route: ActivatedRouteSnapshot,
    state: RouterStateSnapshot
  ): Observable<boolean | UrlTree> | Promise<boolean | UrlTree> | boolean | UrlTree {
    const user = this.authService.user;
    const selectedModule = this.authService.getSelectedModule();
    if (!user) {
      // Permite navegação, o interceptor lida com sessão expirada nas requisições.
      return true;
    }
    const requiredModulo = route.data['modulo'] as string;
    // Se o módulo selecionado for recepcao, libera tudo
    if (selectedModule === 'recepcao') return true;
    // Se não exigir módulo, libera
    if (!requiredModulo) return true;
    // Só libera se selectedModule === requiredModulo
    if (selectedModule === requiredModulo) return true;
    // Redireciona para home se não tiver permissão
    this.router.navigate(['/']);
    return false;
  }
}
