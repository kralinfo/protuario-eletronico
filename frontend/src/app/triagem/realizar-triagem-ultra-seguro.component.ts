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
          Realizar Triagem - Ultra Seguro
        </h1>
      </div>

      <!-- Status do Sistema -->
      <mat-card class="status-card">
        <mat-card-content>
          <h3>Status: {{statusSistema}}</h3>
          <p>Atendimento ID: {{atendimentoId}}</p>
          <p>Componente carregado: {{componenteCarregado ? 'SIM' : 'NÃO'}}</p>
        </mat-card-content>
      </mat-card>

      <!-- Formulário Ultra Simples -->
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
              {{salvando ? 'Salvando...' : 'Salvar Triagem'}}
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

  constructor(
    private fb: FormBuilder,
    private route: ActivatedRoute,
    private router: Router,
    private snackBar: MatSnackBar
  ) {
    console.log('=== CONSTRUCTOR ULTRA SEGURO ===');
    this.atendimentoId = +this.route.snapshot.params['id'] || 0;
    this.statusSistema = 'Constructor executado';
    this.triagemForm = this.criarFormulario();
    console.log('Atendimento ID:', this.atendimentoId);
  }

  ngOnInit() {
    console.log('=== NgOnInit ULTRA SEGURO ===');
    // NÃO fazer NENHUMA chamada de API automaticamente
    this.statusSistema = 'Componente carregado com sucesso';
    this.componenteCarregado = true;
    console.log('Componente pronto - SEM chamadas automáticas de API');
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

  salvarTriagem() {
    if (!this.triagemForm.valid) {
      this.snackBar.open('Por favor, preencha todos os campos obrigatórios', 'Fechar', {
        duration: 5000
      });
      return;
    }

    this.salvando = true;
    this.statusSistema = 'Salvando dados...';
    
    console.log('=== SALVANDO TRIAGEM ===');
    console.log('Dados do formulário:', this.triagemForm.value);
    
    // Simular salvamento sem chamada de API real por enquanto
    setTimeout(() => {
      this.snackBar.open('Triagem salva com sucesso! (modo ultra seguro)', 'Fechar', {
        duration: 3000
      });
      this.salvando = false;
      this.statusSistema = 'Triagem salva com sucesso';
      
      setTimeout(() => {
        this.router.navigate(['/triagem']);
      }, 1000);
    }, 2000);
  }

  voltar() {
    console.log('Voltando para lista de triagem...');
    this.router.navigate(['/triagem']);
  }
}
