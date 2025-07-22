import { Component, Inject } from '@angular/core';
import * as jsPDF from 'jspdf';
import { MAT_DIALOG_DATA } from '@angular/material/dialog';
import { AtendimentoService } from '../services/atendimento.service';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-registrar-atendimento',
  templateUrl: './registrar-atendimento.component.html',
  standalone: true,
  imports: [FormsModule, CommonModule]
})
export class RegistrarAtendimentoComponent {
  pacienteId: number;
  motivo = '';
  observacoes = '';
  loading = false;
  mensagem = '';

  constructor(
    private atendimentoService: AtendimentoService,
    @Inject(MAT_DIALOG_DATA) public data: { pacienteId: number }
  ) {
    this.pacienteId = data.pacienteId;
  }

  registrar() {
    if (!this.motivo) {
      this.mensagem = 'Motivo é obrigatório.';
      return;
    }
    this.loading = true;
    this.atendimentoService.registrarAtendimento({
      pacienteId: this.pacienteId,
      motivo: this.motivo,
      observacoes: this.observacoes
    }).subscribe({
      next: () => {
        this.mensagem = 'Atendimento registrado com sucesso!';
        this.motivo = '';
        this.observacoes = '';
        this.loading = false;
      },
      error: err => {
        this.mensagem = err.error?.error || 'Erro ao registrar atendimento.';
        this.loading = false;
      }
    });
  }

  gerarPDF() {
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
    if (this.motivo) {
      doc.text(`Motivo: ${this.motivo}`, 20, yPosition);
      yPosition += lineHeight;
    }
    if (this.observacoes) {
      doc.text(`Observações: ${this.observacoes}`, 20, yPosition);
      yPosition += lineHeight;
    }
    doc.setFontSize(10);
    doc.setTextColor(100);
    const pageHeight = doc.internal.pageSize.height;
    doc.text(`Gerado em: ${new Date().toLocaleDateString('pt-BR')} às ${new Date().toLocaleTimeString('pt-BR')}`,
      20, pageHeight - 20);
    doc.text('Sistema e-Prontuário Aliança-PE', 20, pageHeight - 10);
    const nomeArquivo = `atendimento_${new Date().getTime()}.pdf`;
    doc.save(nomeArquivo);
  }
}
