import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { CommonModule } from '@angular/common';
import { AmbulatorioService } from '../ambulatorio.service';
import { MatDialog } from '@angular/material/dialog';
import { ClassificacaoDialogComponent } from 'src/app/classificacao-dialog/classificacao-dialog.component';

@Component({
  selector: 'app-dashboard-ambulatorio',
  templateUrl: './dashboard-ambulatorio.component.html',
  styleUrls: ['./dashboard-ambulatorio.component.scss'],
  standalone: true,
  imports: [CommonModule, MatButtonModule, MatIconModule]
})
export class DashboardAmbulatorioComponent implements OnInit {

  // Limites de tempo por classificação de risco (em minutos)
  private readonly LIMITES_RISCO: Record<string, number> = {
    vermelho: 0,   // Imediato
    laranja: 10,   // Muito urgente - 10 min
    amarelo: 60,   // Urgente - 1 hora
    verde: 120,    // Pouco urgente - 2 horas
    azul: 240      // Não urgente - 4 horas
  };

  // Status que devem ser monitorados para alertas (todos os status do fluxo antes do ambulatório)
  private readonly STATUS_ALERTAS = new Set<string>([
    'encaminhado para triagem', '1 - Encaminhado para triagem', 'encaminhado_para_triagem',
    'em triagem', '2 - Em triagem', 'em_triagem',
    'encaminhado para sala médica', '3 - Encaminhado para sala médica', 'encaminhado_para_sala_medica',
    'em atendimento médico', '4 - Em atendimento médico', 'em_atendimento_medico',
    'encaminhado para ambulatório', '5 - Encaminhado para ambulatório', 'encaminhado_para_ambulatorio',
    'em atendimento ambulatorial', 'em_atendimento_ambulatorial',
    'encaminhado para exames', '7 - Encaminhado para exames', 'encaminhado_para_exames',
    'aguardando exames'
  ]);

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
  consultasEmObservacao: number = 0;
  alertasCriticos: any[] = [];
  alertasAtencao: any[] = [];


  constructor(
    private router: Router,
    private ambulatorioService: AmbulatorioService,
    private dialog: MatDialog
  ) {}

  private classificacaoOrder(risco: string): number {
    switch ((risco || '').toLowerCase()) {
      case 'vermelho': return 1;
      case 'laranja': return 2;
      case 'amarelo': return 3;
      case 'verde': return 4;
      case 'azul': return 5;
      default: return 6;
    }
  }

  private ordenarPorClassificacaoETempo(lista: any[]): any[] {
    return [...(lista || [])].sort((a, b) => {
      const ca = this.classificacaoOrder(a.classificacao_risco);
      const cb = this.classificacaoOrder(b.classificacao_risco);
      if (ca !== cb) return ca - cb;
      // Prioriza maior tempo de espera
      const ta = a.tempo_espera || this.calcularTempoDecorrido(a);
      const tb = b.tempo_espera || this.calcularTempoDecorrido(b);
      return tb - ta;
    });
  }

  ngOnInit() {
    this.atualizarDashboard();
  }

  atualizarDashboard() {
    this.carregarEstatisticas();
    this.carregarAlertasTempo();
    this.carregarFilaAmbulatorio();
    this.carregarConsultasObservacao();
  }

  carregarConsultasObservacao() {
    this.ambulatorioService.getTodosAtendimentos().subscribe((atendimentos: any[]) => {
      const agora = new Date();
      const atendimentos24h = (atendimentos || []).filter(a => {
        let campoData = a.created_at || a.data_hora_atendimento;
        if (!campoData) return false;
        const dataAtendimento = new Date(campoData);
        const diffHoras = (agora.getTime() - dataAtendimento.getTime()) / (1000 * 60 * 60);
        return diffHoras <= 24;
      });
      // Filtrar atendimentos com status 'em_observacao'
      const emObservacao = atendimentos24h.filter(a => (a.status || '').toLowerCase() === 'em_observacao');
      emObservacao.forEach(p => {
        p.tempo_espera = this.calcularTempoDecorrido(p);
      });
      this.consultasPreview = this.ordenarPorClassificacaoETempo(emObservacao).slice(0, 5);
    });
  }

  carregarFilaAmbulatorio() {
    this.ambulatorioService.getTodosAtendimentos().subscribe((atendimentos: any[]) => {
      const agora = new Date();
      const atendimentos24h = (atendimentos || []).filter(a => {
        let campoData = a.created_at || a.data_hora_atendimento;
        if (!campoData) return false;
        const dataAtendimento = new Date(campoData);
        const diffHoras = (agora.getTime() - dataAtendimento.getTime()) / (1000 * 60 * 60);
        return diffHoras <= 24;
      });

      // Filtrar atendimentos para fila: "em atendimento ambulatorial" + "encaminhado para ambulatório"
      const filaAtendimento = atendimentos24h.filter(a => {
        const status = (a.status || '').toLowerCase();
        return status === 'em atendimento ambulatorial' ||
               status === 'encaminhado para ambulatório' ||
               status === '5 - encaminhado para ambulatório' ||
               status === 'encaminhado_para_ambulatorio' ||
               status === 'em_atendimento_ambulatorial';
      });
      // Corrigir tempo_espera para cada paciente da fila
      filaAtendimento.forEach(p => {
        p.tempo_espera = this.calcularTempoDecorrido(p);
      });
      this.filaDisponiveisPreview = this.ordenarPorClassificacaoETempo(filaAtendimento).slice(0, 5);

      // Contador "Atendimentos com Alta" (status: atendimento_concluido)
      this.consultasEncaminhadas = atendimentos24h.filter(a => {
        const status = (a.status || '').toLowerCase();
        return status === 'atendimento_concluido';
      }).length;

      // Contador "Em Atendimento" (status: encaminhado para ambulatório, em atendimento ambulatorial)
      this.consultasEmAtendimento = atendimentos24h.filter(a => {
        const status = (a.status || '').toLowerCase();
        return status === 'encaminhado para ambulatório' ||
               status === 'em atendimento ambulatorial';
      }).length;

      // Contador "Em Observação" (status: em_observacao)
      this.consultasEmObservacao = atendimentos24h.filter(a => {
        const status = (a.status || '').toLowerCase();
        return status === 'em_observacao';
      }).length;
    });
  }

  carregarAlertasTempo() {
    console.log('🚀 Dashboard Ambulatório: Iniciando carregamento de alertas de tempo...');

    this.ambulatorioService.getTodosAtendimentos().subscribe({
      next: (atendimentos: any[]) => {
        console.log('📦 Dados recebidos da API:', atendimentos?.length, 'atendimentos');
        const agora = new Date();
        const criticos: any[] = [];
        const atencao: any[] = [];

        for (const p of atendimentos || []) {
          let campoData = p.created_at || p.data_hora_atendimento;
          if (!campoData) continue;

          const dataAtendimento = new Date(campoData);
          const diffHoras = (agora.getTime() - dataAtendimento.getTime()) / (1000 * 60 * 60);
          if (diffHoras > 24) continue;

          // NOVA LÓGICA: Excluir pacientes que já passaram por atendimento médico
          if (p.passou_por_atendimento_medico) {
            console.log(`⏭️  Paciente ${p.id} já passou por atendimento médico - ignorando`);
            continue;
          }

          const risco = typeof p.classificacao_risco === 'string' ? p.classificacao_risco.toLowerCase() : '';
          const limite = this.LIMITES_RISCO[risco];
          let tempoDecorrido = Math.floor((agora.getTime() - dataAtendimento.getTime()) / 60000);

          // Log para debug
          console.log(`🔍 Paciente ${p.id}: status="${p.status}", risco="${risco}", tempo=${tempoDecorrido}min, monitorado=${this.STATUS_ALERTAS.has(p.status)}, passou_por_medico=${p.passou_por_atendimento_medico}`);

          if (!this.STATUS_ALERTAS.has(p.status)) continue;
          if (!risco || limite === undefined) continue;

          // Adicionar o tempo_espera calculado ao objeto
          p.tempo_espera = tempoDecorrido;

          if (limite <= 0) {
            if (tempoDecorrido > 0) {
              console.log(`🔴 CRÍTICO (risco vermelho): Paciente ${p.id} - ${tempoDecorrido}min`);
              criticos.push(p);
            }
            continue;
          }

          const perc = tempoDecorrido / limite;
          if (perc >= 1) {
            console.log(`🔴 CRÍTICO (limite estourado): Paciente ${p.id} - ${tempoDecorrido}min/${limite}min`);
            criticos.push(p);
          } else if (perc >= 0.8) {
            console.log(`🟡 ATENÇÃO (≥80% limite): Paciente ${p.id} - ${tempoDecorrido}min/${limite}min`);
            atencao.push(p);
          }
        }

        console.log(`📋 Resultado: ${criticos.length} críticos, ${atencao.length} atenção`);
        this.alertasCriticos = this.ordenarPorClassificacaoETempo(criticos).slice(0, 5);
        this.alertasAtencao = this.ordenarPorClassificacaoETempo(atencao).slice(0, 5);
        console.log('✅ Alertas finais:', this.alertasCriticos.length, 'críticos,', this.alertasAtencao.length, 'atenção');
      },
      error: (err) => console.error('❌ Erro ao carregar alertas de tempo:', err)
    });
  }

  calcularTempoDecorrido(p: any): number {
    const inicio = p.data_hora_atendimento || p.created_at;
    if (!inicio) return 0;
    const dataInicio = new Date(inicio);
    const agora = new Date();
    const diffMs = agora.getTime() - dataInicio.getTime();
    return Math.floor(diffMs / 60000); // minutos
  }

  carregarEstatisticas() {
    // Buscar estatísticas do backend
    this.ambulatorioService.getEstatisticasAmbulatorio().subscribe((data: any) => {
      this.estatisticas = data.estatisticas || this.estatisticas;
    });

    // Buscar todos os atendimentos para calcular estatísticas mais detalhadas
    this.ambulatorioService.getTodosAtendimentos().subscribe((atendimentos: any[]) => {
      const agora = new Date();

      // Filtrar apenas últimas 24 horas
      const atendimentosUltimas24h = atendimentos.filter(a => {
        const campoData = a.created_at || a.data_hora_atendimento;
        if (!campoData) return false;

        const dataAtendimento = new Date(campoData);
        const diffHoras = (agora.getTime() - dataAtendimento.getTime()) / (1000 * 60 * 60);
        return diffHoras <= 24;
      });

      // Calcular pacientes aguardando (encaminhados para ambulatório)
      const aguardando = atendimentosUltimas24h.filter(a => {
        const status = (a.status || '').toLowerCase();
        return status.includes('encaminhado_para_ambulatorio') ||
               status.includes('encaminhado para ambulatório') ||
               status === '5 - encaminhado para ambulatório';
      });

      // Calcular pacientes em atendimento ambulatorial
      const emAtendimento = atendimentosUltimas24h.filter(a => {
        const status = (a.status || '').toLowerCase();
        return status.includes('em atendimento ambulatorial') ||
               status.includes('em_atendimento_ambulatorial');
      });

      // Calcular consultas concluídas (que saíram do ambulatório)
      const concluidasUltimas24h = atendimentosUltimas24h.filter(a => {
        const status = (a.status || '').toLowerCase();
        return status.includes('alta_ambulatorial') ||
               status.includes('alta ambulatorial') ||
               status.includes('encaminhado_para_exames') ||
               status.includes('encaminhado para exames') ||
               status.includes('encaminhado_para_internacao') ||
               status.includes('encaminhado para internação') ||
               status.includes('transferido') ||
               status.includes('óbito') ||
               status.includes('obito');
      });

      // Calcular estatísticas por classificação de risco (últimas 24h)
      const por_classificacao = {
        vermelho: 0,
        laranja: 0,
        amarelo: 0,
        verde: 0,
        azul: 0
      };

      for (const atendimento of atendimentosUltimas24h) {
        const risco = typeof atendimento.classificacao_risco === 'string'
          ? atendimento.classificacao_risco.toLowerCase()
          : '';
        if (por_classificacao.hasOwnProperty(risco)) {
          por_classificacao[risco as keyof typeof por_classificacao]++;
        }
      }

      // Atualizar estatísticas
      this.estatisticas.pacientes_aguardando = aguardando.length;
      this.estatisticas.pacientes_em_atendimento = emAtendimento.length;
      this.estatisticas.consultas_concluidas = concluidasUltimas24h.length;
      this.estatisticas.por_classificacao = por_classificacao;

      console.log('📊 Estatísticas Ambulatório (24h):', {
        aguardando: aguardando.length,
        emAtendimento: emAtendimento.length,
        concluidas: concluidasUltimas24h.length,
        por_classificacao
      });
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

  getCorClassificacaoRisco(classificacao: string): string {
    const risco = (classificacao || '').toLowerCase();
    console.log(`🎨 Obtendo cor para classificação: "${risco}"`);
    switch (risco) {
      case 'vermelho': return '#dc2626'; // red-600
      case 'laranja': return '#ea580c'; // orange-600
      case 'amarelo': return '#d97706'; // amber-600
      case 'verde': return '#16a34a'; // green-600
      case 'azul': return '#2563eb'; // blue-600
      default: return '#6b7280'; // gray-500
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
    if (!item?.id) {
      console.log('❌ Item inválido:', item);
      return;
    }

    console.log('🔄 Navegando para atendimento ambulatorial:', item.id);

    // Navegar para a tela de atendimento ambulatorial
    this.router.navigate(['/ambulatorio/atendimento', item.id]);
  }

  // ...existing code...

  abrirItemConsulta(item: any) {
    // Abrir detalhes da consulta
    // Exemplo: abrir modal ou navegar para detalhes
  }



  irParaFilaAtendimento() {
    this.router.navigate(['ambulatorio', 'fila']);
  }

  abrirDialogClassificacao() {
    console.log('Abrindo modal de classificação de risco no dashboard ambulatório...');
    this.dialog.open(ClassificacaoDialogComponent, {
      panelClass: ['p-0', 'max-w-3xl', 'w-full']
    });
  }
}
