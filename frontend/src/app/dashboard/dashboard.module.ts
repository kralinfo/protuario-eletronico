import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Routes } from '@angular/router';
import { DashboardOperacionalComponent } from './operacional/dashboard-operacional.component';

const routes: Routes = [
  {
    path: '',
    component: DashboardOperacionalComponent,
    data: {
      breadcrumb: 'Dashboard Operacional',
      icon: 'dashboard',
      title: 'Dashboard Operacional'
    }
  }
];

@NgModule({
  imports: [
    CommonModule,
    RouterModule.forChild(routes)
  ]
})
export class DashboardModule {}
