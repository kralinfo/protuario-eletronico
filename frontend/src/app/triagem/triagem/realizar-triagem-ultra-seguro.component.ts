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
import { TriagemService } from '../../services/triagem.service';
import { TriagemEventService } from '../../services/triagem-event.service';
import { firstValueFrom } from 'rxjs';

// Import the interface from the service
import { AtendimentoCompleto } from '../../services/triagem.service';

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
  templateUrl: './realizar-triagem-ultra-seguro.component.html',
  styleUrls: ['./realizar-triagem-ultra-seguro.component.scss']
})
export class RealizarTriagemUltraSeguroComponent implements OnInit {
  atendimentoId: number;
  triagemForm!: FormGroup;
  salvando = false;
  statusSistema = 'Inicializando...';
  componenteCarregado = false;
  nomePaciente = 'Carregando...';
  carregandoPaciente = false;
  statusAtendimento = '';
  podeEditar = true;

  // Propriedades para controle de edição (similar ao módulo médico)
  modoVisualizacao = false;
  triagemRealizada = false;
  edicaoHabilitada = false;
  statusAnterior: string | null = null; // Status antes de iniciar (para reverter ao Voltar sem salvar)
  triagemSalvaComSucesso = false; // Impede reverter o status após salvar com sucesso

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

    // Verificar se está em modo visualização
    const nav = this.router.getCurrentNavigation();
    const state = nav?.extras?.state as any;

    if (state?.modoVisualizacao) {
      this.modoVisualizacao = true;
      this.triagemRealizada = true;
      this.podeEditar = false;
      this.edicaoHabilitada = false;
      console.log('Modo visualização ativado - triagem realizada em modo somente leitura');
    }

    // Captura o status anterior para permitir reversão ao clicar em Voltar sem salvar
    if (state?.statusAnterior) {
      this.statusAnterior = state.statusAnterior;
    }

    // Usar prefill do state, se disponível, para melhorar percepção de carregamento
    if (state?.paciente_nome) {
      this.nomePaciente = state.paciente_nome;
    } else if (state?.prefill?.paciente_nome) {
      this.nomePaciente = state.prefill.paciente_nome;
    }
  }

  ngOnInit(): void {
    this.statusSistema = 'ngOnInit iniciado';
    this.carregarDadosTriagem();
  }

  private criarFormulario(): FormGroup {
    return this.fb.group({
      pressao_arterial: ['', Validators.required],
      temperatura: ['', Validators.required],
      frequencia_cardiaca: ['', Validators.required],
      saturacao_oxigenio: [''],
      classificacao_risco: ['', Validators.required],
      queixa_principal: ['', Validators.required],
      historia_atual: [''],
      observacoes_triagem: [''],
      status_destino: ['encaminhado_para_sala_medica', Validators.required]
    });
  }

  async carregarDadosTriagem() {
    try {
      this.carregandoPaciente = true;
      this.statusSistema = 'Carregando dados do paciente...';

      const dadosTriagem: AtendimentoCompleto = await firstValueFrom(
        this.triagemService.obterDadosTriagem(this.atendimentoId)
      );

      if (dadosTriagem?.paciente_nome) {
        this.nomePaciente = dadosTriagem.paciente_nome;
      }

      if (dadosTriagem?.status) {
        this.statusAtendimento = dadosTriagem.status;
      }

      // Se há dados de triagem já salvos, preencher o formulário
      if (dadosTriagem?.pressao_arterial) {
        // Marcar como triagem realizada se há dados salvos
        this.triagemRealizada = true;

        this.triagemForm.patchValue({
          pressao_arterial: dadosTriagem.pressao_arterial || '',
          temperatura: dadosTriagem.temperatura?.toString() || '',
          frequencia_cardiaca: dadosTriagem.frequencia_cardiaca?.toString() || '',
          saturacao_oxigenio: dadosTriagem.saturacao_oxigenio?.toString() || '',
          classificacao_risco: dadosTriagem.classificacao_risco || '',
          queixa_principal: dadosTriagem.queixa_principal || '',
          historia_atual: dadosTriagem.historia_atual || '',
          observacoes_triagem: dadosTriagem.observacoes_triagem || '',
          status_destino: dadosTriagem.status_destino || 'encaminhado_para_sala_medica'
        });

        // Desabilitar formulário se for triagem realizada e edição não estiver habilitada
        if (this.triagemRealizada && !this.edicaoHabilitada) {
          this.triagemForm.disable();
        }

        this.statusSistema = 'Dados de triagem carregados com sucesso - MODO VISUALIZAÇÃO';
        this.snackBar.open('Triagem realizada carregada em modo visualização', 'Fechar', { duration: 3000 });
      } else {
        // Nova triagem
        this.triagemRealizada = false;
        this.statusSistema = 'Pronto para realizar triagem';
        this.snackBar.open('Triagem pronta para ser realizada', 'Fechar', { duration: 3000 });
      }

    } catch (error) {
      console.error('Erro ao carregar dados de triagem:', error);
      this.statusSistema = 'Erro ao carregar dados';
      this.snackBar.open('Erro ao carregar dados da triagem', 'Fechar', { duration: 5000 });
    } finally {
      this.carregandoPaciente = false;
    }
  }

  async salvarTriagem() {
    console.log('=== INICIANDO SALVAMENTO DE TRIAGEM ===');
    console.log('Form válido?', this.triagemForm.valid);
    console.log('Form value:', this.triagemForm.value);
    console.log('Form errors:', this.triagemForm.errors);

    if (!this.triagemForm.valid) {
      console.log('Formulário inválido - campos com erro:');
      Object.keys(this.triagemForm.controls).forEach(key => {
        const control = this.triagemForm.get(key);
        if (control && control.errors) {
          console.log(`Campo ${key}:`, control.errors);
        }
      });
      this.snackBar.open('Preencha todos os campos obrigatórios', 'Fechar', { duration: 5000 });
      return;
    }

    try {
      this.salvando = true;
      const isEdicao = this.triagemRealizada && this.edicaoHabilitada;
      this.statusSistema = isEdicao ? 'Salvando alterações...' : 'Salvando triagem...';

      const dadosTriagem = this.triagemForm.value;
      console.log('Dados da triagem a serem salvos:', dadosTriagem);

      // Salvar dados da triagem
      console.log('Chamando salvarTriagem no serviço...');
      const resultadoSalvar = await firstValueFrom(
        this.triagemService.salvarTriagem(this.atendimentoId, dadosTriagem)
      );
      console.log('Resultado do salvamento:', resultadoSalvar);

      // Mapear status_destino para o formato correto
      const statusMapping: { [key: string]: string } = {
        'encaminhado_para_sala_medica': 'encaminhado_para_sala_medica',
        'encaminhado para sala médica': 'encaminhado_para_sala_medica',
        'encaminhado_para_ambulatorio': 'encaminhado_para_ambulatorio',
        'encaminhado para ambulatório': 'encaminhado_para_ambulatorio',
        'encaminhado_para_exames': 'encaminhado_para_exames',
        'encaminhado para exames': 'encaminhado_para_exames'
      };

      const statusDestino = statusMapping[dadosTriagem.status_destino] || dadosTriagem.status_destino;
      console.log('Status destino mapeado:', statusDestino);

      // Finalizar triagem sempre (tanto para nova triagem quanto para edição)
      // pois queremos atualizar o status conforme selecionado no dropdown
      console.log('Chamando finalizarTriagem no serviço...');
      const resultadoFinalizar = await firstValueFrom(
        this.triagemService.finalizarTriagem(this.atendimentoId, statusDestino)
      );
      console.log('Resultado da finalização:', resultadoFinalizar);

      this.statusSistema = 'Triagem finalizada com sucesso!';
      this.snackBar.open('Triagem finalizada com sucesso!', 'Fechar', { duration: 5000 });

      // Emitir evento para atualizar outras telas
      this.triagemEventService.notificarTriagemFinalizada();

      // Marcar que a triagem foi salva para não reverter o status no voltar()
      this.triagemSalvaComSucesso = true;

      // Voltar para a tela anterior após finalizar
      this.voltar();

    } catch (error) {
      console.error('Erro ao salvar triagem:', error);
      console.error('Detalhes do erro:', JSON.stringify(error, null, 2));
      this.statusSistema = 'Erro ao salvar triagem';
      this.snackBar.open('Erro ao salvar triagem. Tente novamente.', 'Fechar', { duration: 5000 });
    } finally {
      this.salvando = false;
      console.log('=== FIM DO SALVAMENTO DE TRIAGEM ===');
    }
  }

  voltar() {
    // Se o usuário voltou sem salvar e temos o status anterior, reverte o paciente para a fila original
    if (this.statusAnterior && !this.modoVisualizacao && !this.triagemSalvaComSucesso) {
      this.triagemService.revertStatus(this.atendimentoId, this.statusAnterior).subscribe({
        complete: () => this.router.navigate(['/triagem/dashboard'])
      });
    } else {
      this.router.navigate(['/triagem/dashboard']);
    }
  }

  // Método para alternar entre visualização e edição (similar ao módulo médico)
  alternarEdicao() {
    if (this.triagemRealizada) {
      this.edicaoHabilitada = !this.edicaoHabilitada;

      if (this.edicaoHabilitada) {
        this.triagemForm.enable();
        this.snackBar.open('Edição habilitada', 'Fechar', { duration: 2000 });
      } else {
        this.triagemForm.disable();
        this.snackBar.open('Modo visualização ativado', 'Fechar', { duration: 2000 });
      }
    }
  }

  // Verifica se o formulário deve estar habilitado
  get formularioHabilitado(): boolean {
    if (!this.triagemRealizada) {
      return true; // Triagem nova, sempre habilitada
    }
    return this.edicaoHabilitada; // Triagem realizada, depende se edição foi habilitada
  }

  // Helper para template: verifica se um campo obrigatório está inválido e foi tocado
  isRequiredInvalid(controlName: string): boolean {
    const control = this.triagemForm.get(controlName);
    if (!control) return false;
    return control.invalid && (control.touched || control.dirty);
  }
}
