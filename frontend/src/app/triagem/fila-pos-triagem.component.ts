import { Component, OnDestroy, OnInit } from '@angular/core';
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
import { TriagemService, PacienteTriagem } from '../services/triagem.service';

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
  template: `
    <div class="triagem-container">
      <h1 class="page-title">
        <mat-icon>assignment</mat-icon>
        Fila Pós-triagem
      </h1>

      <!-- Estatísticas -->
      <div class="stats-cards">
        <mat-card class="stat-card">
          <mat-card-content>
            <div class="stat-number">{{contarEncaminhados()}}</div>
            <div class="stat-label">Encaminhados</div>
          </mat-card-content>
        </mat-card>

        <mat-card class="stat-card">
          <mat-card-content>
            <div class="stat-number">{{contarEmAtendimento()}}</div>
            <div class="stat-label">Em Atendimento</div>
          </mat-card-content>
        </mat-card>

        <mat-card class="stat-card">
          <mat-card-content>
            <div class="stat-number">{{formatarTempo(tempoMedioEspera)}}</div>
            <div class="stat-label">Tempo Médio Espera</div>
          </mat-card-content>
        </mat-card>
      </div>

      <!-- Filtro de Status -->
      <div class="status-filter mb-4">
        <label class="block text-sm font-medium text-gray-700 mb-2">Filtrar por Status</label>
        <select
          [(ngModel)]="filtroStatus"
          (change)="carregarDados()"
          class="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-purple-600 focus:border-purple-600 sm:text-sm">
          <option value="">Todos (pós-triagem)</option>
          <option value="em_triagem">Em Triagem</option>
          <option value="em triagem">Em Triagem (legado)</option>
          <option value="encaminhado para sala médica">Encaminhado para Sala Médica</option>
          <option value="em atendimento médico">Em Atendimento Médico</option>
          <option value="encaminhado para ambulatório">Encaminhado para Ambulatório</option>
          <option value="em atendimento ambulatorial">Em Atendimento Ambulatorial</option>
          <option value="encaminhado para exames">Encaminhado para Exames</option>
          <option value="aguardando exames">Aguardando Exames</option>
          <option value="exames concluídos">Exames Concluídos</option>
          <option value="alta médica">Alta Médica</option>
          <option value="transferido">Transferido</option>
          <option value="óbito">Óbito</option>
        </select>
      </div>

      <!-- Lista de Atendimentos Pós-triagem -->
      <div class="patients-list" *ngIf="!carregando; else loadingTemplate">
        <mat-card *ngFor="let paciente of pacientes" class="patient-card">
          <mat-card-header>
            <div mat-card-avatar class="patient-avatar" [style.background-color]="getCorStatus(paciente.status)">
              {{getIniciais(paciente.paciente_nome)}}
            </div>
            <mat-card-title>{{paciente.paciente_nome}}</mat-card-title>
            <mat-card-subtitle>
              {{getIdade(paciente.paciente_nascimento)}} anos • {{paciente.paciente_sexo}}
            </mat-card-subtitle>
          </mat-card-header>

          <mat-card-content>
            <div class="patient-info">
              <div class="info-row">
                <mat-icon>schedule</mat-icon>
                <span>Tempo em espera desde o atendimento: {{formatarTempo(paciente.tempo_espera)}}</span>
              </div>
              <div class="info-row">
                <mat-icon>event</mat-icon>
                <span>Chegada: {{formatarDataHora(paciente.data_hora_atendimento)}}</span>
              </div>
              <div class="status-chip">
                <mat-chip [style.background-color]="getCorStatus(paciente.status)">
                  {{getDescricaoStatus(paciente.status)}}
                </mat-chip>
              </div>
            </div>
          </mat-card-content>

          <mat-card-actions>
            <button mat-button (click)="abrirTriagem(paciente)">
              <mat-icon>visibility</mat-icon>
              Abrir Triagem
            </button>
          </mat-card-actions>
        </mat-card>

        <div *ngIf="pacientes.length === 0" class="no-patients">
          <mat-icon>check_circle</mat-icon>
          <h3>Nenhum atendimento em pós-triagem</h3>
          <p>Não há atendimentos em pós-triagem neste momento.</p>
        </div>
      </div>

      <ng-template #loadingTemplate>
        <div class="loading-container">
          <mat-progress-spinner mode="indeterminate"></mat-progress-spinner>
          <p>Carregando pós-triagem...</p>
        </div>
      </ng-template>
    </div>
  `,
  styles: [`
    :host { --card-col-min: 420px; }
    .triagem-container { padding: 20px; max-width: 1200px; margin: 0 auto; }
    .page-title { display: flex; align-items: center; gap: 10px; margin-bottom: 20px; color: #553C9A; }
    .stats-cards { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 15px; margin-bottom: 20px; }
    .stat-card { text-align: center; }
    .stat-number { font-size: 2em; font-weight: bold; color: #553C9A; }
    .stat-label { color: #666; margin-top: 5px; }
    .status-filter { margin-bottom: 20px; width: 49.5%; }
    @media (max-width: 600px) { .status-filter { width: 100%; } }
    .patients-list { display: grid; grid-template-columns: repeat(auto-fill, minmax(var(--card-col-min), 1fr)); gap: 15px; }
    .patient-card { transition: all 0.3s ease; }
    .patient-card:hover { transform: translateY(-2px); box-shadow: 0 4px 12px rgba(0,0,0,0.15); }
    .patient-avatar { color: white; font-weight: bold; display: flex; align-items: center; justify-content: center; }
    .patient-info { margin: 10px 0; }
    .info-row { display: flex; align-items: center; gap: 8px; margin: 8px 0; color: #666; }
    .status-chip { margin-top: 10px; }
    .status-chip mat-chip { color: white; font-weight: bold; }
    .no-patients { text-align: center; padding: 40px; color: #666; grid-column: 1 / -1; }
    .no-patients mat-icon { font-size: 48px; color: #48bb78; margin-bottom: 10px; }
    .loading-container { text-align: center; padding: 40px; grid-column: 1 / -1; }
  `]
})
export class FilaPosTriagemComponent implements OnInit, OnDestroy {
  pacientes: PacienteTriagem[] = [];
  carregando = true;
  filtroStatus: string = '';
  tempoMedioEspera = 0;

  private atualizacaoSubscription?: Subscription;

  constructor(
    private triagemService: TriagemService,
    private snackBar: MatSnackBar,
    private router: Router
  ) {}

  ngOnInit() {
    this.carregarDados();
    this.iniciarAtualizacaoAutomatica();
  }

  ngOnDestroy() {
    this.atualizacaoSubscription?.unsubscribe();
  }

  private iniciarAtualizacaoAutomatica() {
    this.atualizacaoSubscription = interval(30000).subscribe(() => this.carregarDados(false));
  }

  async carregarDados(mostrarLoading = true) {
    try {
      if (mostrarLoading) this.carregando = true;
      const pacientes = await firstValueFrom(this.triagemService.listarTodosAtendimentosDia());
  const POS_TRIAGEM = new Set([
        'encaminhado para sala médica', '3 - Encaminhado para sala médica', 'encaminhado_para_sala_medica',
        'em atendimento médico', '4 - Em atendimento médico', 'em_atendimento_medico',
        'encaminhado para ambulatório', '5 - Encaminhado para ambulatório', 'encaminhado_para_ambulatorio',
        'em atendimento ambulatorial', '6 - Em atendimento ambulatorial', 'em_atendimento_ambulatorial',
        'encaminhado para exames', '7 - Encaminhado para exames', 'encaminhado_para_exames',
        'aguardando exames', 'exames concluídos', 'alta médica', 'transferido', 'óbito'
      ]);
      const lista = (pacientes || [])
        .filter(p => p && POS_TRIAGEM.has(p.status))
        .filter(p => !this.filtroStatus || p.status === this.filtroStatus)
        .sort((a, b) => (b.tempo_espera || 0) - (a.tempo_espera || 0));
      this.pacientes = lista;

      const tempos = this.pacientes.map(p => p.tempo_espera || 0);
      this.tempoMedioEspera = tempos.length ? Math.round(tempos.reduce((a,b)=>a+b,0) / tempos.length) : 0;
    } catch (err) {
      console.error('Erro ao carregar pós-triagem:', err);
      this.snackBar.open('Erro ao carregar pós-triagem', 'Fechar', { duration: 5000 });
    } finally {
      this.carregando = false;
    }
  }

  abrirTriagem(paciente: PacienteTriagem) {
    if (!paciente?.id) return;
    this.router.navigate(['/triagem/realizar', paciente.id], { state: { modoEdicao: true } });
  }

  contarEncaminhados(): number {
    const ENCAMINHADOS = new Set([
      'encaminhado para sala médica', '3 - Encaminhado para sala médica', 'encaminhado_para_sala_medica',
      'encaminhado para ambulatório', '5 - Encaminhado para ambulatório', 'encaminhado_para_ambulatorio',
      'encaminhado para exames', '7 - Encaminhado para exames', 'encaminhado_para_exames',
      'aguardando exames'
    ]);
    return (this.pacientes || []).filter(p => p && ENCAMINHADOS.has(p.status)).length;
  }

  contarEmAtendimento(): number {
    const EM_ATENDIMENTO = new Set([
      'em atendimento médico', '4 - Em atendimento médico', 'em_atendimento_medico',
      'em atendimento ambulatorial', '6 - Em atendimento ambulatorial', 'em_atendimento_ambulatorial',
      'em_triagem', 'em triagem', '2 - Em triagem'
    ]);
    return (this.pacientes || []).filter(p => p && EM_ATENDIMENTO.has(p.status)).length;
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
      '1 - Encaminhado para triagem': '#2196F3',
      'encaminhado_para_triagem': '#2196F3',
      'encaminhado para triagem': '#2196F3',
      '2 - Em triagem': '#4CAF50',
      'em_triagem': '#4CAF50',
      'em triagem': '#4CAF50',
      '3 - Encaminhado para sala médica': '#FF9800',
      'encaminhado_para_sala_medica': '#FF9800',
      'encaminhado para sala médica': '#FF9800',
      '4 - Em atendimento médico': '#FF5722',
      'em_atendimento_medico': '#FF5722',
      'em atendimento médico': '#FF5722',
      '5 - Encaminhado para ambulatório': '#9C27B0',
      'encaminhado_para_ambulatorio': '#9C27B0',
      'encaminhado para ambulatório': '#9C27B0',
      '6 - Em atendimento ambulatorial': '#3F51B5',
      'em_atendimento_ambulatorial': '#3F51B5',
      'em atendimento ambulatorial': '#3F51B5',
      '7 - Encaminhado para exames': '#009688',
      'encaminhado_para_exames': '#009688',
      'encaminhado para exames': '#009688',
      'aguardando exames': '#607D8B',
      'exames concluídos': '#4CAF50',
      'alta médica': '#2E7D32',
      'transferido': '#6D4C41',
      'óbito': '#263238'
    };
    return cores[status] || '#757575';
  }

  getDescricaoStatus(status: string): string {
    const descricoes: Record<string, string> = {
      '1 - Encaminhado para triagem': '1 - Encaminhado para Triagem',
      'encaminhado_para_triagem': '1 - Encaminhado para Triagem',
      'encaminhado para triagem': '1 - Encaminhado para Triagem',
      '2 - Em triagem': '2 - Em Triagem',
      'em_triagem': '2 - Em Triagem',
      'em triagem': '2 - Em Triagem',
      '3 - Encaminhado para sala médica': '3 - Encaminhado para Sala Médica',
      'encaminhado_para_sala_medica': '3 - Encaminhado para Sala Médica',
      'encaminhado para sala médica': '3 - Encaminhado para Sala Médica',
      '4 - Em atendimento médico': '4 - Em Atendimento Médico',
      'em_atendimento_medico': '4 - Em Atendimento Médico',
      'em atendimento médico': '4 - Em Atendimento Médico',
      '5 - Encaminhado para ambulatório': '5 - Encaminhado para Ambulatório',
      'encaminhado_para_ambulatorio': '5 - Encaminhado para Ambulatório',
      'encaminhado para ambulatório': '5 - Encaminhado para Ambulatório',
      '6 - Em atendimento ambulatorial': '6 - Em Atendimento Ambulatorial',
      'em_atendimento_ambulatorial': '6 - Em Atendimento Ambulatorial',
      'em atendimento ambulatorial': '6 - Em Atendimento Ambulatorial',
      '7 - Encaminhado para exames': '7 - Encaminhado para Exames',
      'encaminhado_para_exames': '7 - Encaminhado para Exames',
      'encaminhado para exames': '7 - Encaminhado para Exames',
      'aguardando exames': 'Aguardando Exames',
      'exames concluídos': 'Exames Concluídos',
      'alta médica': 'Alta Médica',
      'transferido': 'Transferido',
      'óbito': 'Óbito'
    };
    return descricoes[status] || status;
  }
}
