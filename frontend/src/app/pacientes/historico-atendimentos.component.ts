import { Component, OnInit, Inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { MAT_DIALOG_DATA } from '@angular/material/dialog';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-historico-atendimentos',
  templateUrl: './historico-atendimentos.component.html',
  styleUrls: ['./historico-atendimentos.component.scss'],
  standalone: true,
  imports: [CommonModule]
})
export class HistoricoAtendimentosComponent implements OnInit {
  historico: any[] = [];
  carregando = false;
  erro = '';
  pacienteId: number;

  constructor(private http: HttpClient, @Inject(MAT_DIALOG_DATA) public data: any) {
    this.pacienteId = data.pacienteId;
  }

  ngOnInit() {
    if (this.pacienteId) {
      this.carregarHistorico();
    }
  }

  carregarHistorico() {
    this.carregando = true;
    // Corrigido para usar a URL do backend
    // @ts-ignore
    const { environment } = require('../../environments/environment');
    this.http.get<any>(`${environment.apiUrl}/pacientes/${this.pacienteId}/historico`).subscribe({
      next: (res) => {
        this.historico = res.historico || [];
        this.carregando = false;
      },
      error: () => {
        this.erro = 'Erro ao carregar histórico.';
        this.carregando = false;
      }
    });
  }
}
