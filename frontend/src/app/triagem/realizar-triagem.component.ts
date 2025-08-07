import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBarModule, MatSnackBar } from '@angular/material/snack-bar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatChipsModule } from '@angular/material/chips';
import { MatDividerModule } from '@angular/material/divider';
import { ActivatedRoute, Router } from '@angular/router';

import { TriagemService, AtendimentoCompleto, ClassificacaoRisco } from '../services/triagem.service';

@Component({
  selector: 'app-realizar-triagem',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatButtonModule,
    MatIconModule,
    MatSnackBarModule,
    MatProgressSpinnerModule,
    MatChipsModule,
    MatDividerModule
  ],
  template: `
    <div class="triagem-container" *ngIf="!carregando; else loadingTemplate">
      <div class="header">
        <button mat-icon-button (click)="voltar()">
          <mat-icon>arrow_back</mat-icon>
        </button>
        <h1>Triagem - {{paciente?.paciente_nome}}</h1>
        <div class="status-chip">
          <mat-chip [style.background-color]="getCorStatus()">
            {{getDescricaoStatus()}}
          </mat-chip>
        </div>
      </div>

      <!-- Informações do Paciente -->
      <mat-card class="patient-info-card">
        <mat-card-header>
          <mat-card-title>
            <mat-icon>person</mat-icon>
            Informações do Paciente
          </mat-card-title>
        </mat-card-header>
        <mat-card-content>
          <div class="patient-grid">
            <div><strong>Nome:</strong> {{paciente?.paciente_nome}}</div>
            <div><strong>Idade:</strong> {{getIdade()}} anos</div>
            <div><strong>Sexo:</strong> {{paciente?.paciente_sexo}}</div>
            <div><strong>CPF:</strong> {{paciente?.paciente_cpf}}</div>
            <div><strong>Chegada:</strong> {{formatarDataHora(paciente?.data_hora_atendimento)}}</div>
            <div><strong>Tempo de Espera:</strong> {{getTempoEspera()}} minutos</div>
          </div>
        </mat-card-content>
      </mat-card>

      <form [formGroup]="triagemForm" (ngSubmit)="salvarTriagem()">
        <div class="form-grid">
          <!-- Sinais Vitais -->
          <mat-card class="form-section">
            <mat-card-header>
              <mat-card-title>
                <mat-icon>favorite</mat-icon>
                Sinais Vitais
              </mat-card-title>
            </mat-card-header>
            <mat-card-content>
              <div class="vital-signs-grid">
                <mat-form-field appearance="outline">
                  <mat-label>Pressão Arterial</mat-label>
                  <input matInput 
                         formControlName="pressao_arterial" 
                         placeholder="120/80"
                         pattern="[0-9]{2,3}/[0-9]{2,3}">
                  <mat-icon matSuffix>monitor_heart</mat-icon>
                  <mat-error>Pressão arterial é obrigatória (formato: 120/80)</mat-error>
                </mat-form-field>

                <mat-form-field appearance="outline">
                  <mat-label>Temperatura (°C)</mat-label>
                  <input matInput 
                         type="number" 
                         step="0.1"
                         formControlName="temperatura" 
                         placeholder="36.5">
                  <mat-icon matSuffix>thermostat</mat-icon>
                  <mat-error>Temperatura é obrigatória</mat-error>
                </mat-form-field>

                <mat-form-field appearance="outline">
                  <mat-label>Frequência Cardíaca (BPM)</mat-label>
                  <input matInput 
                         type="number" 
                         formControlName="frequencia_cardiaca" 
                         placeholder="80">
                  <mat-icon matSuffix>monitor_heart</mat-icon>
                  <mat-error>Frequência cardíaca é obrigatória</mat-error>
                </mat-form-field>

                <mat-form-field appearance="outline">
                  <mat-label>Frequência Respiratória (RPM)</mat-label>
                  <input matInput 
                         type="number" 
                         formControlName="frequencia_respiratoria" 
                         placeholder="20">
                  <mat-icon matSuffix>air</mat-icon>
                </mat-form-field>

                <mat-form-field appearance="outline">
                  <mat-label>Saturação O₂ (%)</mat-label>
                  <input matInput 
                         type="number" 
                         min="70" 
                         max="100"
                         formControlName="saturacao_oxigenio" 
                         placeholder="98">
                  <mat-icon matSuffix>opacity</mat-icon>
                </mat-form-field>

                <mat-form-field appearance="outline">
                  <mat-label>Peso (kg)</mat-label>
                  <input matInput 
                         type="number" 
                         step="0.1"
                         formControlName="peso" 
                         placeholder="70.5">
                  <mat-icon matSuffix>monitor_weight</mat-icon>
                </mat-form-field>

                <mat-form-field appearance="outline">
                  <mat-label>Altura (cm)</mat-label>
                  <input matInput 
                         type="number" 
                         formControlName="altura" 
                         placeholder="175">
                  <mat-icon matSuffix>height</mat-icon>
                </mat-form-field>
              </div>
            </mat-card-content>
          </mat-card>

          <!-- Classificação de Risco -->
          <mat-card class="form-section">
            <mat-card-header>
              <mat-card-title>
                <mat-icon>priority_high</mat-icon>
                Classificação de Risco
              </mat-card-title>
            </mat-card-header>
            <mat-card-content>
              <mat-form-field appearance="outline" class="full-width">
                <mat-label>Classificação de Risco</mat-label>
                <mat-select formControlName="classificacao_risco" (selectionChange)="onClassificacaoChange()">
                  <mat-option 
                    *ngFor="let item of getClassificacaoArray()" 
                    [value]="item.key"
                    [style.color]="getCor(item.key)">
                    <div class="risk-option">
                      <div class="risk-color" [style.background-color]="getCor(item.key)"></div>
                      <div class="risk-info">
                        <div class="risk-name">{{item.key | titlecase}}</div>
                        <div class="risk-desc">{{item.value.descricao}}</div>
                        <div class="risk-time">Tempo máximo: {{getTempoMaximo(item.value.tempo_max)}}</div>
                      </div>
                    </div>
                  </mat-option>
                </mat-select>
                <mat-error>Classificação de risco é obrigatória</mat-error>
              </mat-form-field>

              <div class="priority-info" *ngIf="triagemForm.get('classificacao_risco')?.value">
                <mat-chip [style.background-color]="getCor(triagemForm.get('classificacao_risco')?.value)">
                  Prioridade {{getPrioridadeAtual()}} - {{getDescricaoAtual()}}
                </mat-chip>
              </div>
            </mat-card-content>
          </mat-card>

          <!-- Dados Clínicos -->
          <mat-card class="form-section clinical-data">
            <mat-card-header>
              <mat-card-title>
                <mat-icon>medical_information</mat-icon>
                Dados Clínicos
              </mat-card-title>
            </mat-card-header>
            <mat-card-content>
              <mat-form-field appearance="outline" class="full-width">
                <mat-label>Queixa Principal</mat-label>
                <textarea matInput 
                         formControlName="queixa_principal" 
                         rows="3"
                         placeholder="Descreva a queixa principal do paciente..."></textarea>
                <mat-error>Queixa principal é obrigatória</mat-error>
              </mat-form-field>

              <mat-form-field appearance="outline" class="full-width">
                <mat-label>História da Doença Atual</mat-label>
                <textarea matInput 
                         formControlName="historia_atual" 
                         rows="4"
                         placeholder="Descreva a evolução dos sintomas..."></textarea>
              </mat-form-field>

              <mat-form-field appearance="outline" class="full-width">
                <mat-label>Alergias</mat-label>
                <textarea matInput 
                         formControlName="alergias" 
                         rows="2"
                         placeholder="Lista de alergias conhecidas ou 'Nega alergias'"></textarea>
              </mat-form-field>

              <mat-form-field appearance="outline" class="full-width">
                <mat-label>Medicamentos em Uso</mat-label>
                <textarea matInput 
                         formControlName="medicamentos_uso" 
                         rows="3"
                         placeholder="Liste os medicamentos em uso atual..."></textarea>
              </mat-form-field>

              <mat-form-field appearance="outline" class="full-width">
                <mat-label>Observações da Triagem</mat-label>
                <textarea matInput 
                         formControlName="observacoes_triagem" 
                         rows="3"
                         placeholder="Observações adicionais..."></textarea>
              </mat-form-field>
            </mat-card-content>
          </mat-card>
        </div>

        <!-- Ações -->
        <div class="actions">
          <button type="button" 
                  mat-button 
                  (click)="voltar()">
            <mat-icon>cancel</mat-icon>
            Cancelar
          </button>
          
          <button type="button" 
                  mat-raised-button 
                  color="accent"
                  (click)="salvarRascunho()"
                  [disabled]="salvando">
            <mat-icon>save</mat-icon>
            Salvar Rascunho
          </button>
          
          <button type="submit" 
                  mat-raised-button 
                  color="primary"
                  [disabled]="!triagemForm.valid || salvando">
            <mat-icon>check</mat-icon>
            Finalizar Triagem
          </button>
        </div>
      </form>
    </div>

    <ng-template #loadingTemplate>
      <div class="loading-container">
        <mat-progress-spinner mode="indeterminate"></mat-progress-spinner>
        <p>Carregando dados do paciente...</p>
      </div>
    </ng-template>
  `,
  styles: [`
    .triagem-container {
      padding: 20px;
      max-width: 1200px;
      margin: 0 auto;
    }

    .header {
      display: flex;
      align-items: center;
      gap: 15px;
      margin-bottom: 20px;
      padding: 15px;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      border-radius: 8px;
    }

    .header h1 {
      flex: 1;
      margin: 0;
    }

    .status-chip mat-chip {
      color: white;
      font-weight: bold;
    }

    .patient-info-card {
      margin-bottom: 20px;
    }

    .patient-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 15px;
      padding: 10px 0;
    }

    .form-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 20px;
      margin-bottom: 20px;
    }

    .clinical-data {
      grid-column: 1 / -1;
    }

    .form-section {
      height: fit-content;
    }

    .vital-signs-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 15px;
    }

    .full-width {
      width: 100%;
    }

    .risk-option {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 5px 0;
    }

    .risk-color {
      width: 20px;
      height: 20px;
      border-radius: 50%;
    }

    .risk-info {
      flex: 1;
    }

    .risk-name {
      font-weight: bold;
    }

    .risk-desc {
      font-size: 0.9em;
      color: #666;
    }

    .risk-time {
      font-size: 0.8em;
      color: #999;
    }

    .priority-info {
      margin-top: 10px;
      text-align: center;
    }

    .priority-info mat-chip {
      color: white;
      font-weight: bold;
    }

    .actions {
      display: flex;
      justify-content: flex-end;
      gap: 15px;
      padding: 20px;
      border-top: 1px solid #eee;
      margin-top: 20px;
    }

    .loading-container {
      text-align: center;
      padding: 40px;
    }

    @media (max-width: 768px) {
      .form-grid {
        grid-template-columns: 1fr;
      }
      
      .vital-signs-grid {
        grid-template-columns: 1fr;
      }
      
      .patient-grid {
        grid-template-columns: 1fr;
      }

      .actions {
        flex-direction: column;
      }
    }

    /* Alertas para valores críticos */
    .mat-form-field.ng-invalid.ng-touched .mat-form-field-outline {
      color: #f44336;
    }

    .critical-value {
      color: #e53e3e;
      font-weight: bold;
    }
  `]
})
export class RealizarTriagemComponent implements OnInit {
  triagemForm: FormGroup;
  paciente?: AtendimentoCompleto;
  classificacaoRisco: ClassificacaoRisco = {};
  carregando = true;
  salvando = false;

  private atendimentoId: number;
  private coresPrioridade: Record<string, string> = {
    'vermelho': '#E53E3E',
    'laranja': '#FF8C00',
    'amarelo': '#F6E05E',
    'verde': '#48BB78',
    'azul': '#4299E1'
  };

  constructor(
    private fb: FormBuilder,
    private triagemService: TriagemService,
    private route: ActivatedRoute,
    private router: Router,
    private snackBar: MatSnackBar
  ) {
    this.atendimentoId = +this.route.snapshot.params['id'];
    this.triagemForm = this.criarFormulario();
  }

  ngOnInit() {
    this.carregarDados();
  }

  private criarFormulario(): FormGroup {
    return this.fb.group({
      // Sinais vitais
      pressao_arterial: ['', [Validators.required, Validators.pattern(/^\d{2,3}\/\d{2,3}$/)]],
      temperatura: ['', [Validators.required, Validators.min(35), Validators.max(43)]],
      frequencia_cardiaca: ['', [Validators.required, Validators.min(30), Validators.max(200)]],
      frequencia_respiratoria: ['', [Validators.min(10), Validators.max(60)]],
      saturacao_oxigenio: ['', [Validators.min(70), Validators.max(100)]],
      peso: ['', [Validators.min(1), Validators.max(300)]],
      altura: ['', [Validators.min(50), Validators.max(250)]],
      
      // Classificação de risco
      classificacao_risco: ['', Validators.required],
      
      // Dados clínicos
      queixa_principal: ['', Validators.required],
      historia_atual: [''],
      alergias: [''],
      medicamentos_uso: [''],
      observacoes_triagem: ['']
    });
  }

  async carregarDados() {
    try {
      const [paciente, classificacao] = await Promise.all([
        this.triagemService.obterDadosTriagem(this.atendimentoId).toPromise(),
        this.triagemService.obterClassificacaoRisco().toPromise()
      ]);

      this.paciente = paciente;
      this.classificacaoRisco = classificacao || {};

      // Preencher formulário com dados existentes se houver
      if (paciente) {
        this.triagemForm.patchValue({
          pressao_arterial: paciente.pressao_arterial || '',
          temperatura: paciente.temperatura || '',
          frequencia_cardiaca: paciente.frequencia_cardiaca || '',
          frequencia_respiratoria: paciente.frequencia_respiratoria || '',
          saturacao_oxigenio: paciente.saturacao_oxigenio || '',
          peso: paciente.peso || '',
          altura: paciente.altura || '',
          classificacao_risco: paciente.classificacao_risco || '',
          queixa_principal: paciente.queixa_principal || '',
          historia_atual: paciente.historia_atual || '',
          alergias: paciente.alergias || '',
          medicamentos_uso: paciente.medicamentos_uso || '',
          observacoes_triagem: paciente.observacoes_triagem || ''
        });
      }
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
      this.snackBar.open('Erro ao carregar dados do paciente', 'Fechar', {
        duration: 5000
      });
      this.router.navigate(['/triagem']);
    } finally {
      this.carregando = false;
    }
  }

  async salvarRascunho() {
    try {
      this.salvando = true;
      const dados = this.triagemForm.value;
      
      await this.triagemService.salvarTriagem(this.atendimentoId, dados).toPromise();
      
      this.snackBar.open('Rascunho salvo com sucesso', 'Fechar', {
        duration: 3000
      });
    } catch (error) {
      console.error('Erro ao salvar rascunho:', error);
      this.snackBar.open('Erro ao salvar rascunho', 'Fechar', {
        duration: 5000
      });
    } finally {
      this.salvando = false;
    }
  }

  async salvarTriagem() {
    if (!this.triagemForm.valid) {
      this.snackBar.open('Preencha todos os campos obrigatórios', 'Fechar', {
        duration: 5000
      });
      return;
    }

    try {
      this.salvando = true;
      const dados = this.triagemForm.value;
      
      // Salvar dados primeiro
      await this.triagemService.salvarTriagem(this.atendimentoId, dados).toPromise();
      
      // Finalizar triagem
      await this.triagemService.finalizarTriagem(this.atendimentoId).toPromise();
      
      this.snackBar.open('Triagem finalizada com sucesso!', 'Fechar', {
        duration: 3000
      });
      
      this.router.navigate(['/triagem']);
    } catch (error: any) {
      console.error('Erro ao finalizar triagem:', error);
      const mensagem = error.error?.error || 'Erro ao finalizar triagem';
      this.snackBar.open(mensagem, 'Fechar', {
        duration: 5000
      });
    } finally {
      this.salvando = false;
    }
  }

  onClassificacaoChange() {
    // A prioridade é definida automaticamente no backend
    const classificacao = this.triagemForm.get('classificacao_risco')?.value;
    console.log('Classificação selecionada:', classificacao);
  }

  voltar() {
    this.router.navigate(['/triagem']);
  }

  // Métodos auxiliares
  getCor(classificacao?: string): string {
    return classificacao ? this.coresPrioridade[classificacao] || '#757575' : '#757575';
  }

  getCorStatus(): string {
    return this.paciente?.status === 'em_triagem' ? '#4CAF50' : '#FF9800';
  }

  getDescricaoStatus(): string {
    return this.paciente?.status === 'em_triagem' ? 'Em Triagem' : 'Aguardando';
  }

  getIdade(): number {
    if (!this.paciente?.paciente_nascimento) return 0;
    
    const hoje = new Date();
    const nascimento = new Date(this.paciente.paciente_nascimento);
    let idade = hoje.getFullYear() - nascimento.getFullYear();
    const mes = hoje.getMonth() - nascimento.getMonth();
    
    if (mes < 0 || (mes === 0 && hoje.getDate() < nascimento.getDate())) {
      idade--;
    }
    
    return idade;
  }

  getTempoEspera(): number {
    if (!this.paciente?.data_hora_atendimento) return 0;
    
    return Math.floor(
      (new Date().getTime() - new Date(this.paciente.data_hora_atendimento).getTime()) / (1000 * 60)
    );
  }

  formatarDataHora(dataHora?: string): string {
    if (!dataHora) return '-';
    
    return new Date(dataHora).toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  getClassificacaoArray(): Array<{key: string, value: any}> {
    return Object.entries(this.classificacaoRisco)
      .map(([key, value]) => ({key, value}))
      .sort((a, b) => a.value.prioridade - b.value.prioridade);
  }

  getPrioridadeAtual(): number {
    const classificacao = this.triagemForm.get('classificacao_risco')?.value;
    return classificacao ? this.classificacaoRisco[classificacao]?.prioridade || 0 : 0;
  }

  getDescricaoAtual(): string {
    const classificacao = this.triagemForm.get('classificacao_risco')?.value;
    return classificacao ? this.classificacaoRisco[classificacao]?.descricao || '' : '';
  }

  getTempoMaximo(tempo: number): string {
    if (tempo === 0) return 'Imediato';
    if (tempo < 60) return `${tempo} min`;
    return `${Math.floor(tempo / 60)}h ${tempo % 60}min`;
  }
}
