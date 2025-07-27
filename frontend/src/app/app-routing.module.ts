import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { PacientesComponent } from './pacientes/pacientes.component';
import { PacientesFormComponent } from './pacientes/pacientes-form.component';
import { LoginComponent } from './auth/login/login.component';
import { RelatoriosComponent } from './relatorios/relatorios.component';
import { RelatorioAtendimentosComponent } from './relatorios/relatorio-atendimentos.component';
import { AuthGuard } from './auth/auth.guard';
import { ModuloGuard } from './auth/modulo.guard';
import { UsuariosComponent } from './usuarios/usuarios.component';
import { AtendimentosDiaComponent } from './atendimentos-dia/atendimentos-dia.component';
import { HomeComponent } from './home/home.component';
import { NovoAtendimentoComponent } from './atendimentos-dia/novo-atendimento.component';
import { RedefinirSenhaComponent } from './redefinir-senha/redefinir-senha.component';

const routes: Routes = [
  { path: '', component: HomeComponent },
  { path: 'login', component: LoginComponent },
  { path: 'pacientes', component: PacientesComponent, canActivate: [AuthGuard, ModuloGuard], data: { modulo: 'pacientes' } },
  { path: 'pacientes/novo', component: PacientesFormComponent, canActivate: [AuthGuard, ModuloGuard], data: { modulo: 'pacientes' } },
  { path: 'relatorios', component: RelatoriosComponent, canActivate: [AuthGuard, ModuloGuard], data: { modulo: 'relatorios' } },
  { path: 'relatorios/atendimentos', component: RelatorioAtendimentosComponent, canActivate: [AuthGuard, ModuloGuard], data: { modulo: 'relatorios' } },
  { path: 'usuarios', component: UsuariosComponent, canActivate: [AuthGuard, ModuloGuard], data: { modulo: 'usuarios' } },
  { path: 'atendimentos', component: AtendimentosDiaComponent },
  { path: 'atendimentos/novo', component: NovoAtendimentoComponent },
  // Rotas para redefinição de senha via token
  { path: 'redefinir-senha', component: RedefinirSenhaComponent },
  { path: 'reset-password', component: RedefinirSenhaComponent },
  { path: '**', redirectTo: '' }
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }
