
import { Component, ViewChild, TemplateRef } from '@angular/core';
import { PacientesComponent } from './pacientes/pacientes.component';
import { MatDialog } from '@angular/material/dialog';
import { AuthService } from './auth/auth.service';
import { Router } from '@angular/router';
import { MatMenu } from '@angular/material/menu';

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

  constructor(public authService: AuthService, private router: Router, private dialog: MatDialog) {
    this.currentUser = this.authService.user;
    this.authService.user$.subscribe(user => {
      this.currentUser = user;
    });
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

  alternarDarkMode() {
    this.isDarkMode = !this.isDarkMode;
    const body = document.body;
    if (this.isDarkMode) {
      body.classList.add('dark-mode');
    } else {
      body.classList.remove('dark-mode');
    }
  }
}
