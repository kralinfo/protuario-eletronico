import * as jsPDF from 'jspdf';

export function imprimirFichaAtendimentoEmBranco() {
  const doc = new jsPDF.jsPDF();

  doc.setFontSize(20);
  doc.setTextColor(40);
  doc.text('e-Prontuário Aliança-PE', 20, 20);
  doc.setFontSize(14);
  doc.text('Ficha de Atendimento (Em Branco)', 20, 30);
  doc.setLineWidth(0.5);
  doc.line(20, 35, 190, 35);

  doc.setFontSize(12);
  doc.setTextColor(0);
  let yPosition = 50;
  const lineHeight = 12;

  doc.setFont('helvetica', 'bold');
  doc.text('DADOS DO ATENDIMENTO', 20, yPosition);
  yPosition += lineHeight + 2;
  doc.setFont('helvetica', 'normal');

  // Campos para preenchimento manual
  const campos = [
    'Data/Hora do Atendimento',
    'Nome do Paciente',
    'Motivo',
    'Observações',
    'Acompanhante',
    'Procedência',
    'Status',
    'Motivo da Interrupção'
  ];
  campos.forEach(campo => {
    doc.text(`${campo}:`, 20, yPosition);
    doc.line(65, yPosition + 1, 190, yPosition + 1); // linha para preenchimento manual
    yPosition += lineHeight;
  });

  doc.setFontSize(10);
  doc.setTextColor(100);
  doc.text('Gerado em branco para preenchimento manual. Sistema e-Prontuário Aliança-PE', 20, 280);

  doc.save('ficha-atendimento-em-branco.pdf');
}
