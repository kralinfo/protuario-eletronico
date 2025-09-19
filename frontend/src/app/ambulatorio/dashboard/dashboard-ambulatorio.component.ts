import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { CommonModule } from '@angular/common';
import { AmbulatorioService } from '../ambulatorio.service';

@Component({
  selector: 'app-dashboard-ambulatorio',
  templateUrl: './dashboard-ambulatorio.component.html',
  styleUrls: ['./dashboard-ambulatorio.component.scss'],
  standalone: true,
  imports: [CommonModule, MatButtonModule, MatIconModule]
})
export class DashboardAmbulatorioComponent implements OnInit {
  estatisticas: any = {
    pacientes_aguardando: 0,
    pacientes_em_atendimento: 0,
    consultas_concluidas: 0,
    por_classificacao: {
      vermelho: 0,
      laranja: 0,
      amarelo: 0,
      verde: 0,
      azul: 0
    }
  };
  filaDisponiveisPreview: any[] = [];
  filaEmAtendimentoPreview: any[] = [];
  consultasPreview: any[] = [];
  consultasEncaminhadas: number = 0;
  consultasEmAtendimento: number = 0;
  alertasCriticos: any[] = [];
  alertasAtencao: any[] = [];


  constructor(
    private router: Router,
    private ambulatorioService: AmbulatorioService

  ) {}
  ngOnInit() {
     this.carregarEstatisticas();
  }

   carregarEstatisticas() {
    this.ambulatorioService.getEstatisticasAmbulatorio().subscribe((data: any) => {
      this.estatisticas = data.estatisticas || this.estatisticas;
      this.filaDisponiveisPreview = data.filaDisponiveisPreview || [];
      this.filaEmAtendimentoPreview = data.filaEmAtendimentoPreview || [];
      this.consultasPreview = data.consultasPreview || [];
      this.consultasEncaminhadas = data.consultasEncaminhadas || 0;
      this.consultasEmAtendimento = data.consultasEmAtendimento || 0;
      this.alertasCriticos = data.alertasCriticos || [];
      this.alertasAtencao = data.alertasAtencao || [];
    });
  }
  irParaConsultas() {
    this.router.navigate(['/ambulatorio/fila-consultas']);
  }

  getDescricaoStatus(status: string): string {
    const map: any = {
      aguardando: 'Aguardando',
      em_atendimento: 'Em Atendimento',
      finalizado: 'Finalizado',
      em_sala_medica: 'Em Sala Médica',
      encaminhado: 'Encaminhado',
      consulta: 'Consulta'
    };
    return map[status] || status;
  }

  getCorStatus(status: string): string {
    switch (status) {
      case 'aguardando': return '#4299e1';
      case 'consulta': return '#3b82f6';
      default: return '#a0aec0';
    }
  }

  formatarTempo(minutos: number): string {
    if (!minutos) return '0 min';
    if (minutos < 60) return minutos + ' min';
    const h = Math.floor(minutos / 60);
    const m = minutos % 60;
    return `${h}h ${m}min`;
  }

  abrirItemFila(item: any) {
    // Abrir detalhes do atendimento na fila
    // Exemplo: abrir modal ou navegar para detalhes
  }

  abrirItemConsulta(item: any) {
    // Abrir detalhes da consulta
    // Exemplo: abrir modal ou navegar para detalhes
  }



  irParaFilaAtendimento() {
    this.router.navigate(['ambulatorio', 'fila']);
  }

    getCorClassificacao(classificacao: string): string {
    if (!classificacao) return '#9ca3af'; // cor padrão cinza
    switch (classificacao.toLowerCase()) {
      case 'vermelho':
        return '#ef4444'; // vermelho
      case 'laranja':
        return '#f97316'; // laranja
      case 'amarelo':
        return '#eab308'; // amarelo
      case 'verde':
        return '#22c55e'; // verde
      case 'azul':
        return '#3b82f6'; // azul
      default:
        return '#9ca3af'; // fallback cinza
    }
  }

  
}
