import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DashboardAmbulatorioComponent } from './dashboard/dashboard-ambulatorio.component';
import { AmbulatorioRoutingModule } from './ambulatorio-routing.module';
import { FilaAtendimentosAmbulatorioComponent } from './fila-atendimentos-ambulatorio/fila-atendimentos-ambulatorio.component';
import { AtendimentoAmbulatorioComponent } from './atendimento-ambulatorio/atendimento-ambulatorio.component';

@NgModule({
  imports: [CommonModule, AmbulatorioRoutingModule, DashboardAmbulatorioComponent, FilaAtendimentosAmbulatorioComponent, AtendimentoAmbulatorioComponent],
})
export class AmbulatorioModule {}
