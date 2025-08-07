import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatChipsModule } from '@angular/material/chips';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBarModule, MatSnackBar } from '@angular/material/snack-bar';
import { MatDialog } from '@angular/material/dialog';
import { Router } from '@angular/router';
import { interval, Subscription } from 'rxjs';

import { TriagemService } from '../services/triagem.service';

interface PacienteTriagem {
  id: number;
  paciente_nome: string;
  paciente_nascimento: string;
  paciente_sexo: string;
  data_hora_atendimento: string;
  status: string;
  classificacao_risco?: string;
  queixa_principal?: string;
  tempo_espera: number;
  alerta?: string;
}

interface Estatisticas {
  pacientes_aguardando: number;
  por_classificacao: Record<string, number>;
  tempo_medio_espera: number;
}

@Component({
  selector: 'app-fila-triagem',
  standalone: true,
  imports: [
    CommonModule,
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
        <mat-icon>medical_services</mat-icon>
        Fila de Triagem
      </h1>

      <!-- Estatísticas -->
      <div class="stats-cards">
        <mat-card class="stat-card">
          <mat-card-content>
            <div class="stat-number">{{estatisticas.pacientes_aguardando}}</div>
            <div class="stat-label">Aguardando Triagem</div>
          </mat-card-content>
        </mat-card>

        <mat-card class="stat-card">
          <mat-card-content>
            <div class="stat-number">{{estatisticas.tempo_medio_espera}}min</div>
            <div class="stat-label">Tempo Médio Espera</div>
          </mat-card-content>
        </mat-card>

        <mat-card class="stat-card priority-card">
          <mat-card-content>
            <div class="stat-label">Por Classificação</div>
            <div class="priority-chips">
              <mat-chip-set>
                <mat-chip *ngFor="let item of getClassificacaoArray()" 
                         [style.background-color]="getCor(item.key)"
                         class="priority-chip">
                  {{item.value}}
                </mat-chip>
              </mat-chip-set>
            </div>
          </mat-card-content>
        </mat-card>
      </div>

      <!-- Lista de Pacientes -->
      <div class="patients-list" *ngIf="!carregando; else loadingTemplate">
        <mat-card *ngFor="let paciente of pacientes" 
                  class="patient-card" 
                  [class.priority-alert]="paciente.alerta === 'tempo_excedido'">
          
          <mat-card-header>
            <div mat-card-avatar class="patient-avatar" 
                 [style.background-color]="getCor(paciente.classificacao_risco)">
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
                <span>Espera: {{paciente.tempo_espera}} minutos</span>
                <mat-icon *ngIf="paciente.alerta === 'tempo_excedido'" 
                         class="alert-icon">warning</mat-icon>
              </div>

              <div class="info-row" *ngIf="paciente.queixa_principal">
                <mat-icon>chat</mat-icon>
                <span>{{paciente.queixa_principal}}</span>
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
            <button mat-raised-button 
                    color="primary"
                    (click)="iniciarTriagem(paciente)"
                    [disabled]="paciente.status === 'em_triagem'">
              <mat-icon>play_arrow</mat-icon>
              {{paciente.status === 'em_triagem' ? 'Em Triagem' : 'Iniciar Triagem'}}
            </button>

            <button mat-button (click)="verDetalhes(paciente)">
              <mat-icon>visibility</mat-icon>
              Detalhes
            </button>
          </mat-card-actions>
        </mat-card>

        <!-- Mensagem quando não há pacientes -->
        <div *ngIf="pacientes.length === 0" class="no-patients">
          <mat-icon>check_circle</mat-icon>
          <h3>Nenhum paciente aguardando triagem</h3>
          <p>Todos os pacientes foram atendidos ou não há novos atendimentos.</p>
        </div>
      </div>

      <ng-template #loadingTemplate>
        <div class="loading-container">
          <mat-progress-spinner mode="indeterminate"></mat-progress-spinner>
          <p>Carregando fila de triagem...</p>
        </div>
      </ng-template>
    </div>
  `,
  styles: [`
    .triagem-container {
      padding: 20px;
      max-width: 1200px;
      margin: 0 auto;
    }

    .page-title {
      display: flex;
      align-items: center;
      gap: 10px;
      margin-bottom: 20px;
      color: #2c5282;
    }

    .stats-cards {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 15px;
      margin-bottom: 20px;
    }

    .stat-card {
      text-align: center;
    }

    .stat-number {
      font-size: 2em;
      font-weight: bold;
      color: #2c5282;
    }

    .stat-label {
      color: #666;
      margin-top: 5px;
    }

    .priority-card .stat-label {
      margin-bottom: 10px;
    }

    .priority-chips {
      display: flex;
      justify-content: center;
    }

    .priority-chip {
      color: white;
      font-weight: bold;
    }

    .patients-list {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(400px, 1fr));
      gap: 15px;
    }

    .patient-card {
      transition: all 0.3s ease;
    }

    .patient-card:hover {
      transform: translateY(-2px);
      box-shadow: 0 4px 12px rgba(0,0,0,0.15);
    }

    .priority-alert {
      border-left: 4px solid #e53e3e;
    }

    .patient-avatar {
      color: white;
      font-weight: bold;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .patient-info {
      margin: 10px 0;
    }

    .info-row {
      display: flex;
      align-items: center;
      gap: 8px;
      margin: 8px 0;
      color: #666;
    }

    .alert-icon {
      color: #e53e3e;
      margin-left: auto;
    }

    .status-chip {
      margin-top: 10px;
    }

    .status-chip mat-chip {
      color: white;
      font-weight: bold;
    }

    .no-patients {
      text-align: center;
      padding: 40px;
      color: #666;
      grid-column: 1 / -1;
    }

    .no-patients mat-icon {
      font-size: 48px;
      color: #48bb78;
      margin-bottom: 10px;
    }

    .loading-container {
      text-align: center;
      padding: 40px;
      grid-column: 1 / -1;
    }
  `]
})
export class FilaTriagemComponent implements OnInit, OnDestroy {
  pacientes: PacienteTriagem[] = [];
  estatisticas: Estatisticas = {
    pacientes_aguardando: 0,
    por_classificacao: {},
    tempo_medio_espera: 0
  };
  carregando = true;
  
  private atualizacaoSubscription?: Subscription;
  
  // Cores para classificação de risco
  private coresPrioridade: Record<string, string> = {
    'vermelho': '#E53E3E',
    'laranja': '#FF8C00',
    'amarelo': '#F6E05E',
    'verde': '#48BB78',
    'azul': '#4299E1'
  };

  constructor(
    private triagemService: TriagemService,
    private snackBar: MatSnackBar,
    private dialog: MatDialog,
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
    // Atualizar a cada 30 segundos
    this.atualizacaoSubscription = interval(30000).subscribe(() => {
      this.carregarDados(false); // false = não mostrar loading
    });
  }

  async carregarDados(mostrarLoading = true) {
    try {
      if (mostrarLoading) {
        this.carregando = true;
      }

      const [pacientes, estatisticas] = await Promise.all([
        this.triagemService.listarFilaTriagem().toPromise(),
        this.triagemService.obterEstatisticas().toPromise()
      ]);

      this.pacientes = pacientes || [];
      this.estatisticas = estatisticas || this.estatisticas;
    } catch (error) {
      console.error('Erro ao carregar dados da triagem:', error);
      this.snackBar.open('Erro ao carregar dados da triagem', 'Fechar', {
        duration: 5000
      });
    } finally {
      this.carregando = false;
    }
  }

  async iniciarTriagem(paciente: PacienteTriagem) {
    try {
      const usuarioId = 1; // TODO: Pegar do serviço de autenticação
      
      await this.triagemService.iniciarTriagem(paciente.id, usuarioId).toPromise();
      
      this.snackBar.open(`Triagem iniciada para ${paciente.paciente_nome}`, 'Fechar', {
        duration: 3000
      });
      
      // Navegar para tela de triagem
      this.router.navigate(['/triagem/realizar', paciente.id]);
    } catch (error) {
      console.error('Erro ao iniciar triagem:', error);
      this.snackBar.open('Erro ao iniciar triagem', 'Fechar', {
        duration: 5000
      });
    }
  }

  verDetalhes(paciente: PacienteTriagem) {
    // TODO: Abrir modal com detalhes do paciente
    console.log('Ver detalhes:', paciente);
  }

  getCor(classificacao?: string): string {
    return classificacao ? this.coresPrioridade[classificacao] || '#757575' : '#757575';
  }

  getCorStatus(status: string): string {
    const cores: Record<string, string> = {
      'recepcao': '#2196F3',
      'aguardando_triagem': '#FF9800',
      'em_triagem': '#4CAF50'
    };
    return cores[status] || '#757575';
  }

  getDescricaoStatus(status: string): string {
    const descricoes: Record<string, string> = {
      'recepcao': 'Recepção',
      'aguardando_triagem': 'Aguardando',
      'em_triagem': 'Em Triagem'
    };
    return descricoes[status] || status;
  }

  getIniciais(nome: string): string {
    return nome.split(' ')
      .slice(0, 2)
      .map(n => n.charAt(0))
      .join('')
      .toUpperCase();
  }

  getIdade(nascimento: string): number {
    const hoje = new Date();
    const dataNasc = new Date(nascimento);
    let idade = hoje.getFullYear() - dataNasc.getFullYear();
    const mes = hoje.getMonth() - dataNasc.getMonth();
    
    if (mes < 0 || (mes === 0 && hoje.getDate() < dataNasc.getDate())) {
      idade--;
    }
    
    return idade;
  }

  formatarDataHora(dataHora: string): string {
    return new Date(dataHora).toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  getClassificacaoArray(): Array<{key: string, value: number}> {
    return Object.entries(this.estatisticas.por_classificacao)
      .map(([key, value]) => ({key, value}));
  }
}
