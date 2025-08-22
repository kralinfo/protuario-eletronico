import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DashboardMedicoComponent } from 'src/app/medico/medico-lista-atendimentos/dashboard-medico.component';
import { MedicoConsultaFormComponent } from 'src/app/medico/medico-consulta-form/medico-consulta-form.component';
import { MedicoRoutingModule } from './medico-routing.module';
import { FormsModule } from '@angular/forms';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    MedicoRoutingModule,
  DashboardMedicoComponent,
    MedicoConsultaFormComponent
  ]
})
export class MedicoModule {}
