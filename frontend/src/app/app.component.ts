import { Component, ViewChild, TemplateRef } from '@angular/core';
import { PacientesComponent } from './pacientes/pacientes.component';
import { MatDialog } from '@angular/material/dialog';
import { AuthService } from './auth/auth.service';
import { Router } from '@angular/router';
import { MatMenu } from '@angular/material/menu';
import { FeedbackDialogComponent } from './shared/feedback-dialog/feedback-dialog.component';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss'],
  standalone: false
})
export class AppComponent {
  @ViewChild('sobreDialog') sobreDialog!: TemplateRef<any>;
  @ViewChild('userMenu', { static: true }) userMenu!: MatMenu;
  sobreDialogRef: any;
  irParaMenuPrincipal() {
    this.router.navigate(['/']);
  }
  title = 'frontend';
  currentUser: any;
  isDarkMode = false;

  imprimirFichaPacienteEmBrancoGlobal() {
    // Cria uma instância temporária do PacientesComponent apenas para imprimir
    const temp = new PacientesComponent(undefined as any, undefined as any, undefined as any, undefined as any, undefined as any);
    temp.imprimirFichaPacienteEmBranco();
  }

  imprimirFichaAtendimentoEmBrancoGlobal() {
    // Chama a função de impressão da ficha de atendimento em branco
    import('./atendimento/imprimir-ficha-atendimento-em-branco').then(mod => {
      mod.imprimirFichaAtendimentoEmBranco();
    });
  }

  exibirSessaoExpiradaERedirecionar(tipo: 'expirada' | 'sessao-aberta' = 'sessao-aberta') {
    let title = 'Já existe sessão aberta';
    let message = 'Já existe uma sessão ativa para este usuário em outro navegador ou dispositivo. Você será redirecionado para o login.';
    if (tipo === 'expirada') {
      title = 'Sessão expirada';
      message = 'Por segurança, sua sessão foi encerrada. Você será redirecionado para o login.';
    }
    const dialogRef = this.dialog.open(FeedbackDialogComponent, {
      width: '350px',
      disableClose: true,
      data: {
        title,
        message,
        type: 'error'
      }
    });
    setTimeout(() => {
      dialogRef.close();
      this.router.navigate(['/login']);
    }, 2500); // 2.5 segundos
  }

  constructor(public authService: AuthService, private router: Router, private dialog: MatDialog) {
    this.currentUser = this.authService.user;
    this.authService.user$.subscribe(user => {
      this.currentUser = user;
    });
    // Removido logout automático e redirecionamento ao recarregar a página
  }

  getNomeCurto(nomeCompleto: string): string {
    if (!nomeCompleto) return '';
    const partes = nomeCompleto.trim().split(' ');
    return partes.slice(0, 2).join(' ');
  }

  abrirSobre() {
    this.sobreDialogRef = this.dialog.open(this.sobreDialog, {
      width: '350px',
      autoFocus: false
    });
  }

  fecharSobre() {
    if (this.sobreDialogRef) {
      this.sobreDialogRef.close();
    }
  }

  isLoginRoute(): boolean {
    // Esconde o header global nas rotas de login e redefinir senha
    return this.router.url === '/login' || this.router.url.startsWith('/redefinir-senha') || this.router.url.startsWith('/reset-password');
  }

  logout() {
    this.authService.logout();
  }

  // Métodos para verificação de permissões
  isAdmin(): boolean {
    return this.currentUser?.nivel === 'admin';
  }

  isEditor(): boolean {
    return this.currentUser?.nivel === 'editor' || this.isAdmin();
  }

  isVisualizador(): boolean {
    return this.currentUser?.nivel === 'visualizador';
  }

  hasModuleAccess(modulo: string): boolean {
    return this.currentUser?.modulos?.includes(modulo) || this.isAdmin();
  }

  canAccessModule(requiredModule: string): boolean {
    const selectedModule = this.authService.getSelectedModule();

    // Se não há módulo selecionado, não permite acesso
    if (!selectedModule) return false;

    // Define as permissões por módulo (mesma lógica do guard)
    const modulePermissions: Record<string, string[]> = {
      'recepcao': ['pacientes', 'atendimentos', 'relatorios', 'usuarios'], // Recepcao tem acesso a tudo
      'triagem': ['triagem', 'pacientes', 'atendimentos', 'relatorios', 'usuarios'], // Triagem agora tem acesso a usuários
      'medico': ['medico', 'pacientes', 'atendimentos', 'relatorios'], // Médico (futuro)
      'admin': ['admin', 'usuarios', 'pacientes', 'atendimentos', 'triagem', 'relatorios'], // Admin tem acesso total
    };

    // Verifica se o módulo selecionado tem permissão para acessar o módulo requerido
    const allowedModules = modulePermissions[selectedModule] || [];

    if (allowedModules.includes(requiredModule)) {
      // Verifica permissão especial para usuários (apenas admins)
      if (requiredModule === 'usuarios' && !this.isAdmin()) {
        return false;
      }
      return true;
    }

    return false;
  }

  alternarDarkMode() {
    // Modo escuro desabilitado
    // Esta função não faz nada pois o modo escuro está sempre desabilitado
    this.isDarkMode = false;
    document.body.classList.remove('dark-mode');
  }
}
