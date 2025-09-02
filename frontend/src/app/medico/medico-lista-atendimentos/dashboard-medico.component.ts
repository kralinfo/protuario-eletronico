import { Component, OnInit } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { ClassificacaoDialogComponent } from 'src/app/classificacao-dialog/classificacao-dialog.component';
import { MedicoService } from 'src/app/medico/medico.service';
import { TriagemService } from 'src/app/services/triagem.service';
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
  constructor(
    private medicoService: MedicoService,
    private triagemService: TriagemService,
    private router: Router,
    private dialog: MatDialog
  ) {}

  abrirDialogClassificacao() {
    this.dialog.open(ClassificacaoDialogComponent, {
      panelClass: ['p-0', 'max-w-3xl', 'w-full']
    });
  }
  abrirItemAlertaTempo(p: any) {
    if (!p || !p.id) return;
    this.router.navigate(['/medico/atendimento', p.id]);
  }
  private readonly LIMITES_RISCO: Record<string, number> = {
    vermelho: 0,
    laranja: 10,
    amarelo: 60,
    verde: 120,
    azul: 240
  };

  private readonly STATUS_ALERTAS = new Set<string>([
    'encaminhado para sala médica', '3 - Encaminhado para sala médica', 'encaminhado_para_sala_medica',
    'em atendimento médico', '4 - Em atendimento médico', 'em_atendimento_medico',
    'encaminhado para ambulatório', '5 - Encaminhado para ambulatório', 'encaminhado_para_ambulatorio',
    'encaminhado para exames', '7 - Encaminhado para exames', 'encaminhado_para_exames',
    'aguardando exames'
  ]);

  carregarAlertasTempo() {
    // DEBUG: Listar todos os atendimentos com status 'em atendimento médico'
    const atendimentosEmAtendimentoMedico: any[] = [];
    this.medicoService.getTodosAtendimentos().subscribe((atendimentos: any[]) => {
      const agora = new Date();
      const criticos: any[] = [];
      const atencao: any[] = [];
      for (const p of atendimentos || []) {
        let campoData = p.created_at || p.data_hora_atendimento;
        if (!campoData) continue;
        const dataAtendimento = new Date(campoData);
        const diffHoras = (agora.getTime() - dataAtendimento.getTime()) / (1000 * 60 * 60);
        if (diffHoras > 24) continue;
        const risco = typeof p.classificacao_risco === 'string' ? p.classificacao_risco.toLowerCase() : '';
        const limite = this.LIMITES_RISCO[risco];
        let tempoDecorrido = Math.floor((agora.getTime() - dataAtendimento.getTime()) / 60000);
        if (p.status !== 'encaminhado para sala médica' && p.status !== 'em atendimento médico') continue;
        if (!risco || limite === undefined) continue;
        if (limite <= 0) {
          if (tempoDecorrido > 0) criticos.push(p);
          continue;
        }
        const perc = tempoDecorrido / limite;
        if (perc >= 1) {
          criticos.push(p);
        } else if (perc >= 0.8) {
          atencao.push(p);
        }
      }
      const sortByGravidade = (a: any, b: any) => (b.tempo_espera || 0) - (a.tempo_espera || 0);
      this.alertasCriticos = criticos.sort(sortByGravidade).slice(0, 5);
      this.alertasAtencao = atencao.sort(sortByGravidade).slice(0, 5);
    });
  }
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

  // ...existing code...

  ngOnInit() {
    this.atualizarDashboard();
  }

  atualizarDashboard() {
    // Resetar variáveis locais para garantir atualização total
    this.estatisticas = {
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
    this.filaDisponiveisPreview = [];
    this.filaSalaMedicaPreview = [];
    this.filaEmAtendimentoPreview = [];
    this.consultasPreview = [];
    this.consultasEncaminhadas = 0;
    this.consultasEmAtendimento = 0;
    this.alertasCriticos = [];
    this.alertasAtencao = [];

    // Disparar todos os endpoints
    this.carregarEstatisticas();
    this.carregarFilaSalaMedica();
    this.carregarGridAtendimentos();
    this.carregarAlertasTempo();
  }

  carregarGridAtendimentos() {
    this.medicoService.getTodosAtendimentos().subscribe((atendimentos: any[]) => {
      this.filaDisponiveisPreview = atendimentos || [];
    });
  }

  carregarFilaSalaMedica() {
    this.medicoService.getAtendimentosPorStatus(['encaminhado para sala médica', 'em atendimento médico']).subscribe((atendimentos: any[]) => {
      const agora = new Date();
      this.filaSalaMedicaPreview = (atendimentos || [])
        .filter(a => {
          let campoData = a.created_at || a.data_hora_atendimento;
          if (!campoData) return false;
          const dataAtendimento = new Date(campoData);
          const diffHoras = (agora.getTime() - dataAtendimento.getTime()) / (1000 * 60 * 60);
          return diffHoras <= 24;
        })
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
    // Consome o endpoint igual ao dashboard de triagem
    // Consome o endpoint de estatísticas de triagem para garantir o mesmo tratamento
    this.triagemService.obterEstatisticasTriagem().subscribe((stats: any) => {
      if (stats && stats.por_classificacao) {
        this.estatisticas.por_classificacao = stats.por_classificacao;
      }
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
