import { Component, OnDestroy } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../environments/environment';
import { MatDialog } from '@angular/material/dialog';
import { FeedbackDialogComponent } from '../shared/feedback-dialog.component';
import { ConfirmDialogComponent } from '../shared/confirm-dialog.component';
import { Router } from '@angular/router';
import { Subject } from 'rxjs';
import { debounceTime, takeUntil } from 'rxjs/operators';
import * as jsPDF from 'jspdf';
// Import necessário para o modal
// import { PacientesFormComponent } from '../pacientes/pacientes-form.component';

@Component({
  selector: 'app-novo-atendimento',
  templateUrl: './novo-atendimento.component.html',
  standalone: false,
})
export class NovoAtendimentoComponent {
  filtroPaciente: string = '';
  pacientesFiltrados: any[] = [];
  pacienteSelecionado: any = null;
  motivo: string = '';
  observacoes: string = '';
  mensagem: string = '';
  acompanhante: string = '';
  procedencia: string = '';
  status: string = 'recepcao';
  motivo_interrupcao: string = '';
  exibirCadastroPaciente: boolean = false;
  horario: string = '';
  apiUrl = environment.apiUrl + '/pacientes';
  private filtroSubject = new Subject<string>();
  private destroy$ = new Subject<void>();

  constructor(private http: HttpClient, private dialog: MatDialog, private router: Router) {
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
    // Inicializa o horário atual no formato HH:mm
    const now = new Date();
    this.horario = now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  }

  abrirCadastroPaciente() {
    this.exibirCadastroPaciente = true;
  }

  fecharCadastroPaciente() {
    this.exibirCadastroPaciente = false;
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
    // Verifica se já existe atendimento para o paciente hoje
    const hoje = new Date().toISOString().slice(0, 10);
    this.http.get<any>(`${environment.apiUrl}/atendimentos?pacienteId=${atendimento.pacienteId}&data=${hoje}`)
      .subscribe(
        res => {
          if (res && res.length > 0) {
            // Já existe atendimento hoje, perguntar ao usuário
            const dialogRef = this.dialog.open(ConfirmDialogComponent, {
              data: {
                title: 'Atenção',
                message: 'Já existe atendimento registrado para este paciente na data de hoje. Deseja criar outro atendimento mesmo assim?'
              }
            });
            dialogRef.afterClosed().subscribe(result => {
              if (result) {
                this.criarAtendimento(atendimento);
              }
              // Se não, não faz nada
            });
          } else {
            // Não existe, pode criar direto
            this.criarAtendimento(atendimento);
          }
        },
        () => {
          // Em caso de erro na verificação, permite criar
          this.criarAtendimento(atendimento);
        }
      );
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
          this.status = 'recepcao';
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
