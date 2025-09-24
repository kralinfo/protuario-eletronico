import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { DashboardAmbulatorioComponent } from './dashboard/dashboard-ambulatorio.component';
import { AuthGuard } from '../auth/auth.guard';
import { ModuloGuard } from '../auth/modulo.guard';

const routes: Routes = [
  {
    path: '',
    component: DashboardAmbulatorioComponent,
    canActivate: [AuthGuard, ModuloGuard],
    data: {
      modulo: 'ambulatorio'
      // Não define breadcrumb para dashboard
    }
  },
  {
    path: 'fila',
    loadComponent: () => import('./fila-atendimentos-ambulatorio/fila-atendimentos-ambulatorio.component').then(m => m.FilaAtendimentosAmbulatorioComponent),
    canActivate: [AuthGuard, ModuloGuard],
    data: {
      modulo: 'ambulatorio',
      breadcrumb: 'Fila de Atendimentos',
      icon: 'queue',
      title: 'Fila de Atendimentos Ambulatorio'
    }
  },

  {
    path: 'fila-consultas',
    loadComponent: () => import('./fila-consultas/fila-consultas.component').then(m => m.FilaConsultasComponent),
    canActivate: [AuthGuard, ModuloGuard],
    data: {
      modulo: 'ambulatorio',
      breadcrumb: 'Fila de Consultas',
      icon: 'queue',
      title: 'Fila de Consultas Ambulatorio'
    }
  },
  {
    path: 'atendimento/:id',
    loadComponent: () => import('../ambulatorio/atendimento-ambulatorio/atendimento-ambulatorio.component').then(m => m.AtendimentoAmbulatorioComponent),
    canActivate: [AuthGuard, ModuloGuard],
    data: {
      modulo: 'ambulatorio',
      breadcrumb: 'Atendimento Ambulatório',
      icon: 'medical_services',
      title: 'Atendimento Ambulatório'
    }
  }

];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class AmbulatorioRoutingModule {}
