import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { DashboardAmbulatorioComponent } from './dashboard-ambulatorio.component';
import { AuthGuard } from '../auth/auth.guard';
import { ModuloGuard } from '../auth/modulo.guard';

const routes: Routes = [
  {
    path: '',
    component: DashboardAmbulatorioComponent,
    canActivate: [AuthGuard, ModuloGuard]
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class AmbulatorioRoutingModule {}
