import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MedicoListaAtendimentosComponent } from 'src/app/medico/medico-lista-atendimentos/medico-lista-atendimentos.component';
import { MedicoConsultaFormComponent } from 'src/app/medico/medico-consulta-form/medico-consulta-form.component';
import { MedicoRoutingModule } from './medico-routing.module';
import { FormsModule } from '@angular/forms';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    MedicoRoutingModule,
    MedicoListaAtendimentosComponent,
    MedicoConsultaFormComponent
  ]
})
export class MedicoModule {}
