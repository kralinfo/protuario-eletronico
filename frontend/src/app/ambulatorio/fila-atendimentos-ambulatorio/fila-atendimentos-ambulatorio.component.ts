import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';

@Component({
  selector: 'app-fila-atendimentos-ambulatorio',
  templateUrl: './fila-atendimentos-ambulatorio.component.html',
  styleUrls: ['./fila-atendimentos-ambulatorio.component.scss'],
  standalone: true,
  imports: [CommonModule, MatCardModule, MatIconModule, MatButtonModule]
})
export class FilaAtendimentosAmbulatorioComponent implements OnInit {
  constructor() {}
  ngOnInit(): void {}
}
