import { Component, Inject, OnInit } from '@angular/core';
import { MatDialogRef } from '@angular/material/dialog';
import { HttpClient } from '@angular/common/http';
import { MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { CommonModule } from '@angular/common';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { environment } from '../../environments/environment';
import { getStatusLabel } from '../utils/normalize-status';

@Component({
  selector: 'app-historico-atendimento-detalhe',
  templateUrl: './historico-atendimento-detalhe.component.html',
  styleUrls: ['./historico-atendimento-detalhe.component.scss'],
  standalone: true,
  imports: [CommonModule, MatDialogModule, MatProgressSpinnerModule, MatIconModule]
})
export class HistoricoAtendimentoDetalheComponent implements OnInit {
  atendimento: any = null;
  carregando = false;
  erro = '';

  constructor(
    private http: HttpClient,
    @Inject(MAT_DIALOG_DATA) public data: any,
    private dialogRef: MatDialogRef<HistoricoAtendimentoDetalheComponent>
  ) {}

  fechar() {
    this.dialogRef.close();
  }

  ngOnInit() {
    if (this.data?.atendimentoId) {
      this.carregarAtendimento(this.data.atendimentoId);
    }
  }

  carregarAtendimento(id: number) {
    this.carregando = true;
    this.http.get<any>(`${environment.apiUrl}/atendimentos/${id}`).subscribe({
      next: (res) => {
        this.atendimento = res.data || res;
        this.carregando = false;
      },
      error: (err) => {
        this.erro = 'Erro ao carregar dados do atendimento.';
        this.carregando = false;
      }
    });
  }

  getStatusLabel = getStatusLabel;
}
