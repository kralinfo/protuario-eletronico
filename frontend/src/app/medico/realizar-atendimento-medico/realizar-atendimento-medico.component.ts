import { Component, OnInit, ViewEncapsulation } from '@angular/core';
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
import { MedicoService } from '../medico.service';
import { MatExpansionModule } from '@angular/material/expansion';

@Component({
  selector: 'app-realizar-atendimento-medico',
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
    MatDividerModule,
    MatExpansionModule
  ],
  templateUrl: './realizar-atendimento-medico.component.html',
  styleUrls: ['./realizar-atendimento-medico.component.scss']
  ,encapsulation: ViewEncapsulation.None
})
export class RealizarAtendimentoMedicoComponent implements OnInit {
  atendimentoId: number;
  atendimentoForm!: FormGroup;
  salvando = false;
  nomePaciente = 'Carregando...';
  statusAtendimento = '';
  podeEditar = true;

  constructor(
    private fb: FormBuilder,
    private route: ActivatedRoute,
    private router: Router,
    private snackBar: MatSnackBar,
    private medicoService: MedicoService
  ) {
    this.atendimentoId = +this.route.snapshot.params['id'] || 0;
    this.atendimentoForm = this.criarFormulario();
  }

  ngOnInit() {
    // Busca os dados do atendimento e preenche o formulário
    this.medicoService.getConsulta(String(this.atendimentoId)).subscribe((data: any) => {
      if (data) {
        this.atendimentoForm.patchValue({
          queixa_principal: data.queixa_principal || '',
          motivo_consulta: data.motivo || '',
          historia_clinica: data.historia_atual || '',
          observacoes: data.observacoes || data.observacoes_triagem || '',
          exame_fisico: data.exame_fisico || '',
          hipotese_diagnostica: data.hipotese_diagnostica || '',
          conduta_prescricao: data.conduta_prescricao || '',
          pressao_arterial: data.pressao_arterial || '',
          frequencia_cardiaca: data.frequencia_cardiaca || '',
          saturacao_oxigenio: data.saturacao_oxigenio || '',
          status_destino: data.status_destino || ''
        });
        this.nomePaciente = data.paciente_nome || 'Paciente';
      }
    });
  }

  criarFormulario(): FormGroup {
    return this.fb.group({
      queixa_principal: [''],
      historia_clinica: [''], // será preenchido com histórico atual
      motivo_consulta: ['', Validators.required],
      exame_fisico: [''],
      hipotese_diagnostica: [''],
      conduta_prescricao: [''],
      observacoes: [''],
      pressao_arterial: [''],
      temperatura: [''],
      frequencia_cardiaca: [''],
      saturacao_oxigenio: [''],
      status_destino: ['', Validators.required]
    });
  }

  salvarAtendimento() {
    if (this.atendimentoForm.invalid) return;
    this.salvando = true;
    // Chamar service para salvar atendimento
  this.medicoService.salvarConsulta(String(this.atendimentoId), this.atendimentoForm.value).subscribe({
      next: () => {
        this.snackBar.open('Atendimento salvo com sucesso!', 'Fechar', { duration: 3000 });
        this.router.navigate(['/medico/fila']);
      },
      error: () => {
        this.snackBar.open('Erro ao salvar atendimento.', 'Fechar', { duration: 5000 });
      },
      complete: () => {
        this.salvando = false;
      }
    });
  }

  voltar() {
    this.router.navigate(['/medico/fila']);
  }
}
