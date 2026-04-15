import { Component, Inject, OnInit } from '@angular/core';
import { MatDialogRef, MatDialog } from '@angular/material/dialog';
import { HttpClient } from '@angular/common/http';
import { MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { CommonModule } from '@angular/common';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { environment } from '../../environments/environment';
import { getStatusLabel } from '../utils/normalize-status';
import { AtendimentoService } from '../services/atendimento.service';
import { AbandonoDialogComponent } from '../shared/abandono-dialog/abandono-dialog.component';
import { ConfirmDialogComponent } from '../shared/confirm-dialog/confirm-dialog.component';
import { FeedbackDialogComponent } from '../shared/feedback-dialog/feedback-dialog.component';

@Component({
  selector: 'app-historico-atendimento-detalhe',
  templateUrl: './historico-atendimento-detalhe.component.html',
  styleUrls: ['./historico-atendimento-detalhe.component.scss'],
  standalone: true,
  imports: [CommonModule, MatDialogModule, MatProgressSpinnerModule, MatIconModule]
})
export class HistoricoAtendimentoDetalheComponent implements OnInit {
  atendimento: any = null;
  carregando = false;
  erro = '';

  constructor(
    private http: HttpClient,
    private dialog: MatDialog,
    private atendimentoService: AtendimentoService,
    @Inject(MAT_DIALOG_DATA) public data: any,
    private dialogRef: MatDialogRef<HistoricoAtendimentoDetalheComponent>
  ) {}

  fechar() {
    this.dialogRef.close();
  }

  ngOnInit() {
    if (this.data?.atendimentoId) {
      this.carregarAtendimento(this.data.atendimentoId);
    }
  }

  carregarAtendimento(id: number) {
    this.carregando = true;
    this.http.get<any>(`${environment.apiUrl}/atendimentos/${id}`).subscribe({
      next: (res) => {
        this.atendimento = res.data || res;
        this.carregando = false;
      },
      error: (err) => {
        this.erro = 'Erro ao carregar dados do atendimento.';
        this.carregando = false;
      }
    });
  }

  isStatusFinal(): boolean {
    const statusFinais = ['atendimento_concluido', 'alta_medica', 'alta_ambulatorial', 'abandonado'];
    return statusFinais.includes((this.atendimento?.status || '').toLowerCase());
  }

  registrarAbandono() {
    const dialogRef = this.dialog.open(AbandonoDialogComponent, {
      data: { atendimento: this.atendimento },
      width: '500px'
    });

    dialogRef.afterClosed().subscribe((result: any) => {
      if (result) {
        this.atendimentoService.registrarAbandono(this.atendimento.id, result).subscribe({
          next: () => {
            this.dialog.open(FeedbackDialogComponent, {
              data: { title: 'Abandono Registrado', message: 'Atendimento marcado como abandonado com sucesso!', type: 'success' }
            });
            setTimeout(() => { this.dialog.closeAll(); }, 2000);
          },
          error: () => {
            this.dialog.open(FeedbackDialogComponent, {
              data: { title: 'Erro', message: 'Falha ao registrar abandono. Tente novamente.', type: 'error' }
            });
            setTimeout(() => { this.dialog.closeAll(); }, 2500);
          }
        });
      }
    });
  }

  registrarConclusao() {
    const dialogRef = this.dialog.open(ConfirmDialogComponent, {
      data: {
        title: 'Registrar Conclusão',
        message: `Confirma a conclusão do atendimento do paciente ${this.atendimento?.paciente_nome || ''}?`
      }
    });

    dialogRef.afterClosed().subscribe((result: any) => {
      if (result) {
        const dados = {
          motivo: this.atendimento.motivo,
          observacoes: this.atendimento.observacoes,
          status: 'atendimento_concluido',
          procedencia: this.atendimento.procedencia,
          acompanhante: this.atendimento.acompanhante
        };
        this.atendimentoService.atualizarAtendimento(this.atendimento.id, dados).subscribe({
          next: () => {
            this.dialog.open(FeedbackDialogComponent, {
              data: { title: 'Sucesso', message: 'Atendimento concluído com sucesso!', type: 'success' }
            });
            setTimeout(() => { this.dialog.closeAll(); }, 2000);
          },
          error: (err: any) => {
            this.dialog.open(FeedbackDialogComponent, {
              data: { title: 'Erro', message: err?.error?.message || 'Erro ao concluir atendimento.', type: 'error' }
            });
            setTimeout(() => { this.dialog.closeAll(); }, 2500);
          }
        });
      }
    });
  }

  getStatusLabel = getStatusLabel;
}
