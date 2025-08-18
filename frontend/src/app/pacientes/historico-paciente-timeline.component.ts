import { Component, Inject, OnInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { MAT_DIALOG_DATA, MatDialog, MatDialogModule } from '@angular/material/dialog';
import { CommonModule } from '@angular/common';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatIconModule } from '@angular/material/icon';
import { environment } from '../../environments/environment';
import { HistoricoAtendimentoDetalheComponent } from './historico-atendimento-detalhe.component';

@Component({
  selector: 'app-historico-paciente-timeline',
  templateUrl: './historico-paciente-timeline.component.html',
  styleUrls: ['./historico-paciente-timeline.component.scss'],
  standalone: true,
  imports: [CommonModule, MatDialogModule, MatProgressSpinnerModule, MatIconModule]
})
export class HistoricoPacienteTimelineComponent implements OnInit {
  atendimentos: any[] = [];
  carregando = false;
  erro = '';

  constructor(private http: HttpClient, @Inject(MAT_DIALOG_DATA) public data: any, private dialog: MatDialog) {}
  abrirDetalheAtendimento(atendimentoId: number) {
    this.dialog.open(HistoricoAtendimentoDetalheComponent, {
      width: '700px',
      data: { atendimentoId }
    });
  }

  ngOnInit() {
    if (this.data?.pacienteId) {
      this.carregarHistorico(this.data.pacienteId);
    }
  }

  carregarHistorico(id: number) {
    this.carregando = true;
    this.http.get<any>(`${environment.apiUrl}/pacientes/${id}/atendimentos`).subscribe({
      next: (res) => {
        this.atendimentos = res.data || res;
        this.carregando = false;
      },
      error: (err) => {
        this.erro = 'Erro ao carregar histórico de atendimentos.';
        this.carregando = false;
      }
    });
  }
}
