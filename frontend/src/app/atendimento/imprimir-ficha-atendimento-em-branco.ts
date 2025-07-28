import * as jsPDF from 'jspdf';

export function imprimirFichaAtendimentoEmBranco() {
  // Usar orientação retrato (portrait) para se aproximar do layout físico
  const doc = new jsPDF.jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });

  // Cabeçalho institucional (modelo físico)
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('PREFEITURA DA ALIANÇA', 12, 13);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text('SECRETARIA MUNICIPAL DE SAÚDE', 12, 18);
  doc.text('UNIDADE MISTA MUNICIPAL DE ALIANÇA', 12, 22);
  doc.setFontSize(8);
  doc.text('Rua Marechal Deodoro, s/n - Aliança - PE - CEP: 55.890-000', 12, 26);
  doc.text('Fones: 3637.1340 / 3637.1388', 12, 29);
  doc.text('E-mail: unidademista2009@hotmail.com', 12, 32);

  // Título
  doc.setFontSize(13);
  doc.setFont('helvetica', 'bold');
  doc.text('FICHA DE ATENDIMENTO', 70, 40);

  // Quadro principal externo com margens maiores
  const marginX = 20;
  const quadroW = 170;
  doc.rect(marginX, 45, quadroW, 200, 'S');

  // Título do quadro
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text('DADOS DO ATENDIMENTO', marginX + 5, 52);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');

  // Linha horizontal após título
  doc.line(marginX, 55, marginX + quadroW, 55);

  let y = 62;
  const fieldH = 8;
  const gapY = 10;
  const labelX = marginX + 7;
  const fieldX = marginX + 50;
  const fieldW = quadroW - 60;

  // Linha 1: Data/Hora (menor) e Status (mais à esquerda)
  const dataW = 40;
  const statusW = 60;
  const statusLabelX = fieldX + dataW + 5; // mais próximo do campo data
  doc.setFont('helvetica', 'bold');
  doc.text('Data/Hora:', labelX, y);
  doc.setFont('helvetica', 'normal');
  doc.rect(fieldX, y - fieldH + 3, dataW, fieldH, 'S');
  doc.setFont('helvetica', 'bold');
  doc.text('Status:', statusLabelX, y);
  doc.setFont('helvetica', 'normal');
  doc.rect(statusLabelX + 13, y - fieldH + 3, statusW, fieldH, 'S');
  y += gapY + fieldH;

  // Linha 2: Nome do Paciente (quadro grande)
  doc.setFont('helvetica', 'bold');
  doc.text('Nome do Paciente:', labelX, y);
  doc.setFont('helvetica', 'normal');
  doc.rect(fieldX, y - fieldH + 3, fieldW, fieldH, 'S');
  y += gapY + fieldH;

  // Linha 3: Acompanhante (quadro grande)
  doc.setFont('helvetica', 'bold');
  doc.text('Acompanhante:', labelX, y);
  doc.setFont('helvetica', 'normal');
  doc.rect(fieldX, y - fieldH + 3, fieldW, fieldH, 'S');
  y += gapY + fieldH;

  // Linha 4: Procedência (quadro médio)
  doc.setFont('helvetica', 'bold');
  doc.text('Procedência:', labelX, y);
  doc.setFont('helvetica', 'normal');
  doc.rect(fieldX, y - fieldH + 3, fieldW / 2, fieldH, 'S');
  y += gapY + fieldH;

  // (Linha divisória removida para visual mais limpo)

  // Linha 5: Motivo (quadro grande)
  doc.setFont('helvetica', 'bold');
  doc.text('Motivo:', labelX, y);
  doc.setFont('helvetica', 'normal');
  doc.rect(fieldX, y - fieldH + 3, fieldW, fieldH, 'S');
  y += gapY + fieldH;

  // Linha 6: Observações (caixa maior)
  doc.setFont('helvetica', 'bold');
  doc.text('Observações:', labelX, y);
  doc.setFont('helvetica', 'normal');
  doc.rect(fieldX, y - fieldH + 3, fieldW, fieldH * 3, 'S');
  y += fieldH * 3 + gapY;

  // Linha 7: Motivo da Interrupção
  doc.setFont('helvetica', 'bold');
  doc.text('Motivo da Interrupção:', labelX, y);
  doc.setFont('helvetica', 'normal');
  doc.rect(fieldX, y - fieldH + 3, fieldW, fieldH, 'S');
  y += gapY + fieldH;

  // Linha horizontal antes do rodapé
  doc.line(marginX, 235, marginX + quadroW, 235);

  // Rodapé
  doc.setFontSize(9);
  doc.setTextColor(100);
  doc.text('Assinatura do Profissional: ___________________________________________', marginX + 5, 245);

  doc.save('ficha-atendimento-em-branco.pdf');
}
