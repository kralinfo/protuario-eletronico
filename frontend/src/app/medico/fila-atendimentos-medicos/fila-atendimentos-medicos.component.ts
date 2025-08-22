import { Component, OnInit } from '@angular/core';
import { MedicoService } from '../medico.service';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';

@Component({
  selector: 'app-fila-atendimentos-medicos',
  templateUrl: './fila-atendimentos-medicos.component.html',
  styleUrls: ['./fila-atendimentos-medicos.component.scss'],
  standalone: true,
  imports: [CommonModule, MatCardModule, MatIconModule, MatButtonModule]
})
export class FilaAtendimentosMedicosComponent implements OnInit {
  atendimentos: any[] = [];

  constructor(private medicoService: MedicoService) {}

  ngOnInit(): void {
    this.medicoService.getAtendimentosSalaMedica().subscribe((data: any[]) => {
      this.atendimentos = data;
    });
  }
}
