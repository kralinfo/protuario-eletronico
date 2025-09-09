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
    // Usar a mesma navegação que funciona no card de fila
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
      this.alertasCriticos = this.ordenarPorClassificacaoETempo(criticos).slice(0, 5);
      this.alertasAtencao = this.ordenarPorClassificacaoETempo(atencao).slice(0, 5);
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
  quantidadeEncaminhados: number = 0;
  quantidadeEmAtendimentoMedico: number = 0;
  filaEmAtendimentoPreview: any[] = [];
  consultasPreview: any[] = [];
  consultasEncaminhadas: number = 0;
  consultasEmAtendimento: number = 0;
  consultasRealizadasTotal: number = 0;
  alertasCriticos: any[] = [];
  alertasAtencao: any[] = [];
  atendimentos: any[] = [];

  atualizarEstatisticasPorClassificacao(data: any[]) {
    const agora = new Date();
    const por_classificacao = {
      vermelho: 0,
      laranja: 0,
      amarelo: 0,
      verde: 0,
      azul: 0
    };
    for (const p of data || []) {
      let campoData = p.created_at || p.data_hora_atendimento;
      if (!campoData) continue;
      const dataAtendimento = new Date(campoData);
      const diffHoras = (agora.getTime() - dataAtendimento.getTime()) / (1000 * 60 * 60);
      if (diffHoras > 24) continue;
      const risco = typeof p.classificacao_risco === 'string' ? p.classificacao_risco.toLowerCase() : '';
      switch (risco) {
        case 'vermelho':
        case 'laranja':
        case 'amarelo':
        case 'verde':
        case 'azul':
          por_classificacao[risco as keyof typeof por_classificacao]++;
          break;
      }
    }
    this.estatisticas.por_classificacao = por_classificacao;
  }

  ngOnInit() {
    this.atualizarDashboard();
  }

  atualizarDashboard() {
    // Resetar variáveis locais para garantir atualização total (NÃO resetar quantidadeEncaminhados)
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
    this.consultasRealizadasTotal = 0;
    this.alertasCriticos = [];
    this.alertasAtencao = [];

    // Disparar todos os endpoints na ordem correta
    this.carregarEstatisticas();
    this.carregarFilaSalaMedica();
    this.carregarGridAtendimentos();
    this.carregarAlertasTempo();
    this.atualizarCardPorClassificacao();
    this.carregarConsultasMedicas();
  }

  carregarGridAtendimentos() {
    this.medicoService.getTodosAtendimentos().subscribe((atendimentos: any[]) => {
      this.filaDisponiveisPreview = this.ordenarPorClassificacaoETempo(atendimentos || []);
    });
  }

  carregarFilaSalaMedica() {
    this.medicoService.getTodosAtendimentos().subscribe((atendimentos: any[]) => {
      const agora = new Date();
      const atendimentos24h = (atendimentos || []).filter(a => {
        let campoData = a.created_at || a.data_hora_atendimento;
        if (!campoData) return false;
        const dataAtendimento = new Date(campoData);
        const diffHoras = (agora.getTime() - dataAtendimento.getTime()) / (1000 * 60 * 60);
        return diffHoras <= 24;
      });

      // Filtrar atendimentos para fila: "em atendimento médico" + "encaminhado para sala médica"
      const filaAtendimento = atendimentos24h.filter(a => {
        const status = (a.status || '').toLowerCase();
        return status === 'em atendimento médico' ||
               status === 'encaminhado para sala médica';
      });
      this.filaSalaMedicaPreview = this.ordenarPorClassificacaoETempo(filaAtendimento).slice(0, 5);

      // Contador "Encaminhados" (esquerda) - apenas "encaminhado para sala médica"
      this.quantidadeEncaminhados = atendimentos24h.filter(a =>
        (a.status || '').toLowerCase() === 'encaminhado para sala médica'
      ).length;

      // Contador "Em Atendimento Médico" (direita) - apenas "em atendimento médico"
      this.quantidadeEmAtendimentoMedico = atendimentos24h.filter(a => {
        const status = (a.status || '').toLowerCase();
        return status === 'em atendimento médico';
      }).length;

      // Card "Aguardando Atendimento" - manter como estava
      this.estatisticas.pacientes_aguardando = this.quantidadeEncaminhados;
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
    // Buscar todos os atendimentos para calcular estatísticas mais abrangentes
    this.medicoService.getTodosAtendimentos().subscribe((atendimentos: any[]) => {
      const agora = new Date();
      const concluidosUltimas24Horas = atendimentos.filter(a => {
        const campoData = a.created_at || a.data_hora_atendimento;
        if (!campoData) return false;

        const dataAtendimento = new Date(campoData);
        const diffHoras = (agora.getTime() - dataAtendimento.getTime()) / (1000 * 60 * 60);
        if (diffHoras > 24) return false;

        // Incluir todos os status que representam consultas realizadas
        const status = (a.status || '').toLowerCase();
        const statusValido = status.includes('atendimento_concluido') ||
               status.includes('atendimento concluido') ||
               status.includes('atendimento concluído') ||
               status.includes('alta_medica') ||
               status.includes('alta médica') ||
               status.includes('alta medica') ||
               status.includes('encaminhado_para_ambulatorio') ||
               status.includes('encaminhado para ambulatório') ||
               status.includes('encaminhado para ambulatorio') ||
               status.includes('encaminhado_para_exames') ||
               status.includes('encaminhado para exame') ||
               status.includes('encaminhado para exames') ||
               status.includes('transferido') ||
               status.includes('óbito') ||
               status.includes('obito');

        return statusValido;
      });

      this.estatisticas.consultas_concluidas = concluidosUltimas24Horas.length;
      console.log('Total de consultas realizadas nas últimas 24 horas:', this.estatisticas.consultas_concluidas);
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
    // Para consultas realizadas, navegar normalmente mas em modo de visualização
    // O modo de visualização será controlado na página de atendimento baseado no status
    this.router.navigate(['/medico/atendimento', item.id], { 
      state: { modoVisualizacao: true, consultaRealizada: true }
    });
  }

  abrirConsultaVisualizacao(consulta: any, isConsultaRealizada: boolean = false) {
    if (!consulta || !consulta.id) return;

    // Se for uma consulta realizada (do card "Consultas Realizadas"), abrir em modo somente leitura
    if (isConsultaRealizada) {
      console.log('🔍 Consulta realizada. Abrindo em modo de visualização (somente leitura).');

      // Abrir o modal em modo de visualização (somente leitura)
      this.dialog.open(ClassificacaoDialogComponent, {
        data: { consulta, modoVisualizacao: true, somenteLeitura: true },
        panelClass: ['p-0', 'max-w-3xl', 'w-full']
      });

      return; // Não alterar o status nem permitir edição
    }

    // Para outros casos, seguir o fluxo normal
    // Salvar o status original antes de qualquer alteração
    const statusOriginal = consulta.status;
    console.log('📋 Status original antes do modal:', statusOriginal);

    // Alterar o status para "em atendimento médico"
    this.medicoService.atualizarStatus(String(consulta.id), 'em atendimento médico').subscribe({
      next: () => {
        console.log('✅ Status alterado para: em atendimento médico');

        // Abrir o modal
        const dialogRef = this.dialog.open(ClassificacaoDialogComponent, {
          data: { consulta, modoVisualizacao: false },
          panelClass: ['p-0', 'max-w-3xl', 'w-full']
        });

        dialogRef.afterClosed().subscribe((resultado) => {
          // Restaurar o status original caso o modal seja fechado sem salvar
          if (!resultado || resultado.cancelado) {
            console.log('🔄 Restaurando status original:', statusOriginal);
            this.medicoService.atualizarStatus(String(consulta.id), statusOriginal).subscribe({
              next: () => {
                console.log('✅ Status restaurado para:', statusOriginal);
                this.atualizarDashboard();
              },
              error: (error: any) => {
                console.error('❌ Erro ao restaurar status:', error);
              }
            });
          } else {
            // Atualizar o dashboard caso o modal seja salvo
            this.atualizarDashboard();
          }
        });
      },
      error: (error: any) => {
        console.error('❌ Erro ao alterar status para "em atendimento médico":', error);
      }
    });
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

  getCorClassificacao(classificacao: string): string {
    switch ((classificacao || '').toLowerCase()) {
      case 'vermelho': return '#ef4444';
      case 'laranja': return '#f97316';
      case 'amarelo': return '#eab308';
      case 'verde': return '#22c55e';
      case 'azul': return '#3b82f6';
      default: return '#d1d5db';
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
    if (!inicio) {
      console.warn('⚠️ Campo de data ausente no atendimento:', p);
      return 0;
    }

    const dataInicio = new Date(inicio);
    if (isNaN(dataInicio.getTime())) {
      console.error('❌ Data inválida encontrada no atendimento:', p);
      return 0;
    }

    const agora = new Date();
    const diffMs = agora.getTime() - dataInicio.getTime();
    return Math.floor(diffMs / 60000); // minutos
  }

  calcularEstatisticasPorClassificacaoFila(data: any[]) {
    const agora = new Date();
    const por_classificacao = {
      vermelho: 0,
      laranja: 0,
      amarelo: 0,
      verde: 0,
      azul: 0
    };
    for (const p of data || []) {
      let campoData = p.created_at || p.data_hora_atendimento;
      if (!campoData) continue;
      const dataAtendimento = new Date(campoData);
      const diffHoras = (agora.getTime() - dataAtendimento.getTime()) / (1000 * 60 * 60);
      if (diffHoras > 24) continue;
      const risco = typeof p.classificacao_risco === 'string' ? p.classificacao_risco.toLowerCase() : '';
      switch (risco) {
        case 'vermelho':
        case 'laranja':
        case 'amarelo':
        case 'verde':
        case 'azul':
          por_classificacao[risco as keyof typeof por_classificacao]++;
          break;
      }
    }
    return por_classificacao;
  }

  atualizarCardPorClassificacao() {
    this.medicoService.getTodosAtendimentos().subscribe((data: any[]) => {
      this.estatisticas.por_classificacao = this.calcularEstatisticasPorClassificacaoFila(data);
    });
  }

  carregarConsultasMedicas() {
    // Buscar atendimentos que já passaram por consulta médica
    this.medicoService.getTodosAtendimentos().subscribe((atendimentos: any[]) => {
        console.log('🔍 Total atendimentos recebidos:', atendimentos?.length || 0);

        const agora = new Date();

        // Filtrar atendimentos das últimas 24h que passaram por consulta médica
        const consultasRealizadas = (atendimentos || []).filter(atendimento => {
            const campoData = atendimento.created_at || atendimento.data_hora_atendimento;
            if (!campoData) return false;

            const dataAtendimento = new Date(campoData);
            const diffHoras = (agora.getTime() - dataAtendimento.getTime()) / (1000 * 60 * 60);
            if (diffHoras > 24) return false;

            // Verificar se passou por consulta médica:
            // 1. Campo hipotese_diagnostica preenchido OU
            // 2. Status indica que já foi atendido pelo médico
            const temConsultaRealizada = (atendimento.hipotese_diagnostica &&
                                        atendimento.hipotese_diagnostica.trim() !== '');

            const status = (atendimento.status || '').toLowerCase();
            const statusPosConsulta = status === 'encaminhado_para_ambulatorio' ||
                                    status === 'encaminhado_para_exames' ||
                                    status === 'atendimento_concluido' ||
                                    status === 'alta_medica' ||
                                    status === 'alta médica' ||
                                    status === 'transferido';

            return temConsultaRealizada || statusPosConsulta;
        }).map(consulta => {
            // Calcular e atribuir o tempo decorrido para cada consulta
            consulta.tempo_espera = this.calcularTempoDecorrido(consulta);
            return consulta;
        });

        // Calcular contadores específicos
        this.calcularContadoresConsultas(consultasRealizadas);

        // Atualizar lista de consultas para exibição
        this.consultasPreview = this.ordenarPorClassificacaoETempo(consultasRealizadas);

        console.log(`🎯 Consultas realizadas listadas: ${consultasRealizadas.length}`);
    });
  }

  calcularContadoresConsultas(consultasRealizadas: any[]) {
    // Total Realizadas - quantidade de consultas listadas no card
    this.consultasRealizadasTotal = consultasRealizadas.length;

    // Encaminhadas - atendimentos com status "encaminhado_para_exames" ou "encaminhado_para_ambulatorio"
    this.consultasEncaminhadas = consultasRealizadas.filter(consulta => {
        const status = (consulta.status || '').toLowerCase();
        return status === 'encaminhado_para_exames' || status === 'encaminhado_para_ambulatorio';
    }).length;

    console.log(`📊 Contadores - Total: ${this.consultasRealizadasTotal}, Encaminhadas: ${this.consultasEncaminhadas}`);
  }

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
}
