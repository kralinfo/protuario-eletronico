import { Component, OnInit, ViewEncapsulation } from '@angular/core';
import { CommonModule, registerLocaleData } from '@angular/common';
import localePt from '@angular/common/locales/pt';
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
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule, DateAdapter, MAT_DATE_FORMATS, MAT_DATE_LOCALE } from '@angular/material/core';
import { LOCALE_ID } from '@angular/core';

// Formato personalizado para data brasileira
export const MY_DATE_FORMATS = {
  parse: {
    dateInput: 'DD/MM/YYYY',
  },
  display: {
    dateInput: 'DD/MM/YYYY',
    monthYearLabel: 'MMM YYYY',
    dateA11yLabel: 'LL',
    monthYearA11yLabel: 'MMMM YYYY',
  },
};

// Registrar locale brasileiro
registerLocaleData(localePt);

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
    MatCheckboxModule,
    MatDatepickerModule,
    MatNativeDateModule
  ],
  providers: [
    { provide: MAT_DATE_LOCALE, useValue: 'pt-BR' },
    { provide: LOCALE_ID, useValue: 'pt-BR' },
    { provide: MAT_DATE_FORMATS, useValue: MY_DATE_FORMATS }
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
  statusAnterior: string | null = null; // Status antes de entrar na tela (para reverter ao Voltar)
  modoVisualizacao = false; // Controla se é modo visualizacao
  consultaRealizada = false; // Controla se é uma consulta já realizada
  edicaoHabilitada = false; // Controla se a edição foi habilitada pelo usuário
  podeEditarPorStatus = true; // Controla se o status permite edição (do dashboard)
  origemCard = ''; // De qual card veio a navegação
  nomeMedicoResponsavel = ''; // Nome do médico que realizou o atendimento

  constructor(
    private fb: FormBuilder,
    private route: ActivatedRoute,
    private router: Router,
    private snackBar: MatSnackBar,
    private medicoService: MedicoService,
    private authService: AuthService, // ajuste para injetar AuthService corretamente
    private dateAdapter: DateAdapter<Date>
  ) {
    // Configurar o locale para português brasileiro
    this.dateAdapter.setLocale('pt-BR');

    this.atendimentoId = +this.route.snapshot.params['id'] || 0;
    this.atendimentoForm = this.criarFormulario();

    // Verificar se foi navegado do card de consultas realizadas
    const navigation = this.router.getCurrentNavigation();
    if (navigation?.extras?.state) {
      this.modoVisualizacao = navigation.extras.state['modoVisualizacao'] || false;
      this.consultaRealizada = navigation.extras.state['consultaRealizada'] || false;
      this.podeEditarPorStatus = navigation.extras.state['podeEditarPorStatus'] !== false; // default true
      this.origemCard = navigation.extras.state['origemCard'] || '';

      console.log('📍 Navegação recebida:', {
        modoVisualizacao: this.modoVisualizacao,
        consultaRealizada: this.consultaRealizada,
        podeEditarPorStatus: this.podeEditarPorStatus,
        origemCard: this.origemCard
      });
    }
  }

  ngOnInit() {
    // Ajustar estados de visualização e edição
    if (this.modoVisualizacao || this.consultaRealizada) {
      this.consultaRealizada = true;

      // Se veio do card de consultas, verificar se o status permite edição
      if (this.origemCard === 'consultas') {
        this.podeEditar = this.podeEditarPorStatus;
        this.edicaoHabilitada = this.podeEditarPorStatus;

        if (this.podeEditarPorStatus) {
          console.log('📝 Card consultas: Status permite edição - modo edição habilitado');
        } else {
          console.log('👁️ Card consultas: Status não permite edição - apenas visualização');
        }
      } else {
        // Para outras origens, manter comportamento anterior
        this.podeEditar = false;
        this.edicaoHabilitada = false;
        console.log('👁️ Modo visualização ativado - consulta realizada em modo somente leitura');
      }
    } else {
      this.podeEditar = true;
      this.edicaoHabilitada = true;
      console.log('📝 Modo edição ativado - consulta em andamento');
    }

    // Se for uma consulta realizada, não alterar o status automaticamente
    if (this.consultaRealizada) {
      console.log('🔍 Consulta realizada detectada - carregando em modo visualização');
      this.carregarDadosAtendimento();
      return;
    }

    // Para atendimentos normais, salva o status atual e altera para 'em atendimento médico'
    this.medicoService.getAtendimento(String(this.atendimentoId)).subscribe({
      next: (dados) => {
        this.statusAnterior = dados?.status || null;
        this.medicoService.atualizarStatus(String(this.atendimentoId), 'em_atendimento_medico').subscribe({
          next: () => {
            this.carregarDadosAtendimento();
          },
          error: () => {
            this.snackBar.open('Erro ao atualizar status do atendimento.', 'Fechar', { duration: 5000 });
          }
        });
      },
      error: () => {
        // Fallback: atualiza o status mesmo sem saber o anterior
        this.medicoService.atualizarStatus(String(this.atendimentoId), 'em_atendimento_medico').subscribe({
          next: () => {
            this.carregarDadosAtendimento();
          },
          error: () => {
            this.snackBar.open('Erro ao atualizar status do atendimento.', 'Fechar', { duration: 5000 });
          }
        });
      }
    });
  }

  carregarDadosAtendimento() {
    // Busca os dados do atendimento e preenche o formulário
    this.medicoService.getConsulta(String(this.atendimentoId)).subscribe((data: any) => {
      if (data) {
        console.log('Dados recebidos do backend:', data);

        // Dados da consulta médica (se existir)
        const consultaData = data.consulta || {};

        // Dados da triagem (sempre existem se o atendimento passou pela triagem)
        const triagemData = data.triagem || {};

        console.log('Dados da triagem:', triagemData);
        console.log('Dados da consulta:', consultaData);
        console.log('Retorno agendado (raw):', consultaData.retorno_agendado, typeof consultaData.retorno_agendado);
        console.log('Data retorno (raw):', consultaData.data_retorno, typeof consultaData.data_retorno);

        // Processar retorno_agendado
        const retornoAgendado = consultaData.retorno_agendado === true || consultaData.retorno_agendado === 'true' || consultaData.retorno_agendado === 1;
        console.log('Retorno agendado processado:', retornoAgendado);

        // Processar data_retorno para o MatDatepicker (precisa ser objeto Date)
        let dataRetornoFormatada: Date | null = null;
        if (consultaData.data_retorno) {
          const dataRetorno = new Date(consultaData.data_retorno);
          if (!isNaN(dataRetorno.getTime())) {
            dataRetornoFormatada = dataRetorno;
            console.log('Data retorno formatada:', dataRetornoFormatada);
          }
        }

        // Nome do médico responsável (assinatura)
        this.nomeMedicoResponsavel = consultaData.medico_nome || '';

        this.atendimentoForm.patchValue({
          // Dados da triagem (prioridade para carregar primeiro)
          queixa_principal: triagemData.queixa_principal || consultaData.queixa_principal || '',
          motivo_consulta: consultaData.motivo_consulta || triagemData.motivo || '',
          observacoes: triagemData.observacoes_triagem || triagemData.observacoes || consultaData.observacoes || '',
          exame_fisico: consultaData.exame_fisico || '',
          hipotese_diagnostica: consultaData.hipotese_diagnostica || '',
          conduta_prescricao: consultaData.conduta_prescricao || '',
          pressao_arterial: triagemData.pressao_arterial || '',
          temperatura: triagemData.temperatura || '',
          frequencia_cardiaca: triagemData.frequencia_cardiaca || '',
          saturacao_oxigenio: triagemData.saturacao_oxigenio || '',
          status_destino: triagemData.status_destino || consultaData.status_destino || '',

          // Novos campos detalhados (principalmente da consulta)
          medicamentos_prescritos: consultaData.medicamentos_prescritos || '',
          medicamentos_ambulatorio: consultaData.medicamentos_ambulatorio || '',
          atestado_emitido: consultaData.atestado_emitido === true || consultaData.atestado_emitido === 'true',
          atestado_cid: consultaData.atestado_cid || '',
          atestado_detalhes: consultaData.atestado_detalhes || '',
          atestado_dias: consultaData.atestado_dias || '',
          necessita_observacao: consultaData.necessita_observacao === true || consultaData.necessita_observacao === 'true',
          tempo_observacao_horas: consultaData.tempo_observacao_horas || '',
          motivo_observacao: consultaData.motivo_observacao || '',
          exames_solicitados: consultaData.exames_solicitados || '',
          orientacoes_paciente: consultaData.orientacoes_paciente || '',
          retorno_agendado: retornoAgendado,
          data_retorno: dataRetornoFormatada,
          observacoes_retorno: consultaData.observacoes_retorno || '',
          procedimentos_realizados: consultaData.procedimentos_realizados || '',
          detalhes_destino: consultaData.detalhes_destino || '',
          alergias_identificadas: consultaData.alergias_identificadas || '',
          historico_familiar_relevante: consultaData.historico_familiar_relevante || ''
        });
        this.atendimentoForm.updateValueAndValidity();

        // Debug: verificar valores finais no formulário
        console.log('Valores finais no formulário:');
        console.log('- retorno_agendado:', this.atendimentoForm.get('retorno_agendado')?.value);
        console.log('- data_retorno:', this.atendimentoForm.get('data_retorno')?.value);

        // Forçar detecção de mudança para campos condicionais
        setTimeout(() => {
          console.log('Verificação após timeout:');
          console.log('- retorno_agendado após timeout:', this.atendimentoForm.get('retorno_agendado')?.value);
          console.log('- data_retorno após timeout:', this.atendimentoForm.get('data_retorno')?.value);
        }, 100);

        // Nome do paciente vem dos dados da triagem
        this.nomePaciente = triagemData.paciente_nome || 'Paciente';

        // Se for consulta realizada, aplicar lógica de edição baseada no status
        if (this.consultaRealizada) {
          if (this.origemCard === 'consultas' && this.podeEditarPorStatus) {
            // Do card consultas com status que permite edição
            this.podeEditar = true;
            this.edicaoHabilitada = true;
            this.labelBotao = 'Salvar Modificações';
            this.atendimentoForm.enable();
            console.log('📝 Card consultas: Formulário habilitado para edição baseado no status');
          } else {
            // Outros casos: apenas visualização
            this.podeEditar = false;
            this.edicaoHabilitada = false;
            this.labelBotao = this.podeEditarPorStatus ? 'Consulta Finalizada' : 'Apenas Visualização';
            this.atendimentoForm.disable();
            console.log('�️ Formulário desabilitado - modo visualização');
          }
        } else {
          // Se já existe atendimento médico preenchido, habilita edição e altera label do botão
          if (consultaData.exame_fisico || consultaData.hipotese_diagnostica || consultaData.conduta_prescricao || consultaData.motivo_consulta) {
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
      motivo_consulta: [''],
      exame_fisico: [''],
      hipotese_diagnostica: ['', Validators.required],
      conduta_prescricao: [''],
      observacoes: [''],
      pressao_arterial: [''],
      temperatura: [''],
      frequencia_cardiaca: [''],
      saturacao_oxigenio: [''],
      status_destino: ['encaminhado_para_ambulatorio', Validators.required],

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

    const dadosTriagem = {
      pressao_arterial: this.atendimentoForm.get('pressao_arterial')?.value,
      temperatura: this.atendimentoForm.get('temperatura')?.value,
      frequencia_cardiaca: this.atendimentoForm.get('frequencia_cardiaca')?.value,
      saturacao_oxigenio: this.atendimentoForm.get('saturacao_oxigenio')?.value,
      queixa_principal: this.atendimentoForm.get('queixa_principal')?.value,
      observacoes_triagem: this.atendimentoForm.get('observacoes')?.value
      // NÃO INCLUIR classificacao_risco para preservar o valor da triagem
    };

    // Salvar triagem antes de salvar consulta
    this.medicoService.salvarTriagem(String(this.atendimentoId), dadosTriagem).subscribe({
      next: () => {
        this.medicoService.getConsulta(String(this.atendimentoId)).subscribe({
          next: (consulta) => {
            if (consulta && consulta.id) {
              // Atualiza consulta existente
              this.medicoService.atualizarConsulta(consulta.id, dadosMedico).subscribe({
                next: () => {
                  this.snackBar.open('Atendimento salvo com sucesso!', 'Fechar', { duration: 3000 });
                  this.router.navigate(['/medico']);
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
                  this.router.navigate(['/medico']);
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
            this.snackBar.open('Erro ao buscar consulta.', 'Fechar', { duration: 5000 });
            this.salvando = false;
          }
        });
      },
      error: () => {
        this.snackBar.open('Erro ao salvar dados da triagem.', 'Fechar', { duration: 5000 });
        this.salvando = false;
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

  alternarEdicao() {
    this.edicaoHabilitada = !this.edicaoHabilitada;

    if (this.edicaoHabilitada) {
      // Habilitar formulário para edição
      this.atendimentoForm.enable();
      this.snackBar.open('Modo edição ativado', 'Fechar', { duration: 2000 });
      console.log('Modo edição ativado');
    } else {
      // Desabilitar formulário e voltar ao modo visualização
      this.atendimentoForm.disable();
      this.snackBar.open('Modo visualização ativado', 'Fechar', { duration: 2000 });
      console.log('Modo visualização ativado');
    }
  }

  salvarTriagem() {
    if (this.salvando) return; // Evita múltiplas chamadas

    // Coletar apenas os campos da triagem original
    const triagemData = {
      queixa_principal: this.atendimentoForm.get('queixa_principal')?.value || '',
      observacoes_triagem: this.atendimentoForm.get('observacoes')?.value || '',
      pressao_arterial: this.atendimentoForm.get('pressao_arterial')?.value || '',
      temperatura: this.atendimentoForm.get('temperatura')?.value || null,
      frequencia_cardiaca: this.atendimentoForm.get('frequencia_cardiaca')?.value || null,
      saturacao_oxigenio: this.atendimentoForm.get('saturacao_oxigenio')?.value || null
    };

    console.log('🩺 Salvando dados da triagem:', triagemData);
    this.salvando = true;

    this.medicoService.salvarTriagem(String(this.atendimentoId), triagemData).subscribe({
      next: (response) => {
        console.log('✅ Triagem salva com sucesso:', response);
        this.snackBar.open('Alterações da triagem salvas!', 'Fechar', { duration: 2500 });
      },
      error: (error) => {
        console.error('❌ Erro ao salvar triagem:', error);
        this.snackBar.open('Erro ao salvar triagem: ' + (error.error?.error || error.message), 'Fechar', { duration: 5000 });
      },
      complete: () => {
        this.salvando = false;
      }
    });
  }

  voltar() {
    // Se abriu um atendimento ativo (não é visualização) e temos o status anterior,
    // reverte o status para que o paciente volte à posição correta na fila
    if (!this.consultaRealizada && this.statusAnterior && this.statusAnterior !== 'em_atendimento_medico') {
      this.medicoService.atualizarStatus(String(this.atendimentoId), this.statusAnterior).subscribe({
        complete: () => this._navegarVoltar()
      });
    } else {
      this._navegarVoltar();
    }
  }

  private _navegarVoltar() {
    if (this.origemCard === 'dashboard') {
      this.router.navigate(['/dashboard']);
    } else if (this.origemCard === 'consultas') {
      this.router.navigate(['/medico/consultas']);
    } else {
      this.router.navigate(['/medico']);
    }
  }
}
