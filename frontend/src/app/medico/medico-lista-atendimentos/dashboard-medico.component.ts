import { Component, OnInit } from '@angular/core';
import { MedicoService } from 'src/app/medico/medico.service';

import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';

@Component({
  selector: 'app-dashboard-medico',
  templateUrl: './dashboard-medico.component.html',
  styleUrls: ['./dashboard-medico.component.scss'],
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, MatCardModule, MatIconModule, MatButtonModule]
})
export class DashboardMedicoComponent implements OnInit {
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

  constructor(private medicoService: MedicoService, private router: Router) {}

  ngOnInit() {
    this.carregarEstatisticas();
  }

  carregarEstatisticas() {
    this.medicoService.getEstatisticasMedico().subscribe((data: any) => {
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
    // Navegação para consultas
    // Exemplo: this.router.navigate(['/medico/consultas']);
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

  irParaFilaAtendimento(): void {
    this.router.navigate(['medico/fila']);
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
}
