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
  private readonly LIMITES_RISCO = {
    vermelho: 0,   // Imediato
    laranja: 10,   // Muito urgente - 10 min
    amarelo: 60,   // Urgente - 1 hora
    verde: 120,    // Pouco urgente - 2 horas
    azul: 240      // Não urgente - 4 horas
  };

  // Status que devem ser monitorados para alertas no ambulatório
  private readonly STATUS_ALERTAS = new Set<string>([
    'encaminhado para ambulatório', '5 - Encaminhado para ambulatório', 'encaminhado_para_ambulatorio',
    'em atendimento ambulatorial', 'em_atendimento_ambulatorial'
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
  alertasCriticos: any[] = [];
  alertasAtencao: any[] = [];


  constructor(
    private router: Router,
    private ambulatorioService: AmbulatorioService,
    private dialog: MatDialog
  ) {}
  ngOnInit() {
     this.carregarEstatisticas();
     this.carregarAlertasTempo();
  }

  carregarAlertasTempo() {
    console.log('🚨 Carregando alertas de tempo do ambulatório...');
    this.ambulatorioService.getTodosAtendimentos().subscribe((atendimentos: any[]) => {
      console.log('📊 Atendimentos recebidos:', atendimentos?.length, atendimentos);
      const agora = new Date();
      const criticos: any[] = [];
      const atencao: any[] = [];

      for (const p of atendimentos || []) {
        let campoData = p.created_at || p.data_hora_atendimento;
        if (!campoData) {
          console.log('❌ Atendimento sem data:', p.id);
          continue;
        }

        const dataAtendimento = new Date(campoData);
        const diffHoras = (agora.getTime() - dataAtendimento.getTime()) / (1000 * 60 * 60);
        if (diffHoras > 24) {
          console.log('⏰ Atendimento muito antigo (>24h):', p.id, 'diffHoras:', diffHoras);
          continue; // Apenas últimas 24h
        }

        const risco = typeof p.classificacao_risco === 'string' ? p.classificacao_risco.toLowerCase() : '';
        const limite = this.LIMITES_RISCO[risco as keyof typeof this.LIMITES_RISCO];
        let tempoDecorrido = Math.floor((agora.getTime() - dataAtendimento.getTime()) / 60000);

        console.log(`🔍 Paciente ${p.id}: status="${p.status}", risco="${risco}", limite=${limite}min, tempo=${tempoDecorrido}min`);

        // Verificar se está nos status de ambulatório que devem ser monitorados
        if (!this.STATUS_ALERTAS.has(p.status)) {
          console.log(`⚠️ Status não monitorado: "${p.status}" para paciente ${p.id}`);
          continue;
        }
        if (!risco || limite === undefined) {
          console.log(`⚠️ Risco inválido ou limite indefinido: risco="${risco}", limite=${limite} para paciente ${p.id}`);
          continue;
        }

        if (limite <= 0) {
          // Vermelho: qualquer tempo é crítico
          if (tempoDecorrido > 0) {
            console.log(`🔴 CRÍTICO (vermelho): Paciente ${p.id} - ${tempoDecorrido}min`);
            criticos.push(p);
          }
          continue;
        }

        const perc = tempoDecorrido / limite;
        if (perc >= 1) {
          console.log(`🔴 CRÍTICO: Paciente ${p.id} - ${tempoDecorrido}min/${limite}min (${Math.round(perc*100)}%)`);
          criticos.push(p);
        } else if (perc >= 0.8) {
          console.log(`🟡 ATENÇÃO: Paciente ${p.id} - ${tempoDecorrido}min/${limite}min (${Math.round(perc*100)}%)`);
          atencao.push(p);
        }
      }

      this.alertasCriticos = this.ordenarPorClassificacaoETempo(criticos).slice(0, 5);
      this.alertasAtencao = this.ordenarPorClassificacaoETempo(atencao).slice(0, 5);

      console.log('🚨 RESULTADO FINAL:');
      console.log('   🔴 Críticos:', this.alertasCriticos.length, this.alertasCriticos);
      console.log('   🟡 Atenção:', this.alertasAtencao.length, this.alertasAtencao);
      
      // Log específico para verificar classificacao_risco
      this.alertasCriticos.forEach((p, i) => {
        console.log(`🔴 Crítico ${i+1}: ${p.paciente_nome} - classificacao_risco: "${p.classificacao_risco}"`);
      });
      this.alertasAtencao.forEach((p, i) => {
        console.log(`🟡 Atenção ${i+1}: ${p.paciente_nome} - classificacao_risco: "${p.classificacao_risco}"`);
      });
    }, error => {
      console.error('❌ Erro ao carregar atendimentos:', error);
    });
  }

  ordenarPorClassificacaoETempo(lista: any[]) {
    const ordemPrioridade = { 'vermelho': 1, 'laranja': 2, 'amarelo': 3, 'verde': 4, 'azul': 5 };
    return lista.sort((a, b) => {
      const prioridadeA = ordemPrioridade[a.classificacao_risco?.toLowerCase() as keyof typeof ordemPrioridade] || 6;
      const prioridadeB = ordemPrioridade[b.classificacao_risco?.toLowerCase() as keyof typeof ordemPrioridade] || 6;

      if (prioridadeA !== prioridadeB) {
        return prioridadeA - prioridadeB;
      }

      // Se mesma classificação, ordena por tempo de espera
      const tempoA = a.tempo_espera || 0;
      const tempoB = b.tempo_espera || 0;
      return tempoB - tempoA;
    });
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

  abrirDialogClassificacao() {
    console.log('Abrindo modal de classificação de risco no dashboard ambulatório...');
    this.dialog.open(ClassificacaoDialogComponent, {
      panelClass: ['p-0', 'max-w-3xl', 'w-full']
    });
  }
}
