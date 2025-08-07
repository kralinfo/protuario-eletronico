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
    
    // Se não exigir módulo, libera
    if (!requiredModulo) return true;
    
    // Define as permissões por módulo
    const modulePermissions: Record<string, string[]> = {
      'recepcao': ['pacientes', 'atendimentos', 'relatorios', 'usuarios'], // Recepcao tem acesso a tudo
      'triagem': ['triagem', 'pacientes', 'atendimentos', 'relatorios'], // Triagem precisa destes módulos
      'medico': ['medico', 'pacientes', 'atendimentos', 'relatorios'], // Médico (futuro)
      'admin': ['admin', 'usuarios', 'pacientes', 'atendimentos', 'triagem', 'relatorios'], // Admin tem acesso total
    };
    
    // Verifica se o módulo selecionado tem permissão para acessar o módulo requerido
    const allowedModules = modulePermissions[selectedModule || ''] || [];
    
    if (allowedModules.includes(requiredModulo)) {
      // Verifica permissão especial para usuários (apenas admins)
      if (requiredModulo === 'usuarios' && user.nivel !== 'admin') {
        this.router.navigate(['/']);
        return false;
      }
      return true;
    }
    
    // Redireciona para home se não tiver permissão
    this.router.navigate(['/']);
    return false;
  }
}
