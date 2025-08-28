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
  filaSalaMedicaPreview: any[] = [];
  filaEmAtendimentoPreview: any[] = [];
  consultasPreview: any[] = [];
  consultasEncaminhadas: number = 0;
  consultasEmAtendimento: number = 0;
  alertasCriticos: any[] = [];
  alertasAtencao: any[] = [];

  constructor(private medicoService: MedicoService, private router: Router) {}

  ngOnInit() {
    this.carregarEstatisticas();
    this.carregarFilaSalaMedica();
    this.carregarGridAtendimentos();
  }

  carregarGridAtendimentos() {
    this.medicoService.getTodosAtendimentos().subscribe((atendimentos: any[]) => {
      this.filaDisponiveisPreview = atendimentos || [];
    });
  }

  carregarFilaSalaMedica() {
    this.medicoService.getAtendimentosPorStatus(['encaminhado para sala médica', 'em atendimento médico']).subscribe((atendimentos: any[]) => {
      this.filaSalaMedicaPreview = (atendimentos || [])
        .sort((a, b) => (b.tempo_espera || 0) - (a.tempo_espera || 0))
        .slice(0, 5);
    });
  }

  getAguardandoSalaMedicaHoje(): number {
    const hoje = new Date();
    return this.filaSalaMedicaPreview?.filter(a => {
      if (a.status !== 'encaminhado para sala médica') return false;
      let campoData = a.created_at || a.data_hora_atendimento;
      if (!campoData) return false;
      const data = new Date(campoData);
      return data.getDate() === hoje.getDate() &&
        data.getMonth() === hoje.getMonth() &&
        data.getFullYear() === hoje.getFullYear();
    })?.length || 0;
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

  irParaFilaSalaMedica() {
    this.router.navigate(['/medico/fila']);
  }

  irParaConsultas() {
    this.router.navigate(['/medico/consultas']);
  }

  abrirItemSalaMedica(item: any) {
    this.router.navigate(['/medico/atendimento', item.id]);
  }

  abrirItemConsulta(item: any) {
    this.router.navigate(['/medico/consulta', item.id]);
  }

  getDescricaoStatus(status: string): string {
    const map: any = {
      aguardando: 'Aguardando',
      em_atendimento: 'Em Atendimento',
      finalizado: 'Finalizado',
      em_sala_medica: 'Em Sala Médica',
      encaminhado: 'Encaminhado',
      consulta: 'Consulta',
      'encaminhado para sala médica': 'Encaminhado para Sala Médica',
      'em atendimento médico': 'Em Atendimento Médico'
    };
    return map[status] || status;
  }

  getCorStatus(status: string): string {
    switch (status) {
      case 'aguardando': return '#4299e1';
      case 'consulta': return '#3b82f6';
      case 'encaminhado para sala médica': return '#FF9800';
      case 'em atendimento médico': return '#FF5722';
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

  calcularTempoDecorrido(p: any): number {
    const inicio = p.data_hora_atendimento || p.created_at;
    if (!inicio) return 0;
    const dataInicio = new Date(inicio);
    const agora = new Date();
    const diffMs = agora.getTime() - dataInicio.getTime();
    return Math.floor(diffMs / 60000); // minutos
  }
}
