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
import { MatDividerModule } from '@angular/material/divider';
import { ActivatedRoute, Router } from '@angular/router';
import { TriagemService } from '../services/triagem.service';
import { TriagemEventService } from '../services/triagem-event.service';

@Component({
  selector: 'app-realizar-triagem-ultra-seguro',
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
    MatDividerModule
  ],
  template: `
    <div class="triagem-container">
      <div class="header">
        <button mat-icon-button (click)="voltar()">
          <mat-icon>arrow_back</mat-icon>
        </button>
        <h1>
          <mat-icon>medical_services</mat-icon>
          Triagem - {{nomePaciente}}
        </h1>
      </div>

      <!-- Status do Sistema -->
      <!-- Card removido - carregamento automático implementado -->

      <!-- Formulário Ultra Simples -->
      <form [formGroup]="triagemForm" (ngSubmit)="salvarTriagem()">
        <mat-card class="form-card">
          <mat-card-header>
            <mat-card-title>Dados da Triagem</mat-card-title>
            <mat-card-subtitle>
              <!-- Removed button with edit icon -->
            </mat-card-subtitle>
          </mat-card-header>

          <mat-card-content>
            <!-- Sinais Vitais -->
            <h3>Sinais Vitais</h3>
            <div class="form-row">
              <mat-form-field>
                <mat-label>Pressão Arterial</mat-label>
                <input matInput formControlName="pressao_arterial" placeholder="120/80">
              </mat-form-field>

              <mat-form-field>
                <mat-label>Temperatura (°C)</mat-label>
                <input matInput type="number" formControlName="temperatura" step="0.1">
              </mat-form-field>
            </div>

            <div class="form-row">
              <mat-form-field>
                <mat-label>Frequência Cardíaca</mat-label>
                <input matInput type="number" formControlName="frequencia_cardiaca">
              </mat-form-field>

              <mat-form-field>
                <mat-label>Saturação O2 (%)</mat-label>
                <input matInput type="number" formControlName="saturacao_oxigenio" min="70" max="100">
              </mat-form-field>
            </div>

            <!-- Classificação de Risco -->
            <h3>Classificação de Risco</h3>
            <mat-form-field>
              <mat-label>Classificação de Risco</mat-label>
              <mat-select formControlName="classificacao_risco">
                <mat-option value="vermelho">🔴 Vermelho - Emergência</mat-option>
                <mat-option value="laranja">🟠 Laranja - Urgente</mat-option>
                <mat-option value="amarelo">🟡 Amarelo - Pouco Urgente</mat-option>
                <mat-option value="verde">🟢 Verde - Não Urgente</mat-option>
                <mat-option value="azul">🔵 Azul - Eletivo</mat-option>
              </mat-select>
            </mat-form-field>

            <mat-form-field>
              <mat-label>Encaminhar para</mat-label>
              <mat-select formControlName="status_destino">
                <mat-option value="encaminhado para sala médica">Sala Médica</mat-option>
                <mat-option value="encaminhado para ambulatório">Ambulatório</mat-option>
                <mat-option value="encaminhado para exames">Exames</mat-option>
              </mat-select>
            </mat-form-field>

            <!-- Dados Clínicos -->
            <h3>Dados Clínicos</h3>
            <mat-form-field>
              <mat-label>Queixa Principal</mat-label>
              <textarea matInput formControlName="queixa_principal" rows="3"></textarea>
            </mat-form-field>

            <mat-form-field>
              <mat-label>História Atual</mat-label>
              <textarea matInput formControlName="historia_atual" rows="3"></textarea>
            </mat-form-field>

            <mat-form-field>
              <mat-label>Observações</mat-label>
              <textarea matInput formControlName="observacoes_triagem" rows="2"></textarea>
            </mat-form-field>
          </mat-card-content>

          <mat-card-actions>
            <button mat-raised-button color="primary" type="submit" [disabled]="!triagemForm.valid || salvando">
              <mat-icon>save</mat-icon>
              {{salvando ? 'Finalizando...' : 'Finalizar Triagem'}}
            </button>

            <button mat-button type="button" (click)="voltar()">
              <mat-icon>cancel</mat-icon>
              Cancelar
            </button>
          </mat-card-actions>
        </mat-card>
      </form>
    </div>
  `,
  styles: [`
    .triagem-container {
      padding: 20px;
      max-width: 800px;
      margin: 0 auto;
    }

    .header {
      display: flex;
      align-items: center;
      gap: 10px;
      margin-bottom: 20px;
    }

    .header h1 {
      display: flex;
      align-items: center;
      gap: 10px;
      margin: 0;
      color: #2c5282;
    }

    .status-card, .form-card {
      margin-bottom: 20px;
    }

    .form-row {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 15px;
      margin-bottom: 15px;
    }

    mat-form-field {
      width: 100%;
      margin-bottom: 10px;
    }

    h3 {
      color: #2c5282;
      margin: 20px 0 15px 0;
    }

    h3:first-of-type {
      margin-top: 0;
    }
  `]
})
export class RealizarTriagemUltraSeguroComponent implements OnInit {
  atendimentoId: number;
  triagemForm!: FormGroup;
  salvando = false;
  statusSistema = 'Inicializando...';
  componenteCarregado = false;
  nomePaciente = 'Carregando...';
  carregandoPaciente = false;

  constructor(
    private fb: FormBuilder,
    private route: ActivatedRoute,
    private router: Router,
    private snackBar: MatSnackBar,
    private triagemService: TriagemService,
    private triagemEventService: TriagemEventService
  ) {
    console.log('=== CONSTRUCTOR ULTRA SEGURO ===');
    this.atendimentoId = +this.route.snapshot.params['id'] || 0;
    this.statusSistema = 'Constructor executado';
    this.triagemForm = this.criarFormulario();
    console.log('Atendimento ID:', this.atendimentoId);
  }

  ngOnInit() {
    console.log('=== NgOnInit ULTRA SEGURO ===');
    this.componenteCarregado = true;

    // Carregar automaticamente o nome do paciente para o título
    this.carregarNomePaciente();

    // Sempre carregar os dados da triagem existente com base no atendimentoId
    this.carregarDadosTriagemExistente();

    console.log('Componente pronto - Carregando nome do paciente automaticamente');
  }

  private criarFormulario(): FormGroup {
    console.log('Criando formulário...');
    return this.fb.group({
      pressao_arterial: ['', [Validators.required]],
      temperatura: ['', [Validators.required]],
      frequencia_cardiaca: ['', [Validators.required]],
      saturacao_oxigenio: [''],
      classificacao_risco: ['', Validators.required],
      status_destino: ['encaminhado para sala médica', Validators.required],
      queixa_principal: ['', Validators.required],
      historia_atual: [''],
      observacoes_triagem: ['']
    });
  }

  async salvarTriagem() {
    if (!this.triagemForm.valid) {
      this.snackBar.open('Por favor, preencha todos os campos obrigatórios', 'Fechar', {
        duration: 5000
      });
      return;
    }

    this.salvando = true;
    this.statusSistema = 'Salvando dados...';

    try {
      const dados = this.triagemForm.value;
      const statusDestino = dados.status_destino;
      
      console.log('Salvando triagem:', dados);
      console.log('Status de destino:', statusDestino);
      
      // Primeiro salvar os dados da triagem
      await this.triagemService.salvarTriagem(this.atendimentoId, dados).toPromise();
      
      // Depois finalizar a triagem com o status de destino
      await this.triagemService.finalizarTriagem(this.atendimentoId, statusDestino).toPromise();
      
      // Notificar que a triagem foi finalizada
      this.triagemEventService.notificarTriagemFinalizada();
      
      this.snackBar.open('Triagem finalizada com sucesso!', 'Fechar', {
        duration: 3000
      });
      this.statusSistema = 'Triagem finalizada com sucesso';
      this.router.navigate(['/triagem']);
    } catch (error) {
      console.error('Erro ao salvar triagem:', error);
      this.snackBar.open('Erro ao salvar triagem. Tente novamente.', 'Fechar', {
        duration: 5000
      });
      this.statusSistema = 'Erro ao salvar triagem';
    } finally {
      this.salvando = false;
    }
  }

  voltar() {
    console.log('Voltando para lista de triagem...');
    this.router.navigate(['/triagem']);
  }

  async carregarNomePaciente() {
    if (this.carregandoPaciente) return;

    try {
      this.carregandoPaciente = true;
      this.statusSistema = 'Carregando nome do paciente...';

      console.log('=== CARREGANDO NOME DO PACIENTE ===');
      console.log('Atendimento ID:', this.atendimentoId);

      const dadosTriagem = await this.triagemService.obterDadosTriagem(this.atendimentoId).toPromise();

      if (dadosTriagem && dadosTriagem.paciente_nome) {
        this.nomePaciente = dadosTriagem.paciente_nome;
        this.statusSistema = 'Nome do paciente carregado com sucesso';
        console.log('Nome do paciente:', this.nomePaciente);
      } else {
        this.nomePaciente = 'Nome não encontrado';
        this.statusSistema = 'Erro: Nome do paciente não encontrado';
      }

    } catch (error) {
      console.error('Erro ao carregar nome do paciente:', error);
      this.nomePaciente = 'Erro ao carregar';
      this.statusSistema = 'Erro ao carregar nome do paciente';
      this.snackBar.open('Erro ao carregar nome do paciente', 'Fechar', { duration: 5000 });
    } finally {
      this.carregandoPaciente = false;
    }
  }

  async carregarDadosTriagemExistente() {
    try {
      this.statusSistema = 'Carregando dados de triagem existentes...';

      console.log('=== CARREGANDO DADOS DE TRIAGEM EXISTENTES ===');
      console.log('Atendimento ID:', this.atendimentoId);

      const dadosTriagem = await this.triagemService.obterDadosTriagem(this.atendimentoId).toPromise();

      if (dadosTriagem) {
        console.log('Dados de triagem encontrados:', dadosTriagem);

        // Carregar nome do paciente
        this.nomePaciente = dadosTriagem.paciente_nome || 'Nome não encontrado';

        // Carregar dados do formulário de triagem
        this.triagemForm.patchValue({
          // Sinais vitais
          pressao_arterial: dadosTriagem.pressao_arterial || '',
          temperatura: dadosTriagem.temperatura || null,
          frequencia_cardiaca: dadosTriagem.frequencia_cardiaca || null,
          frequencia_respiratoria: dadosTriagem.frequencia_respiratoria || null,
          saturacao_oxigenio: dadosTriagem.saturacao_oxigenio || null,
          peso: dadosTriagem.peso || null,
          altura: dadosTriagem.altura || null,

          // Classificação
          classificacao_risco: dadosTriagem.classificacao_risco || '',
          status_destino: dadosTriagem.status_destino || 'encaminhado para sala médica',

          // Dados clínicos
          queixa_principal: dadosTriagem.queixa_principal || '',
          historia_atual: dadosTriagem.historia_atual || '',
          alergias: dadosTriagem.alergias || '',
          medicamentos_uso: dadosTriagem.medicamentos_uso || '',
          observacoes_triagem: dadosTriagem.observacoes_triagem || ''
        });

        this.statusSistema = 'Dados de triagem carregados com sucesso - MODO EDIÇÃO';
        this.snackBar.open('Dados de triagem carregados para edição', 'Fechar', { duration: 3000 });
      } else {
        this.statusSistema = 'Nenhum dado de triagem encontrado - MODO NOVO';
        this.snackBar.open('Nenhum dado anterior encontrado. Iniciando nova triagem.', 'Fechar', { duration: 3000 });
      }

    } catch (error) {
      console.error('Erro ao carregar dados de triagem:', error);
      this.statusSistema = 'Erro ao carregar dados de triagem existentes';
      this.snackBar.open('Erro ao carregar dados. Iniciando triagem vazia.', 'Fechar', { duration: 5000 });
    }
  }
}
