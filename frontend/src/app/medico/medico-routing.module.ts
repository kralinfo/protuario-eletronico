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
      modulo: 'medico',
      breadcrumb: 'Sala Médica',
      icon: 'local_hospital',
      title: 'Atendimentos em Sala Médica'
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
      title: 'Consulta Médica',
      parent: 'medico'
    }
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class MedicoRoutingModule {}
