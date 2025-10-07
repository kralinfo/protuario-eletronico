import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DashboardAdministracaoComponent } from './dashboard-administracao.component';
import { RouterModule, Routes } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';

const routes: Routes = [
  {
    path: '',
    component: DashboardAdministracaoComponent
  }
];

@NgModule({
  imports: [
    CommonModule,
    RouterModule.forChild(routes),
    DashboardAdministracaoComponent,
    MatIconModule
  ]
})
export class AdministracaoModule {}
