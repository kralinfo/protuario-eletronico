import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatChipsModule } from '@angular/material/chips';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { Router } from '@angular/router';
import { interval, Subscription, firstValueFrom } from 'rxjs';
import { TriagemService, PacienteTriagem } from '../../services/triagem.service';
import { normalizeStatus, getStatusLabel } from '../../utils/normalize-status';

@Component({
  selector: 'app-fila-pos-triagem',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatChipsModule,
    MatProgressSpinnerModule,
    MatSnackBarModule
  ],
  templateUrl: './fila-pos-triagem.component.html',
  styleUrls: ['./fila-pos-triagem.component.scss']
})

export class FilaPosTriagemComponent implements OnInit, OnDestroy {
  pacientes: PacienteTriagem[] = [];
  tempoMedioEspera: number = 0;
  carregando: boolean = false;
  filtroStatus: string = '';
  atualizacaoSubscription?: Subscription;

  constructor(
    private triagemService: TriagemService,
    private snackBar: MatSnackBar,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.carregarDados();
    this.iniciarAtualizacaoAutomatica();
  }

  ngOnDestroy(): void {
    this.atualizacaoSubscription?.unsubscribe();
  }

  private iniciarAtualizacaoAutomatica() {
    this.atualizacaoSubscription = interval(30000).subscribe(() => this.carregarDados(false));
  }

  async carregarDados(mostrarLoading = true) {
    try {
      if (mostrarLoading) this.carregando = true;
      console.log('[Pós-Triagem] Carregando dados...');
      const pacientes = await firstValueFrom(this.triagemService.listarTodosAtendimentosDia());

      console.log('[Pós-Triagem] Total de registros recebidos:', pacientes?.length);
      console.log('[Pós-Triagem] Primeiros 3 registros:', pacientes?.slice(0, 3));

      const POS_TRIAGEM = new Set([
        'encaminhado_para_sala_medica',
        'em_atendimento_medico',
        'encaminhado_para_ambulatorio',
        'em_atendimento_ambulatorial',
        'encaminhado_para_exames',
        'aguardando_exames', 'exames_concluidos', 'alta_medica', 'transferido', 'obito'
      ]);

      const lista = (pacientes || [])
        .filter(p => p && POS_TRIAGEM.has(normalizeStatus(p.status)))
        .filter(p => !this.filtroStatus || normalizeStatus(p.status) === this.filtroStatus)
        .sort((a, b) => (b.tempo_espera || 0) - (a.tempo_espera || 0));

      console.log('[Pós-Triagem] Após filtro de status:', lista.length);
      console.log('[Pós-Triagem] Status únicos encontrados:', [...new Set(pacientes?.map(p => p.status) || [])]);
      console.log(`[Pós-Triagem] ${lista.length} pacientes encontrados`);
      this.pacientes = lista;

      const tempos = this.pacientes.map(p => p.tempo_espera || 0);
      this.tempoMedioEspera = tempos.length ? Math.round(tempos.reduce((a, b) => a + b, 0) / tempos.length) : 0;
    } catch (err) {
      console.error('[Pós-Triagem] Erro ao carregar dados:', err);
      this.snackBar.open('Erro ao carregar pós-triagem', 'Fechar', { duration: 5000 });
    } finally {
      this.carregando = false;
    }
  }

  abrirTriagem(paciente: PacienteTriagem) {
    if (!paciente?.id) return;

    // Define restricted statuses for editing
    const RESTRICTED_STATUSES = new Set([
      'alta_medica', 'transferido', 'obito'
    ]);

    // Check if the patient's status is restricted
    if (RESTRICTED_STATUSES.has(normalizeStatus(paciente.status))) {
      this.snackBar.open('Edição não permitida para este status.', 'Fechar', { duration: 5000 });
      return;
    }

    // Abrir em modo visualização (somente leitura) para pacientes pós-triagem
    this.router.navigate(['/triagem/realizar', paciente.id], {
      state: {
        modoVisualizacao: true,
        paciente_nome: paciente.paciente_nome
      }
    });
  }

  contarEncaminhados(): number {
    const ENCAMINHADOS = new Set([
      'encaminhado_para_sala_medica',
      'encaminhado_para_ambulatorio',
      'encaminhado_para_exames',
      'aguardando_exames'
    ]);
    return (this.pacientes || []).filter(p => p && ENCAMINHADOS.has(normalizeStatus(p.status))).length;
  }

  contarEmAtendimento(): number {
    const EM_ATENDIMENTO = new Set([
      'em_atendimento_medico',
      'em_atendimento_ambulatorial',
      'em_triagem'
    ]);
    return (this.pacientes || []).filter(p => p && EM_ATENDIMENTO.has(normalizeStatus(p.status))).length;
  }

  getIniciais(nome: string): string {
    return nome.split(' ').slice(0,2).map(n=>n.charAt(0)).join('').toUpperCase();
  }

  getIdade(nascimento: string): number {
    const hoje = new Date();
    const dataNasc = new Date(nascimento);
    let idade = hoje.getFullYear() - dataNasc.getFullYear();
    const mes = hoje.getMonth() - dataNasc.getMonth();
    if (mes < 0 || (mes === 0 && hoje.getDate() < dataNasc.getDate())) idade--;
    return idade;
  }

  formatarDataHora(dataHora: string): string {
    return new Date(dataHora).toLocaleString('pt-BR', {
      day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit'
    });
  }

  formatarTempo(minutos?: number | null): string {
    if (minutos === null || minutos === undefined || isNaN(minutos as any)) return '-';
    const total = Math.max(0, Math.round(minutos));
    const h = Math.floor(total / 60);
    const m = total % 60;
    if (h > 0 && m > 0) return `${h}h ${m}min`;
    if (h > 0) return `${h}h`;
    return `${m} min`;
  }

  getCorStatus(status: string): string {
    const cores: Record<string, string> = {
      'encaminhado_para_triagem': '#2196F3',
      'em_triagem': '#4CAF50',
      'encaminhado_para_sala_medica': '#FF9800',
      'em_atendimento_medico': '#FF5722',
      'encaminhado_para_ambulatorio': '#9C27B0',
      'em_atendimento_ambulatorial': '#3F51B5',
      'encaminhado_para_exames': '#009688',
      'aguardando_exames': '#607D8B',
      'exames_concluidos': '#4CAF50',
      'alta_medica': '#2E7D32',
      'transferido': '#6D4C41',
      'obito': '#263238'
    };
    return cores[normalizeStatus(status)] || '#757575';
  }

  getDescricaoStatus(status: string): string {
    return getStatusLabel(normalizeStatus(status));
  }

}
