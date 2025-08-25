import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { DashboardMedicoComponent } from './medico-lista-atendimentos/dashboard-medico.component';
import { MedicoConsultaFormComponent } from './medico-consulta-form/medico-consulta-form.component';
import { AuthGuard } from '../auth/auth.guard';
import { ModuloGuard } from '../auth/modulo.guard';

const routes: Routes = [
  {
    path: '',
    component: DashboardMedicoComponent,
    canActivate: [AuthGuard, ModuloGuard],
    data: {
      modulo: 'medico'
      // Não define breadcrumb para dashboard
    }
  },
  {
    path: 'fila',
    loadComponent: () => import('./fila-atendimentos-medicos/fila-atendimentos-medicos.component').then(m => m.FilaAtendimentosMedicosComponent),
    canActivate: [AuthGuard, ModuloGuard],
    data: {
      modulo: 'medico',
      breadcrumb: 'Fila de Atendimentos',
      icon: 'queue',
      title: 'Fila de Atendimentos Médicos'
      // parent removido para não exibir 'Sala Médica'
    }
  },
  {
    path: 'atendimento/:id',
    loadComponent: () => import('./realizar-atendimento-medico/realizar-atendimento-medico.component').then(m => m.RealizarAtendimentoMedicoComponent),
    canActivate: [AuthGuard, ModuloGuard],
    data: {
      modulo: 'medico',
      breadcrumb: 'Atendimento Médico',
      icon: 'medical_services',
      title: 'Realizar Atendimento Médico'
    }
  },
  {
    path: 'consulta/:id',
    component: MedicoConsultaFormComponent,
    canActivate: [AuthGuard, ModuloGuard],
    data: {
      modulo: 'medico',
      breadcrumb: 'Consulta Médica',
      icon: 'assignment',
      title: 'Consulta Médica'
      // parent removido para não exibir 'Sala Médica'
    }
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class MedicoRoutingModule {}
