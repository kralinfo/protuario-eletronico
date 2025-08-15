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
      this.podeEditar = false;
      console.log('Modo visualização ativado - edição desabilitada');
    }

    // Usar prefill do state, se disponível, para melhorar percepção de carregamento
    if (state?.paciente_nome) {
      this.nomePaciente = state.paciente_nome;
    }
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
    if (!this.podeEditar) {
      this.snackBar.open('Esta triagem não pode ser editada pois já foi finalizada', 'Fechar', {
        duration: 5000
      });
      return;
    }

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

        // Verificar status e definir se pode editar (só se não estiver em modo visualização)
        this.statusAtendimento = dadosTriagem.status || '';
        
        // Só pode editar se não estiver em modo visualização E o status for "em_triagem"
        const statusPermiteEdicao = this.statusAtendimento === 'em_triagem' || 
                                   this.statusAtendimento === 'em triagem' || 
                                   this.statusAtendimento === '2 - Em triagem';
        
        this.podeEditar = this.podeEditar && statusPermiteEdicao;

        console.log('Status do atendimento:', this.statusAtendimento);
        console.log('Status permite edição:', statusPermiteEdicao);
        console.log('Pode editar (final):', this.podeEditar);

        // Se não pode editar, desabilitar o formulário e mostrar mensagem apropriada
        if (!this.podeEditar) {
          this.triagemForm.disable();
          
          const nav = this.router.getCurrentNavigation();
          const state = nav?.extras?.state as any;
          
          if (state?.modoVisualizacao) {
            this.snackBar.open('Visualizando detalhes da triagem em modo somente leitura', 'Fechar', { duration: 3000 });
          } else {
            this.snackBar.open('Esta triagem não pode ser editada pois já foi finalizada', 'Fechar', { duration: 5000 });
          }
        }

  // Carregar nome do paciente (sobrescreve prefill se vier do backend)
  this.nomePaciente = dadosTriagem.paciente_nome || this.nomePaciente || 'Nome não encontrado';

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
