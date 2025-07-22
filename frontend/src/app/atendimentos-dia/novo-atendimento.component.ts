import { Component, OnDestroy } from '@angular/core';
import * as jsPDF from 'jspdf';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../environments/environment';
import { MatDialog } from '@angular/material/dialog';
import { FeedbackDialogComponent } from '../shared/feedback-dialog.component';
import { ConfirmDialogComponent } from '../shared/confirm-dialog.component';
import { Router } from '@angular/router';
import { Subject } from 'rxjs';
import { debounceTime, takeUntil } from 'rxjs/operators';
// Import necessário para o modal
// import { PacientesFormComponent } from '../pacientes/pacientes-form.component';

@Component({
  selector: 'app-novo-atendimento',
  templateUrl: './novo-atendimento.component.html',
  standalone: false,
})
export class NovoAtendimentoComponent {
  gerarPDF() {
    if (!this.pacienteSelecionado) return;
    const doc = new jsPDF.jsPDF();
    doc.setFontSize(20);
    doc.setTextColor(40);
    doc.text('e-Prontuário Aliança-PE', 20, 20);
    doc.setFontSize(14);
    doc.text('Ficha de Atendimento', 20, 30);
    doc.setLineWidth(0.5);
    doc.line(20, 35, 190, 35);
    doc.setFontSize(12);
    doc.setTextColor(0);
    let yPosition = 50;
    const lineHeight = 8;
    doc.setFont('helvetica', 'bold');
    doc.text('DADOS DO ATENDIMENTO', 20, yPosition);
    yPosition += lineHeight + 2;
    doc.setFont('helvetica', 'normal');
    doc.text(`Paciente: ${this.pacienteSelecionado.nome || ''}`, 20, yPosition);
    yPosition += lineHeight;
    if (this.pacienteSelecionado.nascimento) {
      doc.text(`Nascimento: ${new Date(this.pacienteSelecionado.nascimento).toLocaleDateString('pt-BR')}`, 20, yPosition);
      yPosition += lineHeight;
    }
    if (this.motivo) {
      doc.text(`Motivo: ${this.motivo}`, 20, yPosition);
      yPosition += lineHeight;
    }
    if (this.observacoes) {
      doc.text(`Observações: ${this.observacoes}`, 20, yPosition);
      yPosition += lineHeight;
    }
    if (this.acompanhante) {
      doc.text(`Acompanhante: ${this.acompanhante}`, 20, yPosition);
      yPosition += lineHeight;
    }
    if (this.procedencia) {
      doc.text(`Procedência: ${this.procedencia}`, 20, yPosition);
      yPosition += lineHeight;
    }
    doc.text(`Status: ${this.status}`, 20, yPosition);
    yPosition += lineHeight;
    if (this.status === 'interrompido' && this.motivo_interrupcao) {
      doc.text(`Motivo da Interrupção: ${this.motivo_interrupcao}`, 20, yPosition);
      yPosition += lineHeight;
    }
    doc.setFontSize(10);
    doc.setTextColor(100);
    const pageHeight = doc.internal.pageSize.height;
    doc.text(`Gerado em: ${new Date().toLocaleDateString('pt-BR')} às ${new Date().toLocaleTimeString('pt-BR')}`,
      20, pageHeight - 20);
    doc.text('Sistema e-Prontuário Aliança-PE', 20, pageHeight - 10);
    const nomeArquivo = `atendimento_${(this.pacienteSelecionado.nome || 'paciente').replace(/\s+/g, '_').toLowerCase()}_${new Date().getTime()}.pdf`;
    doc.save(nomeArquivo);
  }
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
}
