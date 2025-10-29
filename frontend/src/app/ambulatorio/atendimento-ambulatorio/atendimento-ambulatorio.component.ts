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
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
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
  MatCheckboxModule,
  MatSnackBarModule
  ],
  templateUrl: './atendimento-ambulatorio.component.html',
  styleUrl: './atendimento-ambulatorio.component.scss'
})
export class AtendimentoAmbulatorioComponent implements OnInit {
  bloqueiaAlternancia: boolean = false;
  private dadosTriagemOriginais: any = {};
  // Atualiza o status do atendimento conforme o destino selecionado
  onDestinoChange(valor: string) {
    if (!this.atendimentoId) return;
    // Garante que o form control seja atualizado (o mat-select já faz isso,
    // mas definimos explicitamente para ambientes que não sincronizem imediatamente).
    try {
      this.atendimentoForm.get('status_destino')?.setValue(valor);
    } catch (e) {
      console.warn('Falha ao setar status_destino no form:', e);
    }

    // Mensagem informativa quando o usuário escolher reencaminhar para atendimento médico
    if (valor === 'retornar_atendimento_medico') {
      this.snackBar.open('Ao salvar, este paciente será reencaminhado para atendimento médico.', 'OK', { duration: 5000 });
    }
  }

  private mapDestinoParaStatus(valor: string): string | null {
    if (!valor) return null;
    if (valor === 'alta_ambulatorial') return 'atendimento_concluido';
    // Preservar o status simbólico 'retornar_atendimento_medico' (usado em outros lugares do sistema)
    if (valor === 'retornar_atendimento_medico') return 'retornar_atendimento_medico';
    if (valor === 'em_observacao') return 'em_observacao';
    return null;
  }
  opcoesDestino: { label: string, value: string }[] = [
    { label: 'Alta Ambulatorial', value: 'alta_ambulatorial' },
    { label: 'Reencaminhar para Atendimento Médico', value: 'retornar_atendimento_medico' },
    { label: 'Em Observação', value: 'em_observacao' }
  ];

  get opcoesDestinoFiltradas() {
    // Se necessita_observacao está marcado, mostra todas as opções
    const todas = this.opcoesDestino || [];
    const precisaObservacao = this.atendimentoForm?.get('necessita_observacao')?.value;
    if (precisaObservacao) {
      return todas;
    }

    // Caso contrário, mostra todas as opções exceto 'em_observacao'.
    // Isso garante que a opção 'retornar_atendimento_medico' continue disponível
    // mesmo quando a observação não foi marcada.
    return todas.filter(op => op.value !== 'em_observacao');
  }
  atendimentoForm!: FormGroup;
  atendimentoId: number;
  nomePaciente: string = '';
  modoEdicao: boolean = true; // Padrão em edição

  constructor(
    private fb: FormBuilder,
    private route: ActivatedRoute,
    private router: Router,
    private ambulatorioService: AmbulatorioService,
    private authService: AuthService,
    private snackBar: MatSnackBar
  ) {
    this.atendimentoId = +this.route.snapshot.params['id'] || 0;
    this.atendimentoForm = this.criarFormulario();
    // Se vier ?visualizar=1, inicia em modo visualização, mas permite alternar para edição
    this.route.queryParams.subscribe(params => {
      if (params['visualizar'] === '1' || params['visualizar'] === 1) {
        this.modoEdicao = false;
        this.bloqueiaAlternancia = true;
      } else {
        this.modoEdicao = true;
        this.bloqueiaAlternancia = false;
      }
    });
  }

  ngOnInit() {
    if (this.atendimentoId) {
      this.carregarDadosAtendimento();
      // Não altera status automaticamente ao abrir. O status só será alterado ao salvar ou mudar destino.
    }
  }

  carregarDadosAtendimento() {
    // Busca os dados do atendimento usando o mesmo endpoint do médico
    this.ambulatorioService.getAtendimento(this.atendimentoId).subscribe((data: any) => {
      if (data) {
        // ...existing code...
        const consultaData = data.consulta || {};
        const triagemData = data.triagem || {};
        // ...existing code...
        this.dadosTriagemOriginais = {
          queixa_principal: triagemData.queixa_principal || '',
          pressao_arterial: triagemData.pressao_arterial || '',
          temperatura: triagemData.temperatura || '',
          saturacao_oxigenio: triagemData.saturacao_oxigenio || '',
          frequencia_cardiaca: triagemData.frequencia_cardiaca || '',
          classificacao_risco: triagemData.classificacao_risco || ''
        };
        this.atendimentoForm.patchValue({
          // Triagem
          queixa_principal: triagemData.queixa_principal || '',
          pressao_arterial: triagemData.pressao_arterial || '',
          temperatura: triagemData.temperatura || '',
          saturacao_oxigenio: triagemData.saturacao_oxigenio || '',
          frequencia_cardiaca: triagemData.frequencia_cardiaca || '',

          // Consulta médica
          plano_terapeutico: consultaData.conduta_prescricao || consultaData.plano_terapeutico || '',
          medicamentos_prescritos: consultaData.medicamentos_prescritos || '',
          medicamentos_ambulatorio: consultaData.medicamentos_ambulatorio || '',
          hipotese_diagnostica: consultaData.hipotese_diagnostica || '',
          necessita_observacao: consultaData.necessita_observacao || false,
          tempo_observacao_horas: consultaData.tempo_observacao_horas || '',
          motivo_observacao: consultaData.motivo_observacao || '',
          observacoes: consultaData.observacoes || triagemData.observacoes || '',
          exames_solicitados: consultaData.exames_solicitados || '',
          procedimentos_realizados: consultaData.procedimentos_realizados || '',
          orientacoes_gerais: consultaData.orientacoes_gerais || consultaData.orientacoes_paciente || '',
          status_destino: consultaData.status_destino || triagemData.status_destino || '',
          observacoes_destino: consultaData.observacoes_destino || '',
          alergias_identificadas: consultaData.alergias_identificadas || triagemData.alergias || '',
          historico_familiar_relevante: consultaData.historico_familiar_relevante || '',
          detalhes_destino: consultaData.detalhes_destino || '',
          orientacoes_paciente: consultaData.orientacoes_paciente || '',
        });
        this.atendimentoForm.updateValueAndValidity();
        this.nomePaciente = triagemData.paciente_nome || 'Paciente';
      }
    });
  }

  criarFormulario(): FormGroup {
    return this.fb.group({
      // Dados da Triagem
      queixa_principal: [''],
      pressao_arterial: [''],
      temperatura: [''],
      saturacao_oxigenio: [''],
      frequencia_cardiaca: [''],

      // Conduta e Medicamentos
      plano_terapeutico: [''],
      medicamentos_prescritos: [''],
      medicamentos_ambulatorio: [''],

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
      alergias_identificadas: [''],
      historico_familiar_relevante: [''],
      detalhes_destino: [''],
      orientacoes_paciente: ['']

      // (removido duplicidade dos campos do formGroup)
    });
  }

  alternarEdicao() {
    this.modoEdicao = !this.modoEdicao;
  }

  salvarTriagem() {
    // Não permite salvar se estiver em modo visualização
    if (!this.modoEdicao) return;
    if (!this.atendimentoId) return;
    const form = this.atendimentoForm.value;
    const payload: any = {};
    // ...existing code...
  }

  voltar() {
    this.router.navigate(['/ambulatorio']);
  }

  salvar() {
    // Não permite salvar se estiver em modo visualização
    if (!this.modoEdicao) return;
    if (this.atendimentoForm.valid && this.atendimentoId) {
      const dadosAtendimento = this.atendimentoForm.value;
      // Mapeamento input -> coluna do banco (apenas campos editáveis na tela)
      const mapeamento: { [key: string]: string } = {
        plano_terapeutico: 'conduta_prescricao',
        medicamentos_prescritos: 'medicamentos_prescritos',
        medicamentos_ambulatorio: 'medicamentos_ambulatorio',
        necessita_observacao: 'necessita_observacao',
        tempo_observacao_horas: 'tempo_observacao_horas',
        motivo_observacao: 'motivo_observacao',
        observacoes: 'observacoes',
        exames_solicitados: 'exames_solicitados',
        procedimentos_realizados: 'procedimentos_realizados',
        orientacoes_gerais: 'orientacoes_paciente',
        status_destino: 'status_destino',
        observacoes_destino: 'observacoes_destino',
        alergias_identificadas: 'alergias_identificadas',
        historico_familiar_relevante: 'historico_familiar_relevante',
        detalhes_destino: 'detalhes_destino',
        orientacoes_paciente: 'orientacoes_paciente'
      };
      const payload: any = { id: this.atendimentoId };
      Object.keys(mapeamento).forEach(input => {
        const coluna = mapeamento[input];
        const valor = dadosAtendimento[input];
        if (
          valor !== undefined &&
          valor !== null &&
          !(typeof valor === 'string' && valor.trim() === '')
        ) {
          // Se for orientacoes_gerais e orientacoes_paciente já estiver preenchido, não sobrescreve
          if (input === 'orientacoes_gerais' && dadosAtendimento['orientacoes_paciente']) return;
          payload[coluna] = valor;
        }
      });
      this.ambulatorioService.salvarAtendimento(this.atendimentoId, payload).subscribe({
        next: () => {
          // Após salvar os dados do atendimento, atualiza o status apenas se o destino foi enviado
          const destinoSelecionado = this.atendimentoForm.get('status_destino')?.value;
          const novoStatus = this.mapDestinoParaStatus(destinoSelecionado);

          if (novoStatus) {
            this.ambulatorioService.atualizarStatusAtendimento(this.atendimentoId, novoStatus).subscribe({
              next: () => {
                this.snackBar.open('Atendimento ambulatorial salvo com sucesso!', 'Fechar', { duration: 3000 });
                this.modoEdicao = false;
                this.router.navigate(['/ambulatorio']);
              },
              error: (err: any) => {
                console.error('Erro ao atualizar status após salvar:', err);
                // Mesmo se falhar atualizar o status, informar usuário e navegar
                this.snackBar.open('Atendimento salvo, mas falha ao atualizar status.', 'Fechar', { duration: 5000 });
                this.modoEdicao = false;
                this.router.navigate(['/ambulatorio']);
              }
            });
          } else {
            // Sem mudança de status mapeada; apenas navega
            this.snackBar.open('Atendimento ambulatorial salvo com sucesso!', 'Fechar', { duration: 3000 });
            this.modoEdicao = false;
            this.router.navigate(['/ambulatorio']);
          }
        },
        error: (error: any) => {
          this.snackBar.open('Erro ao salvar atendimento ambulatorial.', 'Fechar', { duration: 5000 });
          console.error('Erro ao salvar atendimento ambulatorial:', error);
        }
      });
    }
  }
}
