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
import { AuthService } from '../../auth/auth.service';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatCheckboxModule } from '@angular/material/checkbox';

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
    MatExpansionModule,
    MatCheckboxModule
  ],
  templateUrl: './realizar-atendimento-medico.component.html',
  styleUrls: ['./realizar-atendimento-medico.component.scss']
  ,encapsulation: ViewEncapsulation.None
})
export class RealizarAtendimentoMedicoComponent implements OnInit {
  podeEditar = false;
  labelBotao = 'Finalizar Atendimento';
  atendimentoId: number;
  atendimentoForm!: FormGroup;
  salvando = false;
  nomePaciente = 'Carregando...';
  statusAtendimento = '';
  modoVisualizacao = false; // Controla se é modo visualização
  consultaRealizada = false; // Controla se é uma consulta já realizada
  edicaoHabilitada = false; // Controla se a edição foi habilitada pelo usuário

  constructor(
    private fb: FormBuilder,
    private route: ActivatedRoute,
    private router: Router,
    private snackBar: MatSnackBar,
    private medicoService: MedicoService,
  private authService: AuthService // ajuste para injetar AuthService corretamente
  ) {
    this.atendimentoId = +this.route.snapshot.params['id'] || 0;
    this.atendimentoForm = this.criarFormulario();

    // Verificar se foi navegado do card de consultas realizadas
    const navigation = this.router.getCurrentNavigation();
    if (navigation?.extras?.state) {
      this.modoVisualizacao = navigation.extras.state['modoVisualizacao'] || false;
      this.consultaRealizada = navigation.extras.state['consultaRealizada'] || false;
    }
  }

  ngOnInit() {
    // Se for uma consulta realizada, não alterar o status automaticamente
    if (this.consultaRealizada) {
      console.log('🔍 Consulta realizada detectada - carregando em modo visualização');
      this.carregarDadosAtendimento();
      return;
    }

    // Para atendimentos normais, altera status para 'em atendimento médico' ao abrir a tela
    this.medicoService.atualizarStatus(String(this.atendimentoId), 'em atendimento médico').subscribe({
      next: () => {
        this.carregarDadosAtendimento();
      },
      error: () => {
        this.snackBar.open('Erro ao atualizar status do atendimento.', 'Fechar', { duration: 5000 });
      }
    });
  }

  carregarDadosAtendimento() {
    // Busca os dados do atendimento e preenche o formulário
    this.medicoService.getConsulta(String(this.atendimentoId)).subscribe((data: any) => {
      if (data) {
        this.atendimentoForm.patchValue({
          queixa_principal: data.queixa_principal || '',
          motivo_consulta: data.motivo_consulta || data.motivo || '',
          historia_clinica: data.historia_atual || '',
          observacoes: data.observacoes || data.observacoes_triagem || '',
          exame_fisico: data.exame_fisico || '',
          hipotese_diagnostica: data.hipotese_diagnostica || '',
          conduta_prescricao: data.conduta_prescricao || '',
          pressao_arterial: data.pressao_arterial || '',
          temperatura: data.temperatura || '',
          frequencia_cardiaca: data.frequencia_cardiaca || '',
          saturacao_oxigenio: data.saturacao_oxigenio || '',
          status_destino: data.status_destino || '',

          // Novos campos detalhados
          medicamentos_prescritos: data.medicamentos_prescritos || '',
          medicamentos_ambulatorio: data.medicamentos_ambulatorio || '',
          atestado_emitido: data.atestado_emitido || false,
          atestado_cid: data.atestado_cid || '',
          atestado_detalhes: data.atestado_detalhes || '',
          atestado_dias: data.atestado_dias || '',
          necessita_observacao: data.necessita_observacao || false,
          tempo_observacao_horas: data.tempo_observacao_horas || '',
          motivo_observacao: data.motivo_observacao || '',
          exames_solicitados: data.exames_solicitados || '',
          orientacoes_paciente: data.orientacoes_paciente || '',
          retorno_agendado: data.retorno_agendado || false,
          data_retorno: data.data_retorno || '',
          observacoes_retorno: data.observacoes_retorno || '',
          procedimentos_realizados: data.procedimentos_realizados || '',
          detalhes_destino: data.detalhes_destino || '',
          alergias_identificadas: data.alergias_identificadas || '',
          historico_familiar_relevante: data.historico_familiar_relevante || ''
        });
        this.atendimentoForm.updateValueAndValidity();
        this.nomePaciente = data.paciente_nome || 'Paciente';

        // Se for consulta realizada, desabilitar edição inicialmente
        if (this.consultaRealizada) {
          this.podeEditar = false;
          this.labelBotao = 'Consulta Finalizada';
          this.atendimentoForm.disable(); // Desabilita todo o formulário
          console.log('🔒 Formulário desabilitado - modo visualização');
        } else {
          // Se já existe atendimento médico preenchido, habilita edição e altera label do botão
          if (data.exame_fisico || data.hipotese_diagnostica || data.conduta_prescricao || data.motivo_consulta) {
            this.podeEditar = true;
            this.labelBotao = 'Salvar Modificações';
          } else {
            this.podeEditar = true;
            this.labelBotao = 'Finalizar Atendimento';
          }
        }
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
      status_destino: ['', Validators.required],

      // Novos campos detalhados
      medicamentos_prescritos: [''],
      medicamentos_ambulatorio: [''],
      atestado_emitido: [false],
      atestado_cid: [''],
      atestado_detalhes: [''],
      atestado_dias: [''],
      necessita_observacao: [false],
      tempo_observacao_horas: [''],
      motivo_observacao: [''],
      exames_solicitados: [''],
      orientacoes_paciente: [''],
      retorno_agendado: [false],
      data_retorno: [''],
      observacoes_retorno: [''],
      procedimentos_realizados: [''],
      detalhes_destino: [''],
      alergias_identificadas: [''],
      historico_familiar_relevante: ['']
    });
  }

  salvarAtendimento() {
    // Impedir salvamento se estiver em modo de visualização e edição não foi habilitada
    if (this.consultaRealizada && !this.edicaoHabilitada) {
      this.snackBar.open('Esta consulta já foi finalizada e não pode ser editada.', 'Fechar', { duration: 3000 });
      return;
    }

    if (this.atendimentoForm.invalid) return;
    this.salvando = true;
    const medicoId = this.authService.user?.id || null;
    const motivoConsulta = this.atendimentoForm.get('motivo_consulta')?.value || '';
    const dadosMedico = {
      motivo_consulta: motivoConsulta,
      exame_fisico: this.atendimentoForm.get('exame_fisico')?.value,
      hipotese_diagnostica: this.atendimentoForm.get('hipotese_diagnostica')?.value,
      conduta_prescricao: this.atendimentoForm.get('conduta_prescricao')?.value,
      status_destino: this.atendimentoForm.get('status_destino')?.value,
      medico_id: medicoId,
      atendimento_id: this.atendimentoId,

      // Novos campos detalhados
      medicamentos_prescritos: this.atendimentoForm.get('medicamentos_prescritos')?.value,
      medicamentos_ambulatorio: this.atendimentoForm.get('medicamentos_ambulatorio')?.value,
      atestado_emitido: this.atendimentoForm.get('atestado_emitido')?.value,
      atestado_cid: this.atendimentoForm.get('atestado_cid')?.value,
      atestado_detalhes: this.atendimentoForm.get('atestado_detalhes')?.value,
      atestado_dias: this.atendimentoForm.get('atestado_dias')?.value,
      necessita_observacao: this.atendimentoForm.get('necessita_observacao')?.value,
      tempo_observacao_horas: this.atendimentoForm.get('tempo_observacao_horas')?.value,
      motivo_observacao: this.atendimentoForm.get('motivo_observacao')?.value,
      exames_solicitados: this.atendimentoForm.get('exames_solicitados')?.value,
      orientacoes_paciente: this.atendimentoForm.get('orientacoes_paciente')?.value,
      retorno_agendado: this.atendimentoForm.get('retorno_agendado')?.value,
      data_retorno: this.atendimentoForm.get('data_retorno')?.value,
      observacoes_retorno: this.atendimentoForm.get('observacoes_retorno')?.value,
      procedimentos_realizados: this.atendimentoForm.get('procedimentos_realizados')?.value,
      detalhes_destino: this.atendimentoForm.get('detalhes_destino')?.value,
      alergias_identificadas: this.atendimentoForm.get('alergias_identificadas')?.value,
      historico_familiar_relevante: this.atendimentoForm.get('historico_familiar_relevante')?.value,
      data_prescricao: new Date()
    };
    // Verifica se já existe consulta médica para este atendimento
    this.medicoService.getConsulta(String(this.atendimentoId)).subscribe({
      next: (consulta) => {
        if (consulta && consulta.id) {
          // Atualiza consulta existente
          this.medicoService.atualizarConsulta(consulta.id, dadosMedico).subscribe({
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
        } else {
          // Cria nova consulta
          this.medicoService.salvarConsulta(String(this.atendimentoId), dadosMedico).subscribe({
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
      },
      error: () => {
        // Se não encontrar consulta, cria nova
        this.medicoService.salvarConsulta(String(this.atendimentoId), dadosMedico).subscribe({
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
    });
  }

  habilitarEdicao() {
    this.edicaoHabilitada = true;
    this.podeEditar = true;
    this.labelBotao = 'Salvar Modificações';
    this.atendimentoForm.enable(); // Habilita todo o formulário
    console.log('✏️ Edição habilitada para consulta realizada');
    this.snackBar.open('Edição habilitada. Você pode modificar os campos.', 'Fechar', { duration: 3000 });
  }

  desabilitarEdicao() {
    this.edicaoHabilitada = false;
    this.podeEditar = false;
    this.labelBotao = 'Consulta Finalizada';
    this.atendimentoForm.disable(); // Desabilita todo o formulário
    console.log('🔒 Edição desabilitada para consulta realizada');
  }

  salvarTriagem() {
      // Coletar apenas os campos da triagem
      const triagemData = {
        queixa_principal: this.atendimentoForm.get('queixa_principal')?.value,
        historia_atual: this.atendimentoForm.get('historia_clinica')?.value,
        observacoes_triagem: this.atendimentoForm.get('observacoes')?.value,
        pressao_arterial: this.atendimentoForm.get('pressao_arterial')?.value,
        temperatura: this.atendimentoForm.get('temperatura')?.value,
        frequencia_cardiaca: this.atendimentoForm.get('frequencia_cardiaca')?.value,
        saturacao_oxigenio: this.atendimentoForm.get('saturacao_oxigenio')?.value
      };
      this.salvando = true;
      this.medicoService.salvarTriagem(String(this.atendimentoId), triagemData).subscribe({
        next: () => {
          this.snackBar.open('Alterações da triagem salvas!', 'Fechar', { duration: 2500 });
        },
        error: () => {
          this.snackBar.open('Erro ao salvar triagem.', 'Fechar', { duration: 5000 });
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
