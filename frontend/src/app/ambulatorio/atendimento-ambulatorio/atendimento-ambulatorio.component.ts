import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatIconModule } from '@angular/material/icon';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { AmbulatorioService } from '../ambulatorio.service';
import { AuthService } from '../../auth/auth.service';

@Component({
  selector: 'app-atendimento-ambulatorio',
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatCardModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatExpansionModule,
    MatIconModule,
    MatCheckboxModule
  ],
  templateUrl: './atendimento-ambulatorio.component.html',
  styleUrl: './atendimento-ambulatorio.component.scss'
})
export class AtendimentoAmbulatorioComponent implements OnInit {
  atendimentoForm!: FormGroup;
  atendimentoId: number;
  nomePaciente: string = '';
  modoEdicao: boolean = true; // Padrão em edição

  constructor(
    private fb: FormBuilder,
    private route: ActivatedRoute,
    private router: Router,
    private ambulatorioService: AmbulatorioService,
    private authService: AuthService
  ) {
    this.atendimentoId = +this.route.snapshot.params['id'] || 0;
    this.atendimentoForm = this.criarFormulario();
  }

  ngOnInit() {
    if (this.atendimentoId) {
      this.carregarDadosAtendimento();
    }
  }

  carregarDadosAtendimento() {
    // Busca os dados do atendimento usando o mesmo endpoint do médico
    this.ambulatorioService.getAtendimento(this.atendimentoId).subscribe((data: any) => {
      if (data) {
        console.log('Dados recebidos do backend (ambulatório):', data);

        // Dados da consulta médica (se existir)
        const consultaData = data.consulta || {};

        // Dados da triagem (sempre existem se o atendimento passou pela triagem)
        const triagemData = data.triagem || {};

        console.log('Dados da triagem:', triagemData);
        console.log('Dados da consulta:', consultaData);

        this.atendimentoForm.patchValue({
          // Dados da triagem (prioridade para carregar primeiro)
          queixa_principal: triagemData.queixa_principal || consultaData.queixa_principal || '',
          historia_doenca_atual: triagemData.historia_atual || consultaData.historia_atual || '',
          pressao_arterial: triagemData.pressao_arterial || '',
          temperatura: triagemData.temperatura || '',
          frequencia_cardiaca: triagemData.frequencia_cardiaca || '',
          saturacao_oxigenio: triagemData.saturacao_oxigenio || '',
          frequencia_respiratoria: triagemData.frequencia_respiratoria || '',
          peso: triagemData.peso || '',
          altura: triagemData.altura || '',
          glicemia: triagemData.glicemia || '',
          exame_fisico: consultaData.exame_fisico || '',
          hipotese_diagnostica: consultaData.hipotese_diagnostica || '',
          diagnostico_principal: consultaData.diagnostico_principal || '',
          
          // Conduta e Medicamentos
          plano_terapeutico: consultaData.plano_terapeutico || consultaData.conduta_prescricao || '',
          medicamentos_prescritos: consultaData.medicamentos_prescritos || '',
          
          // Observação Médica
          necessita_observacao: consultaData.necessita_observacao || false,
          tempo_observacao_horas: consultaData.tempo_observacao_horas || '',
          motivo_observacao: consultaData.motivo_observacao || '',
          observacoes: triagemData.observacoes_triagem || triagemData.observacoes || consultaData.observacoes || '',
          
          // Exames e Procedimentos
          exames_solicitados: consultaData.exames_solicitados || '',
          procedimentos_realizados: consultaData.procedimentos_realizados || '',
          
          // Informações Complementares
          orientacoes_gerais: consultaData.orientacoes_gerais || consultaData.orientacoes_paciente || '',
          status_destino: triagemData.status_destino || consultaData.status_destino || '',
          observacoes_destino: consultaData.observacoes_destino || '',
          
          // Campos específicos do ambulatório
          medicamentos_ambulatorio: consultaData.medicamentos_ambulatorio || '',
          alergias_identificadas: consultaData.alergias_identificadas || triagemData.alergias || '',
          historico_familiar_relevante: consultaData.historico_familiar_relevante || '',
          detalhes_destino: consultaData.detalhes_destino || '',
          orientacoes_paciente: consultaData.orientacoes_paciente || ''
        });

        this.atendimentoForm.updateValueAndValidity();

        // Nome do paciente vem dos dados da triagem
        this.nomePaciente = triagemData.paciente_nome || 'Paciente';
      }
    });
  }

  criarFormulario(): FormGroup {
    return this.fb.group({
      // Dados da Triagem
      queixa_principal: [''],
      historia_doenca_atual: [''],
      pressao_arterial: [''],
      temperatura: [''],
      frequencia_cardiaca: [''],
      saturacao_oxigenio: [''],
      frequencia_respiratoria: [''],
      peso: [''],
      altura: [''],
      glicemia: [''],
      exame_fisico: [''],
      hipotese_diagnostica: [''],
      diagnostico_principal: [''],
      
      // Conduta e Medicamentos
      plano_terapeutico: [''],
      medicamentos_prescritos: [''],
      
      // Observação Médica
      necessita_observacao: [false],
      tempo_observacao_horas: [''],
      motivo_observacao: [''],
      observacoes: [''],
      
      // Exames e Procedimentos
      exames_solicitados: [''],
      procedimentos_realizados: [''],
      
      // Informações Complementares
      orientacoes_gerais: [''],
      status_destino: [''],
      observacoes_destino: [''],
      
      // Campos específicos do ambulatório
      medicamentos_ambulatorio: [''],
      alergias_identificadas: [''],
      historico_familiar_relevante: [''],
      detalhes_destino: [''],
      orientacoes_paciente: ['']
    });
  }

  alternarEdicao() {
    this.modoEdicao = !this.modoEdicao;
  }

  voltar() {
    this.router.navigate(['/ambulatorio']);
  }

  salvar() {
    if (this.atendimentoForm.valid && this.atendimentoId) {
      const dadosAtendimento = this.atendimentoForm.value;
      dadosAtendimento.id = this.atendimentoId;
      
      this.ambulatorioService.salvarAtendimento(this.atendimentoId, dadosAtendimento).subscribe({
        next: () => {
          console.log('Atendimento ambulatorial salvo com sucesso');
          this.modoEdicao = false;
        },
        error: (error: any) => {
          console.error('Erro ao salvar atendimento ambulatorial:', error);
        }
      });
    }
  }
}