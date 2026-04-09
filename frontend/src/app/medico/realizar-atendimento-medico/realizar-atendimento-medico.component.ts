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
import { Cid10SearchComponent } from '../pec-components/cid10-search.component';
import { EncaminhamentosPanelComponent } from '../pec-components/encaminhamentos-panel.component';
import { ExamesPanelComponent } from '../pec-components/exames-panel.component';

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
    MatNativeDateModule,
    Cid10SearchComponent,
    EncaminhamentosPanelComponent,
    ExamesPanelComponent
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
  pacienteId: number | null = null; // ID do paciente para encaminhamentos/exames

  // CID-10
  mostrandoBuscaCid = false;
  diagnosticoPrincipal = '';
  cidPrincipal = '';
  cidSecundarios: string[] = [];

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
        this.medicoService.atualizarStatus(String(this.atendimentoId), 'em atendimento médico').subscribe({
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
        this.medicoService.atualizarStatus(String(this.atendimentoId), 'em atendimento médico').subscribe({
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

        // ID do paciente (para encaminhamentos/exames)
        this.pacienteId = data.triagem?.paciente_id || data.paciente_id || data.atendimento?.paciente_id || null;
        console.log('[RealizarAtendimento] pacienteId extraído:', this.pacienteId);

        // Diagnostic principal e CID
        this.diagnosticoPrincipal = consultaData.diagnostico_principal || consultaData.hipotese_diagnostica || '';
        this.cidPrincipal = consultaData.cid_principal || '';
        const cidSec = consultaData.cid_secundarios || '';
        this.cidSecundarios = cidSec ? cidSec.split(',').map((c: string) => c.trim()).filter((c: string) => c) : [];

        // Sincronizar diagnosticoPrincipal com o formControl hipotese_diagnostica
        if (this.diagnosticoPrincipal) {
          this.atendimentoForm.patchValue({ hipotese_diagnostica: this.diagnosticoPrincipal });
        }

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
      status_destino: ['encaminhado para ambulatório', Validators.required],

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

  // CID-10 handlers
  abrirBuscaCid(): void {
    this.mostrandoBuscaCid = true;
  }

  onCidSelecionado(cid: { code: string; description: string }): void {
    this.cidPrincipal = cid.code;
    if (!this.diagnosticoPrincipal) {
      this.diagnosticoPrincipal = cid.description;
    }
  }

  removerCidSecundario(code: string): void {
    this.cidSecundarios = this.cidSecundarios.filter(c => c !== code);
  }

  salvarAtendimento() {
    // Impedir salvamento se estiver em modo de visualização e edição não foi habilitada
    if (this.consultaRealizada && !this.edicaoHabilitada) {
      this.snackBar.open('Esta consulta já foi finalizada e não pode ser editada.', 'Fechar', { duration: 3000 });
      return;
    }

    // Sincronizar diagnosticoPrincipal com o formControl
    const hipoteseValue = this.atendimentoForm.get('hipotese_diagnostica')?.value;
    if (hipoteseValue) {
      this.diagnosticoPrincipal = hipoteseValue;
    }

    // Validar e mostrar feedback se form inválido
    if (this.atendimentoForm.invalid) {
      this.atendimentoForm.markAllAsTouched();
      const camposInvalidos: string[] = [];
      const controls = this.atendimentoForm.controls;
      for (const key of Object.keys(controls)) {
        if (controls[key].invalid) {
          camposInvalidos.push(key);
        }
      }
      console.warn('Formulário inválido. Campos com erro:', camposInvalidos);
      this.snackBar.open(`Preencha os campos obrigatórios: ${camposInvalidos.join(', ')}`, 'Fechar', { duration: 5000 });
      return;
    }

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
      diagnostico_principal: this.atendimentoForm.get('hipotese_diagnostica')?.value || this.diagnosticoPrincipal,
      cid_principal: this.cidPrincipal,
      cid_secundarios: this.cidSecundarios.join(','),
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

  /**
   * Gera uma janela de impressão com os dados do atendimento formatados.
   * Coleta todos os campos do formulário e dados auxiliares para
   * montar um layout limpo e profissional para impressão.
   */
  imprimirAtendimento(): void {
    const form = this.atendimentoForm.getRawValue();
    const dataAtual = new Date().toLocaleDateString('pt-BR');
    const horaAtual = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

    /** Formata a data de retorno, se existir */
    const formatarDataRetorno = (valor: any): string => {
      if (!valor) return '';
      const data = new Date(valor);
      return isNaN(data.getTime()) ? '' : data.toLocaleDateString('pt-BR');
    };

    /** Gera uma seção HTML somente se o valor estiver preenchido */
    const secao = (titulo: string, valor: string | null | undefined): string => {
      if (!valor || !valor.trim()) return '';
      return `
        <div class="secao">
          <h3>${titulo}</h3>
          <p>${valor.replace(/\n/g, '<br>')}</p>
        </div>`;
    };

    /** Gera uma linha de campo chave/valor somente se preenchido */
    const campo = (label: string, valor: string | number | null | undefined): string => {
      if (valor === null || valor === undefined || valor === '') return '';
      return `<tr><td class="label">${label}</td><td>${valor}</td></tr>`;
    };

    // Montar seções condicionais
    let sinaisVitaisHtml = '';
    const sinais = [
      campo('Pressão Arterial', form.pressao_arterial),
      campo('Temperatura', form.temperatura ? `${form.temperatura} °C` : ''),
      campo('Frequência Cardíaca', form.frequencia_cardiaca ? `${form.frequencia_cardiaca} bpm` : ''),
      campo('Saturação O₂', form.saturacao_oxigenio ? `${form.saturacao_oxigenio}%` : '')
    ].filter(s => s).join('');
    if (sinais) {
      sinaisVitaisHtml = `
        <div class="secao">
          <h3>Sinais Vitais</h3>
          <table>${sinais}</table>
        </div>`;
    }

    let atestadoHtml = '';
    if (form.atestado_emitido) {
      const linhasAtestado = [
        campo('CID', form.atestado_cid),
        campo('Dias de Afastamento', form.atestado_dias),
        campo('Detalhes', form.atestado_detalhes)
      ].filter(s => s).join('');
      atestadoHtml = `
        <div class="secao">
          <h3>Atestado Médico</h3>
          <table>${linhasAtestado}</table>
        </div>`;
    }

    let observacaoHtml = '';
    if (form.necessita_observacao) {
      const linhasObs = [
        campo('Tempo de Observação', form.tempo_observacao_horas ? `${form.tempo_observacao_horas} horas` : ''),
        campo('Motivo', form.motivo_observacao)
      ].filter(s => s).join('');
      observacaoHtml = `
        <div class="secao">
          <h3>Observação Médica</h3>
          <table>${linhasObs}</table>
        </div>`;
    }

    let retornoHtml = '';
    if (form.retorno_agendado) {
      const linhasRetorno = [
        campo('Data do Retorno', formatarDataRetorno(form.data_retorno)),
        campo('Observações', form.observacoes_retorno)
      ].filter(s => s).join('');
      retornoHtml = `
        <div class="secao">
          <h3>Retorno Agendado</h3>
          <table>${linhasRetorno}</table>
        </div>`;
    }

    const cidInfo = this.cidPrincipal ? ` (CID: ${this.cidPrincipal})` : '';
    const cidSecundariosInfo = this.cidSecundarios.length > 0 ? `<br><small>CIDs Secundários: ${this.cidSecundarios.join(', ')}</small>` : '';

    /** Mapa de status para rótulo legível */
    const statusLabels: Record<string, string> = {
      'encaminhado para ambulatório': 'Ambulatório',
      'encaminhado para exames': 'Exames',
      'atendimento_concluido': 'Alta'
    };
    const statusDestino = statusLabels[form.status_destino] || form.status_destino || '';

    const htmlConteudo = `
      <!DOCTYPE html>
      <html lang="pt-BR">
      <head>
        <meta charset="UTF-8">
        <title>Atendimento Médico - ${this.nomePaciente}</title>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            font-size: 12px;
            color: #333;
            padding: 20px 30px;
            line-height: 1.5;
          }
          .header {
            text-align: center;
            border-bottom: 2px solid #1976d2;
            padding-bottom: 12px;
            margin-bottom: 16px;
          }
          .header h1 {
            font-size: 18px;
            color: #1976d2;
            margin-bottom: 4px;
          }
          .header p {
            font-size: 11px;
            color: #666;
          }
          .paciente-info {
            background: #f0f7ff;
            border: 1px solid #bbdefb;
            border-radius: 6px;
            padding: 10px 14px;
            margin-bottom: 16px;
            display: flex;
            justify-content: space-between;
            align-items: center;
          }
          .paciente-info .nome {
            font-size: 16px;
            font-weight: 700;
            color: #1565c0;
          }
          .paciente-info .data {
            font-size: 11px;
            color: #666;
            text-align: right;
          }
          .secao {
            margin-bottom: 14px;
            page-break-inside: avoid;
          }
          .secao h3 {
            font-size: 13px;
            color: #1976d2;
            border-bottom: 1px solid #e0e0e0;
            padding-bottom: 3px;
            margin-bottom: 6px;
            text-transform: uppercase;
            letter-spacing: 0.5px;
          }
          .secao p {
            font-size: 12px;
            white-space: pre-wrap;
          }
          table {
            width: 100%;
            border-collapse: collapse;
          }
          table td {
            padding: 3px 8px;
            vertical-align: top;
            font-size: 12px;
          }
          table td.label {
            font-weight: 600;
            color: #555;
            width: 200px;
            white-space: nowrap;
          }
          .encaminhamento {
            margin-top: 16px;
            padding: 10px 14px;
            background: #e8f5e9;
            border: 1px solid #a5d6a7;
            border-radius: 6px;
            text-align: center;
            font-weight: 600;
            color: #2e7d32;
            font-size: 13px;
          }
          .assinatura {
            margin-top: 40px;
            text-align: center;
            border-top: 1px solid #ccc;
            padding-top: 8px;
          }
          .assinatura .nome-medico {
            font-weight: 700;
            font-size: 14px;
          }
          .assinatura .rodape {
            font-size: 10px;
            color: #999;
            margin-top: 6px;
          }
          @media print {
            body { padding: 10px 20px; }
            .no-print { display: none !important; }
          }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>Prontuário Eletrônico</h1>
          <p>Ficha de Atendimento Médico</p>
        </div>

        <div class="paciente-info">
          <div>
            <span class="nome">${this.nomePaciente}</span>
          </div>
          <div class="data">
            Data: ${dataAtual}<br>
            Hora: ${horaAtual}
          </div>
        </div>

        ${secao('Motivo da Consulta', form.motivo_consulta)}
        ${secao('Queixa Principal', form.queixa_principal)}
        ${sinaisVitaisHtml}
        ${secao('Hipótese Diagnóstica', (form.hipotese_diagnostica || '') + cidInfo + cidSecundariosInfo)}
        ${secao('Exame Físico', form.exame_fisico)}
        ${secao('Conduta / Prescrição', form.conduta_prescricao)}
        ${secao('Medicamentos Prescritos', form.medicamentos_prescritos)}
        ${secao('Medicamentos para Ambulatório', form.medicamentos_ambulatorio)}
        ${secao('Procedimentos Realizados', form.procedimentos_realizados)}
        ${atestadoHtml}
        ${observacaoHtml}
        ${secao('Orientações ao Paciente', form.orientacoes_paciente)}
        ${retornoHtml}
        ${secao('Alergias Identificadas', form.alergias_identificadas)}
        ${secao('Histórico Familiar Relevante', form.historico_familiar_relevante)}
        ${secao('Detalhes do Destino', form.detalhes_destino)}
        ${secao('Observações', form.observacoes)}

        ${statusDestino ? `<div class="encaminhamento">Encaminhamento: ${statusDestino}</div>` : ''}

        <div class="assinatura">
          <p class="nome-medico">${this.nomeMedicoResponsavel || this.authService.user?.nome || 'Médico Responsável'}</p>
          <p class="rodape">Documento gerado eletronicamente em ${dataAtual} às ${horaAtual}</p>
        </div>

        <script>window.onload = function() { window.print(); }</script>
      </body>
      </html>`;

    const janelaImpressao = window.open('', '_blank', 'width=800,height=900');
    if (janelaImpressao) {
      janelaImpressao.document.write(htmlConteudo);
      janelaImpressao.document.close();
    } else {
      this.snackBar.open('Não foi possível abrir a janela de impressão. Verifique o bloqueador de pop-ups.', 'Fechar', { duration: 5000 });
    }
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
    if (!this.consultaRealizada && this.statusAnterior && this.statusAnterior !== 'em atendimento médico') {
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
