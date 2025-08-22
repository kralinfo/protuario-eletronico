import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-dashboard-ambulatorio',
  templateUrl: './dashboard-ambulatorio.component.html',
  styleUrls: ['./dashboard-ambulatorio.component.scss'],
  standalone: true,
  imports: [CommonModule, MatButtonModule, MatIconModule]
})
export class DashboardAmbulatorioComponent {
  constructor(private router: Router) {}
  irParaFilaAtendimento() {
    this.router.navigate(['ambulatorio', 'fila']);
  }
   dataAtual: Date = new Date();
}
