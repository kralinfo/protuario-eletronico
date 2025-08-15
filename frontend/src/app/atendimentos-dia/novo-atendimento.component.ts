
import { Component, OnDestroy } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../environments/environment';
import { MatDialog } from '@angular/material/dialog';
import { FeedbackDialogComponent } from '../shared/feedback-dialog/feedback-dialog.component';
import { ConfirmDialogComponent } from '../shared/confirm-dialog/confirm-dialog.component';
import { Router, ActivatedRoute } from '@angular/router';
import { Subject } from 'rxjs';
import { debounceTime, takeUntil } from 'rxjs/operators';
import * as jsPDF from 'jspdf';
import { AtendimentoService } from '../services/atendimento.service';
// Import necessário para o modal
// import { PacientesFormComponent } from '../pacientes/pacientes-form.component';

@Component({
  selector: 'app-novo-atendimento',
  templateUrl: './novo-atendimento.component.html',
  standalone: false,
})
export class NovoAtendimentoComponent {
  motivosPossiveis: string[] = [
    'Consulta médica',
    'Retorno',
    'Avaliação',
    'Emergência',
    'Triagem',
    'Vacinação',
    'Orientação',
    'Encaminhamento',
    'Sutura',
    'Curativo',
    'Retirada de pontos',
    'Administração de medicação',
    'Outro'
  ];
  goBack() {
    window.history.back();
  }
  filtroPaciente: string = '';
  pacientesFiltrados: any[] = [];
  pacienteSelecionado: any = null;
  motivo: string = '';
  observacoes: string = '';
  mensagem: string = '';
  acompanhante: string = '';
  procedencia: string = '';
  status: string = 'encaminhado para triagem';
  motivo_interrupcao: string = '';
  exibirCadastroPaciente: boolean = false;
  horario: string = '';
  
  // Propriedades para edição
  isEdicao: boolean = false;
  atendimentoId: number | null = null;
  atendimentoOriginal: any = null;
  
  apiUrl = environment.apiUrl + '/pacientes';
  private filtroSubject = new Subject<string>();
  private destroy$ = new Subject<void>();

  constructor(
    private http: HttpClient, 
    private dialog: MatDialog, 
    private router: Router,
    private route: ActivatedRoute,
    private atendimentoService: AtendimentoService
  ) {
    this.filtroSubject.pipe(
      debounceTime(400),
      takeUntil(this.destroy$)
    ).subscribe(filtro => {
      this.filtrarPacientes(filtro);
    });
  }

  ngOnInit() {
    // Inicializa lista vazia
    this.pacientesFiltrados = [];
    
    // Verifica se é edição baseado nos parâmetros da rota
    this.route.params.subscribe(params => {
      if (params['id']) {
        this.isEdicao = true;
        this.atendimentoId = parseInt(params['id']);
        this.carregarAtendimento();
      } else {
        // Modo criação - inicializa o horário atual
        const now = new Date();
        const pad = (n: number) => n.toString().padStart(2, '0');
        this.horario = `${pad(now.getHours())}:${pad(now.getMinutes())}`;
      }
    });
  }

  carregarAtendimento() {
    if (this.atendimentoId) {
      // Buscar dados do atendimento pela API
      this.atendimentoService.buscarAtendimentoPorId(this.atendimentoId).subscribe({
        next: (atendimento: any) => {
          this.atendimentoOriginal = atendimento;
          this.preencherFormulario(atendimento);
        },
        error: (error) => {
          console.error('Erro ao carregar atendimento:', error);
          this.mensagem = 'Erro ao carregar dados do atendimento.';
        }
      });
    }
  }

  preencherFormulario(atendimento: any) {
    this.motivo = atendimento.motivo || '';
    this.observacoes = atendimento.observacao || atendimento.observacoes || '';
    this.acompanhante = atendimento.acompanhante || '';
    this.procedencia = atendimento.procedimento || atendimento.procedencia || '';
    this.status = atendimento.status || 'encaminhado para triagem';
    this.motivo_interrupcao = atendimento.motivo_interrupcao || '';
    
    // Para edição, precisamos simular a seleção do paciente
    this.pacienteSelecionado = {
      id: atendimento.paciente_id,
      nome: atendimento.paciente_nome
    };
    this.filtroPaciente = atendimento.paciente_nome || '';
    
    // Converter data/hora do atendimento para o formato do input
    if (atendimento.data_hora_atendimento) {
      const data = new Date(atendimento.data_hora_atendimento);
      const pad = (n: number) => n.toString().padStart(2, '0');
      this.horario = `${pad(data.getHours())}:${pad(data.getMinutes())}`;
    }
  }

  abrirCadastroPaciente() {
    this.exibirCadastroPaciente = true;
  }

  fecharCadastroPaciente() {
    this.exibirCadastroPaciente = false;
  }

  onPacienteCadastrado(paciente: any) {
    this.exibirCadastroPaciente = false;
    if (paciente) {
      // Garante que o nome esteja presente e não vazio
      if ((!paciente.nome || paciente.nome.trim() === '') && paciente.NOME) {
        paciente.nome = paciente.NOME;
      }
      // Se ainda estiver vazio, tenta buscar por outros campos comuns
      if (!paciente.nome || paciente.nome.trim() === '') {
        paciente.nome = paciente.nome || paciente.nome_completo || paciente.nomePaciente || '';
      }
      this.selecionarPaciente(paciente);
    }
  }

  filtrarPacientes(filtro: string) {
    filtro = filtro?.trim();
    if (filtro && filtro.length > 1) {
      this.http.get<any>(`${environment.apiUrl}/pacientes/search?nome=${encodeURIComponent(filtro)}`)
        .subscribe(
          res => {
            this.pacientesFiltrados = res.data || [];
          },
          () => {
            this.pacientesFiltrados = [];
          }
        );
    } else {
      this.pacientesFiltrados = [];
    }
  }

  selecionarPaciente(paciente: any) {
    this.pacienteSelecionado = paciente;
    this.filtroPaciente = paciente.nome;
    this.pacientesFiltrados = [];
    // Verifica se já existe atendimento para o paciente hoje ao selecionar
    const hoje = new Date().toISOString().slice(0, 10);
    this.mensagem = '';
    this.http.get<any>(`${environment.apiUrl}/atendimentos?pacienteId=${paciente.id}&data=${hoje}`)
      .subscribe(
        res => {
          if (res && res.length > 0) {
            const dialogRef = this.dialog.open(ConfirmDialogComponent, {
              data: {
                title: 'Atenção',
                message: 'Já existe atendimento registrado para este paciente na data de hoje. Deseja criar outro atendimento mesmo assim?'
              }
            });
            dialogRef.afterClosed().subscribe(result => {
              if (!result) {
                // Usuário não quer prosseguir, limpa seleção
                this.pacienteSelecionado = null;
                this.filtroPaciente = '';
              }
            });
          }
        },
        () => {
          // Em caso de erro, não exibe mensagem
        }
      );
  }

  registrar() {
    if (!this.pacienteSelecionado || !this.motivo) {
      this.mensagem = 'Selecione um paciente e informe o motivo.';
      return;
    }
    if (this.status === 'interrompido' && !this.motivo_interrupcao) {
      this.mensagem = 'Informe o motivo da interrupção.';
      return;
    }
    const atendimento = {
      pacienteId: this.pacienteSelecionado.id,
      motivo: this.motivo,
      observacoes: this.observacoes,
      acompanhante: this.acompanhante,
      procedencia: this.procedencia,
      status: this.status,
      motivo_interrupcao: this.status === 'interrompido' ? this.motivo_interrupcao : undefined
    };
    
    // Determinar a mensagem e ação baseada no modo
    const isEdit = this.isEdicao;
    const confirmMessage = isEdit ? 'Atualizar dados do atendimento?' : 'Registrar atendimento para este paciente?';
    const confirmTitle = isEdit ? 'Confirmar Atualização' : 'Confirmação';
    
    // Exibe dialog de confirmação antes de registrar/atualizar
    const dialogRef = this.dialog.open(ConfirmDialogComponent, {
      data: {
        title: confirmTitle,
        message: confirmMessage
      }
    });
    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        if (isEdit) {
          this.atualizarAtendimento(atendimento);
        } else {
          this.criarAtendimento(atendimento);
        }
      }
      // Se não, apenas fecha o dialog
    });
  }

  criarAtendimento(atendimento: any) {
    this.http.post(`${environment.apiUrl}/atendimentos`, atendimento)
      .subscribe({
        next: () => {
          this.mensagem = '';
          const dialogRef = this.dialog.open(FeedbackDialogComponent, {
            data: {
              title: 'Sucesso',
              message: 'Atendimento registrado com sucesso!',
              type: 'success'
            }
          });
          setTimeout(() => {
            dialogRef.close();
            this.router.navigate(['/atendimentos']);
          }, 2500);
          // Limpar campos
          this.motivo = '';
          this.observacoes = '';
          this.pacienteSelecionado = null;
          this.filtroPaciente = '';
          this.pacientesFiltrados = [];
          this.status = 'encaminhado para triagem';
          this.motivo_interrupcao = '';
        },
        error: (err) => {
          this.mensagem = '';
          this.dialog.open(FeedbackDialogComponent, {
            data: {
              title: 'Erro',
              message: err?.error?.message || 'Erro ao registrar atendimento.',
              type: 'error'
            }
          });
        }
      });
  }
  
  atualizarAtendimento(atendimento: any) {
    this.atendimentoService.atualizarAtendimento(this.atendimentoId!, atendimento)
      .subscribe({
        next: () => {
          this.mensagem = '';
          const dialogRef = this.dialog.open(FeedbackDialogComponent, {
            data: {
              title: 'Sucesso',
              message: 'Atendimento atualizado com sucesso!',
              type: 'success'
            }
          });
          setTimeout(() => {
            dialogRef.close();
            this.router.navigate(['/atendimentos']);
          }, 2500);
        },
        error: (err) => {
          this.mensagem = '';
          this.dialog.open(FeedbackDialogComponent, {
            data: {
              title: 'Erro',
              message: err?.error?.message || 'Erro ao atualizar atendimento.',
              type: 'error'
            }
          });
        }
      });
  }
  
  // Atualizar lista de pacientes filtrados ao digitar
  onFiltroPacienteChange() {
    this.pacienteSelecionado = null;
    this.filtroSubject.next(this.filtroPaciente);
    if (!this.filtroPaciente || this.filtroPaciente.trim().length <= 1) {
      this.pacientesFiltrados = [];
    }
  }
  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  gerarPDF() {
    if (!this.pacienteSelecionado) return;
    const printWindow = window.open('', '', 'width=800,height=600');
    if (!printWindow) return;
    printWindow.document.write(`
      <html>
        <head>
          <title>Ficha de Atendimento</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 40px; }
            h2 { color: #2563eb; }
            .section { margin-bottom: 24px; }
            .label { font-weight: bold; }
          </style>
        </head>
        <body>
          <h2>e-Prontuário Aliança-PE</h2>
          <h3>Ficha de Atendimento</h3>
          <hr />
          <div class="section">
            <span class="label">Paciente:</span> ${this.pacienteSelecionado?.nome || ''}<br />
            <span class="label">Motivo:</span> ${this.motivo || ''}<br />
            <span class="label">Observações:</span> ${this.observacoes || ''}<br />
            <span class="label">Acompanhante:</span> ${this.acompanhante || ''}<br />
            <span class="label">Procedência:</span> ${this.procedencia || ''}<br />
            <span class="label">Status:</span> ${this.status || ''}<br />
          </div>
          <hr />
          <div style="margin-top: 32px; color: #666; font-size: 12px;">
            Gerado em: ${new Date().toLocaleDateString('pt-BR')} às ${new Date().toLocaleTimeString('pt-BR')}<br />
            Sistema e-Prontuário Aliança-PE
          </div>
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
    printWindow.close();
  }
}
