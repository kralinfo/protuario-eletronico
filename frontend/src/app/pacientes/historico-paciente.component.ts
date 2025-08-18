import { Component, Inject, OnInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { CommonModule } from '@angular/common';
import { MatTableModule } from '@angular/material/table';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatIconModule } from '@angular/material/icon';
import { environment } from '../../environments/environment';

@Component({
  selector: 'app-historico-paciente',
  templateUrl: './historico-paciente.component.html',
  styleUrls: ['./historico-paciente.component.scss'],
  standalone: true,
  imports: [CommonModule, MatDialogModule, MatTableModule, MatProgressSpinnerModule, MatIconModule]
})
export class HistoricoPacienteComponent implements OnInit {
  paciente: any = null;
  carregando = false;
  erro = '';

  constructor(private http: HttpClient, @Inject(MAT_DIALOG_DATA) public data: any) {}

  ngOnInit() {
    if (this.data?.pacienteId) {
      this.carregarPaciente(this.data.pacienteId);
    }
  }

  carregarPaciente(id: number) {
    this.carregando = true;
    this.http.get<any>(`${environment.apiUrl}/pacientes/${id}`).subscribe({
      next: (res) => {
        this.paciente = res.data || res;
        this.carregando = false;
      },
      error: (err) => {
        this.erro = 'Erro ao carregar dados clínicos.';
        this.carregando = false;
      }
    });
  }
}
