import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DashboardAmbulatorioComponent } from './dashboard-ambulatorio.component';
import { AmbulatorioRoutingModule } from './ambulatorio-routing.module';

@NgModule({
  imports: [CommonModule, AmbulatorioRoutingModule, DashboardAmbulatorioComponent],
})
export class AmbulatorioModule {}
