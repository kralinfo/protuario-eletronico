import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
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
import { TriagemEventService } from '../services/triagem-event.service';

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
    <div class="triagem-container">
      <div class="header">
        <button mat-icon-button (click)="voltar()">
          <mat-icon>arrow_back</mat-icon>
        </button>
        <h1>
          <mat-icon>medical_services</mat-icon>
          Realizar Triagem
        </h1>
      </div>

      <!-- Loading -->
      <div *ngIf="carregando" class="loading-container">
        <mat-progress-spinner mode="indeterminate"></mat-progress-spinner>
        <p>Carregando dados do paciente...</p>
      </div>

      <!-- Conteúdo principal -->
      <div *ngIf="!carregando">
        <!-- Informações do Paciente -->
        <mat-card class="patient-info-card">
          <mat-card-header>
            <mat-card-title>Paciente: {{paciente?.paciente_nome || 'Carregando...'}}</mat-card-title>
            <mat-card-subtitle>ID do Atendimento: {{atendimentoId}}</mat-card-subtitle>
          </mat-card-header>
        </mat-card>

        <!-- Formulário de Triagem -->
        <form [formGroup]="triagemForm" (ngSubmit)="salvarTriagem()">
          <mat-card class="form-card">
            <mat-card-header>
              <mat-card-title>Dados da Triagem</mat-card-title>
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
              <mat-divider></mat-divider>
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

              <!-- Dados Clínicos -->
              <mat-divider></mat-divider>
              <h3>Dados Clínicos</h3>
              
              <mat-form-field>
                <mat-label>Queixa Principal</mat-label>
                <textarea matInput formControlName="queixa_principal" rows="3"></textarea>
              </mat-form-field>

              <mat-form-field>
                <mat-label>História Atual</mat-label>
                <textarea matInput formControlName="historia_atual" rows="4"></textarea>
              </mat-form-field>

              <mat-form-field>
                <mat-label>Observações</mat-label>
                <textarea matInput formControlName="observacoes_triagem" rows="3"></textarea>
              </mat-form-field>
            </mat-card-content>

            <mat-card-actions>
              <button mat-raised-button color="primary" type="submit" [disabled]="!triagemForm.valid || salvando">
                <mat-icon>save</mat-icon>
                {{salvando ? 'Salvando...' : 'Finalizar Triagem'}}
              </button>
              
              <button mat-button type="button" (click)="voltar()">
                <mat-icon>cancel</mat-icon>
                Cancelar
              </button>
            </mat-card-actions>
          </mat-card>
        </form>
      </div>
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

    .loading-container {
      text-align: center;
      padding: 40px;
    }

    .patient-info-card {
      margin-bottom: 20px;
    }

    .form-card {
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
    }

    h3 {
      color: #2c5282;
      margin: 20px 0 15px 0;
    }

    h3:first-of-type {
      margin-top: 0;
    }

    mat-divider {
      margin: 20px 0;
    }
  `]
})
export class RealizarTriagemComponent implements OnInit {
  atendimentoId: number;
  triagemForm!: FormGroup;
  paciente?: AtendimentoCompleto;
  classificacaoRisco?: ClassificacaoRisco;
  carregando = false; // Começar SEM loading para evitar travamento
  salvando = false;

  constructor(
    private fb: FormBuilder,
    private triagemService: TriagemService,
    private route: ActivatedRoute,
    private router: Router,
    private snackBar: MatSnackBar,
    private cdr: ChangeDetectorRef,
    private triagemEventService: TriagemEventService
  ) {
    console.log('Constructor - Inicializando componente SEGURO');
    this.atendimentoId = +this.route.snapshot.params['id'];
    console.log('Constructor - Atendimento ID:', this.atendimentoId);
    this.triagemForm = this.criarFormulario();
    console.log('Constructor - Componente inicializado com sucesso');
  }

  ngOnInit() {
    console.log('NgOnInit - Componente SEGURO carregado');
    // Não carregar dados automaticamente para evitar travamento
    console.log('NgOnInit - Pronto para uso manual');
  }

  private criarFormulario(): FormGroup {
    return this.fb.group({
      pressao_arterial: ['', [Validators.required]],
      temperatura: ['', [Validators.required]],
      frequencia_cardiaca: ['', [Validators.required]],
      saturacao_oxigenio: [''],
      classificacao_risco: ['', Validators.required],
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

    try {
      this.salvando = true;
      const dados = this.triagemForm.value;
      
      console.log('Salvando triagem:', dados);
      
      // Simular salvamento por enquanto
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Notificar que a triagem foi finalizada
      this.triagemEventService.notificarTriagemFinalizada();
      
      this.snackBar.open('Triagem finalizada com sucesso!', 'Fechar', {
        duration: 3000
      });
      
      this.router.navigate(['/triagem']);
    } catch (error) {
      console.error('Erro ao salvar triagem:', error);
      this.snackBar.open('Erro ao finalizar triagem', 'Fechar', {
        duration: 5000
      });
    } finally {
      this.salvando = false;
    }
  }

  voltar() {
    this.router.navigate(['/triagem']);
  }
}
