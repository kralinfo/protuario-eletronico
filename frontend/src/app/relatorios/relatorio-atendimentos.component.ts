// ...existing code up to the first closing bracket of the class...

import * as jsPDF from 'jspdf';
import { Component } from '@angular/core';

import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-relatorio-atendimentos',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './relatorio-atendimentos.component.html',
  styleUrls: ['./relatorio-atendimentos.component.scss']
})
export class RelatorioAtendimentosComponent {
  dataInicial: string = '';
  dataFinal: string = '';
  profissional: string = '';
  profissionais = [
    { id: '1', nome: 'Dra. Ana' },
    { id: '2', nome: 'Dr. João' },
    { id: '3', nome: 'Enf. Maria' }
  ];
  relatorio: any[] = [];
  loading = false;

  buscarRelatorio() {
    this.loading = true;
    setTimeout(() => {
      // Simulação de dados
      this.relatorio = [
        {
          data: new Date(),
          paciente: 'José da Silva',
          profissional: 'Dra. Ana',
          procedimento: 'Consulta',
          observacoes: 'Paciente apresentou melhora.'
        },
        {
          data: new Date(),
          paciente: 'Maria Souza',
          profissional: 'Dr. João',
          procedimento: 'Retorno',
          observacoes: 'Solicitado novo exame.'
        }
      ];
      this.loading = false;
    }, 1200);
  }
  gerarRelatorioSimples() {
    const doc = new jsPDF.jsPDF();
    doc.setFontSize(16);
    doc.text('Relatório Simples de Atendimentos', 20, 20);
    doc.setFontSize(12);
    let y = 35;
    doc.text('Data', 20, y);
    doc.text('Paciente', 60, y);
    doc.text('Profissional', 130, y);
    y += 8;
    doc.setLineWidth(0.2);
    doc.line(20, y - 5, 190, y - 5);
    this.relatorio.forEach(item => {
      doc.text(new Date(item.data).toLocaleDateString('pt-BR'), 20, y);
      doc.text(item.paciente, 60, y);
      doc.text(item.profissional, 130, y);
      y += 8;
      if (y > 270) {
        doc.addPage();
        y = 20;
      }
    });
    doc.save('relatorio-simples-atendimentos.pdf');
  }

  gerarRelatorioDetalhado() {
    const doc = new jsPDF.jsPDF();
    doc.setFontSize(16);
    doc.text('Relatório Detalhado de Atendimentos', 20, 20);
    doc.setFontSize(12);
    let y = 35;
    doc.text('Data', 20, y);
    doc.text('Paciente', 50, y);
    doc.text('Profissional', 100, y);
    doc.text('Procedimento', 140, y);
    y += 8;
    doc.text('Observações', 20, y);
    y += 8;
    doc.setLineWidth(0.2);
    doc.line(20, y - 13, 190, y - 13);
    this.relatorio.forEach(item => {
      doc.text(new Date(item.data).toLocaleDateString('pt-BR'), 20, y);
      doc.text(item.paciente, 50, y);
      doc.text(item.profissional, 100, y);
      doc.text(item.procedimento, 140, y);
      y += 8;
      doc.text(item.observacoes, 20, y);
      y += 10;
      if (y > 270) {
        doc.addPage();
        y = 20;
      }
    });
    doc.save('relatorio-detalhado-atendimentos.pdf');
  }
}
