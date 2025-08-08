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
import { ActivatedRoute, Router } from '@angular/router';

@Component({
  selector: 'app-realizar-triagem-minimal',
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
    MatProgressSpinnerModule
  ],
  template: `
    <div class="triagem-container">
      <div class="header">
        <button mat-icon-button (click)="voltar()">
          <mat-icon>arrow_back</mat-icon>
        </button>
        <h1>
          <mat-icon>medical_services</mat-icon>
          Realizar Triagem - Modo Seguro
        </h1>
      </div>

      <!-- Informações básicas -->
      <mat-card class="patient-info-card">
        <mat-card-header>
          <mat-card-title>Atendimento ID: {{atendimentoId}}</mat-card-title>
          <mat-card-subtitle>Modo minimal para evitar loops</mat-card-subtitle>
        </mat-card-header>
      </mat-card>

      <!-- Formulário simples -->
      <form [formGroup]="triagemForm" (ngSubmit)="salvarTriagem()">
        <mat-card class="form-card">
          <mat-card-header>
            <mat-card-title>Dados da Triagem</mat-card-title>
          </mat-card-header>

          <mat-card-content>
            <mat-form-field>
              <mat-label>Pressão Arterial</mat-label>
              <input matInput formControlName="pressao_arterial" placeholder="120/80">
            </mat-form-field>

            <mat-form-field>
              <mat-label>Temperatura (°C)</mat-label>
              <input matInput type="number" formControlName="temperatura" step="0.1">
            </mat-form-field>

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
              <mat-label>Queixa Principal</mat-label>
              <textarea matInput formControlName="queixa_principal" rows="3"></textarea>
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

    .patient-info-card, .form-card {
      margin-bottom: 20px;
    }

    mat-form-field {
      width: 100%;
      margin-bottom: 15px;
    }
  `]
})
export class RealizarTriagemMinimalComponent implements OnInit {
  atendimentoId: number;
  triagemForm!: FormGroup;
  salvando = false;

  constructor(
    private fb: FormBuilder,
    private route: ActivatedRoute,
    private router: Router,
    private snackBar: MatSnackBar
  ) {
    console.log('=== COMPONENTE MINIMAL INICIALIZADO ===');
    this.atendimentoId = +this.route.snapshot.params['id'];
    console.log('Atendimento ID:', this.atendimentoId);
    this.triagemForm = this.criarFormulario();
  }

  ngOnInit() {
    console.log('NgOnInit - Componente MINIMAL carregado');
    // NÃO fazer nenhuma chamada de API aqui para evitar loops
  }

  private criarFormulario(): FormGroup {
    return this.fb.group({
      pressao_arterial: ['', [Validators.required]],
      temperatura: ['', [Validators.required]],
      classificacao_risco: ['', Validators.required],
      queixa_principal: ['', Validators.required]
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
    console.log('Salvando dados:', this.triagemForm.value);

    // Simular salvamento (sem chamada de API por enquanto)
    setTimeout(() => {
      this.snackBar.open('Triagem salva com sucesso! (modo seguro)', 'Fechar', {
        duration: 3000
      });
      this.salvando = false;
      this.router.navigate(['/triagem']);
    }, 1000);
  }

  voltar() {
    this.router.navigate(['/triagem']);
  }
}
