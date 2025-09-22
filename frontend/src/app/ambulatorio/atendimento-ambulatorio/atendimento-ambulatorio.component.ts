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
import { AmbulatorioService } from '../ambulatorio.service';
import { AuthService } from '../../auth/auth.service';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatCheckboxModule } from '@angular/material/checkbox';

@Component({
  selector: 'app-atendimento-ambulatorio',
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
  templateUrl: './atendimento-ambulatorio.component.html',
  styleUrls: ['./atendimento-ambulatorio.component.scss'],
  encapsulation: ViewEncapsulation.None
})
export class AtendimentoAmbulatorioComponent implements OnInit {
  podeEditar = false;
  labelBotao = 'Finalizar Atendimento';
  atendimentoId: number;
  atendimentoForm!: FormGroup;
  salvando = false;
  nomePaciente = 'Carregando...';
  statusAtendimento = '';
  modoVisualizacao = true; // Sempre inicia em modo visualização
  dadosOriginais: any = null;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private ambulatorioService: AmbulatorioService,
    private authService: AuthService,
    private formBuilder: FormBuilder,
    private snackBar: MatSnackBar
  ) {
    this.atendimentoId = Number(this.route.snapshot.paramMap.get('id'));
  }

  ngOnInit() {
    this.inicializarFormulario();
    this.carregarDados();
  }

  inicializarFormulario() {
    this.atendimentoForm = this.formBuilder.group({
      // Dados Vitais
      pressao_arterial: [''],
      frequencia_cardiaca: [''],
      temperatura: [''],
      saturacao_oxigenio: [''],
      frequencia_respiratoria: [''],
      peso: [''],
      altura: [''],
      glicemia: [''],

      // Avaliação Ambulatorial
      queixa_principal: [''],
      historia_doenca_atual: [''],
      exame_fisico: [''],
      hipotese_diagnostica: [''],
      plano_terapeutico: [''],
      orientacoes_gerais: [''],
      observacoes: [''],
      
      // Encaminhamentos
      status_destino: [''],
      observacoes_destino: [''],
      
      // Medicamentos prescritos
      medicamentos_prescritos: ['']
    });

    // Desabilitar todos os campos inicialmente (modo visualização)
    this.atendimentoForm.disable();
  }

  carregarDados() {
    console.log('🔄 Carregando dados do atendimento:', this.atendimentoId);
    
    // Primeiro, alterar o status para "em atendimento ambulatorial"
    this.ambulatorioService.atualizarStatus(String(this.atendimentoId), 'em atendimento ambulatorial').subscribe({
      next: () => {
        console.log('✅ Status alterado para: em atendimento ambulatorial');
        
        // Agora carregar os dados do atendimento
        this.ambulatorioService.obterAtendimento(this.atendimentoId).subscribe({
          next: (dados: any) => {
            console.log('✅ Dados carregados:', dados);
            this.dadosOriginais = { ...dados };
            this.nomePaciente = dados.nome_paciente || 'Paciente não identificado';
            this.statusAtendimento = dados.status || '';
            
            // Preencher o formulário com todos os dados disponíveis (incluindo do atendimento médico)
            this.atendimentoForm.patchValue({
              // Dados Vitais (podem vir do atendimento médico)
              pressao_arterial: dados.pressao_arterial || '',
              frequencia_cardiaca: dados.frequencia_cardiaca || '',
              temperatura: dados.temperatura || '',
              saturacao_oxigenio: dados.saturacao_oxigenio || '',
              frequencia_respiratoria: dados.frequencia_respiratoria || '',
              peso: dados.peso || '',
              altura: dados.altura || '',
              glicemia: dados.glicemia || '',

              // Avaliação (do atendimento médico, se existir)
              queixa_principal: dados.queixa_principal || '',
              historia_doenca_atual: dados.historia_doenca_atual || '',
              exame_fisico: dados.exame_fisico || '',
              hipotese_diagnostica: dados.hipotese_diagnostica || '',
              plano_terapeutico: dados.plano_terapeutico || '',
              orientacoes_gerais: dados.orientacoes_gerais || '',
              observacoes: dados.observacoes || '',
              
              // Campos específicos do ambulatório
              status_destino: dados.status_destino || '',
              observacoes_destino: dados.observacoes_destino || '',
              medicamentos_prescritos: dados.medicamentos_prescritos || ''
            });
          },
          error: (error: any) => {
            console.error('❌ Erro ao carregar dados:', error);
            this.snackBar.open('Erro ao carregar dados do atendimento', 'Fechar', { duration: 3000 });
          }
        });
      },
      error: (error: any) => {
        console.error('❌ Erro ao alterar status:', error);
        this.snackBar.open('Erro ao iniciar atendimento', 'Fechar', { duration: 3000 });
      }
    });
  }

  habilitarEdicao() {
    this.modoVisualizacao = false;
    this.podeEditar = true;
    this.atendimentoForm.enable();
    this.labelBotao = 'Salvar Atendimento';
  }

  cancelarEdicao() {
    this.modoVisualizacao = true;
    this.podeEditar = false;
    this.atendimentoForm.disable();
    this.labelBotao = 'Finalizar Atendimento';
    
    // Restaurar dados originais
    if (this.dadosOriginais) {
      this.atendimentoForm.patchValue(this.dadosOriginais);
    }
  }

  salvar() {
    if (!this.modoVisualizacao && this.atendimentoForm.valid) {
      this.salvando = true;
      
      const dadosAtendimento = {
        ...this.atendimentoForm.value,
        usuario_ambulatorio: this.authService.user?.nome || 'Usuário Ambulatório'
      };

      console.log('💾 Salvando atendimento ambulatorial:', dadosAtendimento);

      this.ambulatorioService.salvarAtendimento(this.atendimentoId, dadosAtendimento).subscribe({
        next: (resultado: any) => {
          console.log('✅ Atendimento salvo:', resultado);
          this.salvando = false;
          this.snackBar.open('Atendimento ambulatorial salvo com sucesso!', 'Fechar', { duration: 3000 });
          
          // Voltar para o modo visualização
          this.cancelarEdicao();
          this.dadosOriginais = { ...this.atendimentoForm.value };
        },
        error: (error: any) => {
          console.error('❌ Erro ao salvar:', error);
          this.salvando = false;
          this.snackBar.open('Erro ao salvar atendimento', 'Fechar', { duration: 3000 });
        }
      });
    } else {
      // Finalizar atendimento - navegar de volta para o dashboard
      this.finalizarAtendimento();
    }
  }

  finalizarAtendimento() {
    console.log('🏁 Finalizando atendimento ambulatorial');
    
    // Alterar status para um status final (ex: "alta ambulatorial")
    this.ambulatorioService.atualizarStatus(String(this.atendimentoId), 'alta ambulatorial').subscribe({
      next: () => {
        console.log('✅ Atendimento finalizado');
        this.snackBar.open('Atendimento finalizado com sucesso!', 'Fechar', { duration: 3000 });
        this.voltarParaDashboard();
      },
      error: (error: any) => {
        console.error('❌ Erro ao finalizar:', error);
        this.snackBar.open('Erro ao finalizar atendimento', 'Fechar', { duration: 3000 });
      }
    });
  }

  cancelarAtendimento() {
    console.log('❌ Cancelando atendimento ambulatorial');
    
    // Restaurar status anterior
    this.ambulatorioService.atualizarStatus(String(this.atendimentoId), 'encaminhado para ambulatório').subscribe({
      next: () => {
        console.log('✅ Status restaurado');
        this.snackBar.open('Atendimento cancelado', 'Fechar', { duration: 3000 });
        this.voltarParaDashboard();
      },
      error: (error: any) => {
        console.error('❌ Erro ao cancelar:', error);
        this.snackBar.open('Erro ao cancelar atendimento', 'Fechar', { duration: 3000 });
      }
    });
  }

  voltarParaDashboard() {
    this.router.navigate(['/ambulatorio']);
  }
}