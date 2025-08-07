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
import { FilaTriagemComponent } from './triagem/fila-triagem.component';
import { RealizarTriagemComponent } from './triagem/realizar-triagem.component';

const routes: Routes = [
  {
    path: '',
    component: HomeComponent,
    canActivate: [AuthGuard],
    data: {
      breadcrumb: 'Home',
      icon: 'home',
      title: 'Dashboard Principal'
    }
  },
  {
    path: 'login',
    component: LoginComponent,
    data: {
      breadcrumb: 'Login',
      icon: 'login',
      hideInBreadcrumb: true
    }
  },
  {
    path: 'pacientes',
    component: PacientesComponent,
    canActivate: [AuthGuard, ModuloGuard],
    data: {
      modulo: 'pacientes',
      breadcrumb: 'Pacientes',
      icon: 'people',
      title: 'Gestão de Pacientes'
    }
  },
  {
    path: 'pacientes/novo',
    component: PacientesFormComponent,
    canActivate: [AuthGuard, ModuloGuard],
    data: {
      modulo: 'pacientes',
      breadcrumb: 'Novo Paciente',
      icon: 'person_add',
      title: 'Cadastrar Novo Paciente',
      parent: 'pacientes'
    }
  },
  {
    path: 'relatorios/pacientes',
    component: RelatoriosComponent,
    canActivate: [AuthGuard, ModuloGuard],
    data: {
      modulo: 'relatorios',
      breadcrumb: 'Relatório de Pacientes',
      icon: 'assessment',
      title: 'Relatórios de Pacientes',
      parent: 'relatorios'
    }
  },
  {
    path: 'relatorios/atendimentos',
    component: RelatorioAtendimentosComponent,
    canActivate: [AuthGuard, ModuloGuard],
    data: {
      modulo: 'relatorios',
      breadcrumb: 'Relatório de Atendimentos',
      icon: 'analytics',
      title: 'Relatórios de Atendimentos',
      parent: 'relatorios'
    }
  },
  {
    path: 'usuarios',
    component: UsuariosComponent,
    canActivate: [AuthGuard, ModuloGuard],
    data: {
      modulo: 'usuarios',
      breadcrumb: 'Usuários',
      icon: 'manage_accounts',
      title: 'Gestão de Usuários'
    }
  },
  {
    path: 'atendimentos',
    component: AtendimentosDiaComponent,
    canActivate: [AuthGuard, ModuloGuard],
    data: {
      modulo: 'atendimentos',
      breadcrumb: 'Atendimentos',
      icon: 'medical_services',
      title: 'Atendimentos do Dia'
    }
  },
  {
    path: 'atendimentos/novo',
    component: NovoAtendimentoComponent,
    canActivate: [AuthGuard, ModuloGuard],
    data: {
      modulo: 'atendimentos',
      breadcrumb: 'Novo Atendimento',
      icon: 'add_circle',
      title: 'Registrar Novo Atendimento',
      parent: 'atendimentos'
    }
  },
  {
    path: 'atendimentos/editar/:id',
    component: NovoAtendimentoComponent,
    canActivate: [AuthGuard, ModuloGuard],
    data: {
      modulo: 'atendimentos',
      breadcrumb: 'Editar Atendimento',
      icon: 'edit',
      title: 'Editar Atendimento',
      parent: 'atendimentos'
    }
  },
  {
    path: 'triagem',
    component: FilaTriagemComponent,
    canActivate: [AuthGuard, ModuloGuard],
    data: {
      modulo: 'triagem',
      breadcrumb: 'Triagem',
      icon: 'medical_services',
      title: 'Fila de Triagem'
    }
  },
  {
    path: 'triagem/realizar/:id',
    component: RealizarTriagemComponent,
    canActivate: [AuthGuard, ModuloGuard],
    data: {
      modulo: 'triagem',
      breadcrumb: 'Realizar Triagem',
      icon: 'assignment',
      title: 'Realizar Triagem',
      parent: 'triagem'
    }
  },
  // Rotas para redefinição de senha via token
  {
    path: 'redefinir-senha',
    component: RedefinirSenhaComponent,
    data: {
      breadcrumb: 'Redefinir Senha',
      icon: 'lock_reset',
      hideInBreadcrumb: true
    }
  },
  {
    path: 'reset-password',
    component: RedefinirSenhaComponent,
    data: {
      breadcrumb: 'Redefinir Senha',
      icon: 'lock_reset',
      hideInBreadcrumb: true
    }
  },
  { path: '**', redirectTo: '/login' }
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }
