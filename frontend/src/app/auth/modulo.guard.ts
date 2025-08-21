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
  console.log('[ModuloGuard] user:', user);
  console.log('[ModuloGuard] selectedModule:', selectedModule);

    if (!user) {
      console.warn('[ModuloGuard] Bloqueio: usuário não autenticado');
      // Permite navegação, o interceptor lida com sessão expirada nas requisições.
      return true;
    }

    const requiredModulo = route.data['modulo'] as string;

    // Se não exigir módulo, libera
    if (!requiredModulo) return true;
  console.log('[ModuloGuard] requiredModulo:', requiredModulo);

    // Define as permissões por módulo
    const modulePermissions: Record<string, string[]> = {
      'recepcao': ['pacientes', 'atendimentos', 'relatorios', 'usuarios'],
      'triagem': ['triagem', 'pacientes', 'atendimentos', 'relatorios', 'usuarios'],
      'medico': ['medico', 'pacientes', 'atendimentos', 'relatorios'],
      'ambulatorio': ['ambulatorio'],
      'admin': ['admin', 'usuarios', 'pacientes', 'atendimentos', 'triagem', 'relatorios', 'medico', 'ambulatorio'],
    };

    // Verifica se o módulo selecionado tem permissão para acessar o módulo requerido
    const allowedModules = modulePermissions[selectedModule || ''] || [];
  console.log('[ModuloGuard] allowedModules:', allowedModules);
  console.log('[ModuloGuard] allowedModules:', allowedModules);

    if (allowedModules.includes(requiredModulo)) {
      // Permite acesso à tela de usuários para triagem se o módulo selecionado for triagem
      if (requiredModulo === 'usuarios' && selectedModule === 'triagem') {
        console.log('[ModuloGuard] Liberando acesso a usuários para triagem');
        return true;
      }
      // Permite acesso para admin normalmente
      if (requiredModulo === 'usuarios' && user.nivel !== 'admin') {
        console.warn('[ModuloGuard] Bloqueando acesso a usuários: não é admin nem triagem', {
          userNivel: user.nivel,
          selectedModule,
          requiredModulo,
          allowedModules
        });
        this.router.navigate(['/']);
        return false;
      }
      console.log('[ModuloGuard] Liberando acesso padrão');
      return true;
    }

    // Bloqueia acesso à Home para módulo médico ou ambulatorio
    if ((route.routeConfig?.path === '' || route.routeConfig?.path === undefined) && (selectedModule === 'medico' || selectedModule === 'ambulatorio')) {
      // Evita loop de navegação
      const target = selectedModule === 'medico' ? '/medico' : '/ambulatorio';
      if (state.url !== target) {
        this.router.navigate([target]);
      }
      return false;
    }

    // Redireciona para home se não tiver permissão
    this.router.navigate(['/']);
    console.warn('[ModuloGuard] Bloqueio: módulo não permitido', {
      userNivel: user.nivel,
      selectedModule,
      requiredModulo,
      allowedModules
    });
    return false;
  }
}
