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
    // Carregar brasão para o cabeçalho institucional
    const img = new window.Image();
    img.src = 'assets/brasao-alianca.png';
    img.onload = () => {
      const doc = new jsPDF.jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
      const pageWidth = 210;

      // Cabeçalho institucional (igual ficha em branco)
      const logoX = 10;
      const logoY = 4;
      const logoH = 32;
      const logoW = 32;
      const textX = logoX + logoW + 7;
      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.addImage(img, 'PNG', logoX, logoY, logoW, logoH);
      doc.text('PREFEITURA DA ALIANÇA', textX, 13);
      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      doc.text('SECRETARIA MUNICIPAL DE SAÚDE', textX, 18);
      doc.text('UNIDADE MISTA MUNICIPAL DE ALIANÇA', textX, 22);
      doc.setFontSize(8);
      doc.text('Rua Marechal Deodoro, s/n - Aliança - PE - CEP: 55.890-000', textX, 26);
      doc.text('Fones: 3637.1340 / 3637.1388', textX, 29);
      doc.text('E-mail: unidademista2009@hotmail.com', textX, 32);

      // Título centralizado
      doc.setFontSize(13);
      doc.setFont('helvetica', 'bold');
      const titulo = 'FICHA DE ATENDIMENTO';
      const tituloW = doc.getTextWidth(titulo);
      doc.text(titulo, (pageWidth - tituloW) / 2, 40);

      // Quadro principal
      const marginX = 20;
      const quadroW = 170;
      const quadroH = 215;
      doc.rect(marginX, 45, quadroW, quadroH, 'S');

      // Título da seção
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(11);
      doc.text('DADOS DO ATENDIMENTO', marginX + 5, 52);
      doc.line(marginX, 55, marginX + quadroW, 55);

      // Campos
      doc.setFontSize(10);
      let y = 65;
      const labelX = marginX + 7;
      const valueX = marginX + 55;
      const lineH = 10;

      if (this.motivo) {
        doc.setFont('helvetica', 'bold');
        doc.text('Motivo:', labelX, y);
        doc.setFont('helvetica', 'normal');
        const motivoLines = doc.splitTextToSize(this.motivo, quadroW - 65);
        doc.text(motivoLines, valueX, y);
        y += lineH * Math.max(1, motivoLines.length);
      }

      if (this.observacoes) {
        doc.setFont('helvetica', 'bold');
        doc.text('Observações:', labelX, y);
        doc.setFont('helvetica', 'normal');
        const obsLines = doc.splitTextToSize(this.observacoes, quadroW - 65);
        doc.text(obsLines, valueX, y);
        y += lineH * Math.max(1, obsLines.length);
      }

      // Assinatura do profissional
      const assinaturaY = 45 + quadroH - 7;
      doc.setFontSize(9);
      doc.setTextColor(100);
      doc.text('Assinatura do Profissional:', marginX + 5, assinaturaY);
      doc.setDrawColor(100);
      doc.line(marginX + 50, assinaturaY + 1, marginX + quadroW - 10, assinaturaY + 1);

      // Rodapé
      doc.setFontSize(8);
      doc.setTextColor(150);
      const pageHeight = doc.internal.pageSize.height;
      const rodape = 'Gerado em: ' + new Date().toLocaleDateString('pt-BR') + ' às ' + new Date().toLocaleTimeString('pt-BR') + ' - Sistema e-Prontuário Aliança-PE';
      const rodapeW = doc.getTextWidth(rodape);
      doc.text(rodape, (pageWidth - rodapeW) / 2, pageHeight - 10);

      const nomeArquivo = `atendimento_${new Date().getTime()}.pdf`;
      doc.save(nomeArquivo);
    };
  }
}
