import { Component, ViewChild, TemplateRef, OnInit, OnDestroy } from '@angular/core';
import { MatSidenav, MatSidenavContainer } from '@angular/material/sidenav';
import { PacientesComponent } from './pacientes/pacientes.component';
import { MatDialog } from '@angular/material/dialog';
import { AuthService } from './auth/auth.service';
import { Router, NavigationEnd } from '@angular/router';
import { MatMenu } from '@angular/material/menu';
import { FeedbackDialogComponent } from './shared/feedback-dialog/feedback-dialog.component';
import { RealtimeService } from './services/realtime.service';
import { NotificationService, Notification } from './services/notification.service';
import { Subject } from 'rxjs';
import { takeUntil, filter } from 'rxjs/operators';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss'],
  standalone: false
})
export class AppComponent implements OnInit, OnDestroy {
  @ViewChild('sidenav') sidenav!: MatSidenav;
  @ViewChild('sidenavContainer') sidenavContainer!: MatSidenavContainer;
  @ViewChild('sobreDialog') sobreDialog!: TemplateRef<any>;
  @ViewChild('userMenu', { static: true }) userMenu!: MatMenu;
  
  private destroy$ = new Subject<void>();

  constructor(
    public authService: AuthService,
    private router: Router,
    private dialog: MatDialog,
    private realtimeService: RealtimeService
  ) {
    this.currentUser = this.authService.user;
    this.authService.user$.subscribe(user => {
      this.currentUser = user;
    });
  }

  ngOnInit(): void {
    console.log('[AppComponent] ngOnInit() iniciado');
    // notification bell removed; notifications still emitted via NotificationService (toasts)
    
    // Detectar quando navegar para fora da página de login
    this.router.events
      .pipe(
        filter(event => event instanceof NavigationEnd),
        takeUntil(this.destroy$)
      )
      .subscribe((event: any) => {
        console.log('[AppComponent] Navegação detectada:', event.urlAfterRedirects);
        if (!event.urlAfterRedirects.includes('login') && !event.urlAfterRedirects.includes('redefinir-senha')) {
          setTimeout(() => {
            console.log('[AppComponent] Tentando conectar após navegação...');
            this._initializeRealtime();
          }, 100);
        }
      });

    // Reconectar quando o módulo mudar
    this.authService.user$
      .pipe(takeUntil(this.destroy$))
      .subscribe(user => {
        console.log('[AppComponent] user$ mudou:', user?.email);
        if (user && this.authService.isAuthenticated()) {
          console.log('[AppComponent] User autenticado, tentando conectar realtime...');
          this._initializeRealtime();
        }
      });
  }

  // no header notification state
  private _initializeRealtime(): void {
    console.log('[AppComponent._initializeRealtime()] Iniciando...');
    
    // Não conectar em rotas de login/autenticação
    const currentUrl = this.router.url;
    console.log('[AppComponent._initializeRealtime()] Rota atual:', currentUrl);
    if (currentUrl.includes('login') || currentUrl.includes('redefinir-senha')) {
      console.log('[AppComponent._initializeRealtime()] CANCELADO: Rota é autenticação');
      return;
    }

    // Verificar se token existe e é válido
    const token = localStorage.getItem('token') || localStorage.getItem('auth_token');
    console.log('[AppComponent._initializeRealtime()] Token:', token ? 'EXISTS' : 'NOT FOUND');
    console.log('[AppComponent._initializeRealtime()] isAuthenticated():', this.authService.isAuthenticated());
    
    if (!token || !this.authService.isAuthenticated()) {
      console.log('[AppComponent._initializeRealtime()] CANCELADO: Token inválido ou não autenticado');
      return;
    }

    // Conectar ao módulo selecionado
    const module = this.authService.getSelectedModule() || 'default';
    console.log('[AppComponent._initializeRealtime()] Módulo selecionado:', module);
    console.log('[AppComponent._initializeRealtime()] isConnected():', this.realtimeService.isConnected());
    
    if (!this.realtimeService.isConnected()) {
      console.log('[AppComponent._initializeRealtime()] Chamando connect()...');
      this.realtimeService.connect(module)
        .then(() => console.log(`✅ RealtimeService conectado ao módulo: ${module}`))
        .catch(err => console.error('❌ Erro ao conectar RealtimeService:', err));
    } else {
      console.log('[AppComponent._initializeRealtime()] CANCELADO: Já conectado');
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  // true = compact/collapsed, false = expanded
  sidenavCompact = true;
  sidenavOpened = true;

  toggleSidenav() {
    this.sidenavCompact = !this.sidenavCompact;
    // Force Angular Material to recalculate content margins after width change
    setTimeout(() => this.sidenavContainer?.updateContentMargins(), 0);
  }

  isModuloMedico(): boolean {
    return this.authService.getSelectedModule() === 'medico';
  }
  sobreDialogRef: any;
  irParaMenuPrincipal() {
    const selectedModule = this.authService.getSelectedModule();
    if (selectedModule === 'medico') {
      this.router.navigate(['/medico']);
    } else if (selectedModule === 'triagem') {
      this.router.navigate(['/ambulatorio']);
    } else {
      this.router.navigate(['/']);
    }
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
