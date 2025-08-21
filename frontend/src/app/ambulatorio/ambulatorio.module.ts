import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DashboardAmbulatorioComponent } from './dashboard-ambulatorio.component';
import { AmbulatorioRoutingModule } from './ambulatorio-routing.module';
import { FilaAtendimentosAmbulatorioComponent } from './fila-atendimentos-ambulatorio/fila-atendimentos-ambulatorio.component';

@NgModule({
  imports: [CommonModule, AmbulatorioRoutingModule, DashboardAmbulatorioComponent, FilaAtendimentosAmbulatorioComponent],
})
export class AmbulatorioModule {}
