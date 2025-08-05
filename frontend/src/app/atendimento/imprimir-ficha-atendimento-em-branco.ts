import * as jsPDF from 'jspdf';

export function imprimirFichaAtendimentoEmBranco() {
  // Carrega a imagem do brasão dinamicamente do assets e gera o PDF após carregamento
  const img = new window.Image();
  img.src = 'assets/brasao-alianca.png';
  img.onload = () => {
    const doc = new jsPDF.jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });

    // Cabeçalho institucional (modelo físico)
    // Altura total dos textos do cabeçalho: 32 - 7 = 25mm
    // Ajustar a imagem para altura ~25mm, mantendo proporção (logo é quase quadrada)
    const logoX = 10;
    const logoY = 4;
    const logoH = 32;
    const logoW = 32; // ajuste se necessário para proporção
    const textX = logoX + logoW + 7; // espaço após a imagem

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

    // Título
    doc.setFontSize(13);
    doc.setFont('helvetica', 'bold');
    doc.text('FICHA DE ATENDIMENTO', 70, 40);

    // Quadro principal externo com margens maiores
    const marginX = 20;
    const quadroW = 170;
    const quadroH = 215; // altura aumentada
    doc.rect(marginX, 45, quadroW, quadroH, 'S');

    // Título do quadro
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.text('DADOS DO ATENDIMENTO', marginX + 5, 52);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');

    // Linha horizontal após título
    doc.line(marginX, 55, marginX + quadroW, 55);

    let y = 67; // Espaçamento extra após a linha horizontal do quadro
    const fieldH = 8;
    const gapY = 10;
    const labelX = marginX + 7;
    const fieldX = marginX + 50;
    const fieldW = quadroW - 60;

    // Linha 1: Data/Hora (menor) e Status (mais à esquerda)
    const dataW = 40;
    // Novo cálculo: statusW deve terminar alinhado ao final dos campos de baixo (fieldX + fieldW)
    const statusLabelX = fieldX + dataW + 5; // mais próximo do campo data
    const statusW = fieldX + fieldW - (statusLabelX + 13); // 13 é o deslocamento do label para o campo
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

    // Linha 3: Cartão do SUS (quadro médio)
    doc.setFont('helvetica', 'bold');
    doc.text('Cartão do SUS:', labelX, y);
    doc.setFont('helvetica', 'normal');
    doc.rect(fieldX, y - fieldH + 3, fieldW / 2, fieldH, 'S');
    y += gapY + fieldH;

    // Linha 4: Acompanhante (quadro grande)
    doc.setFont('helvetica', 'bold');
    doc.text('Acompanhante:', labelX, y);
    doc.setFont('helvetica', 'normal');
    doc.rect(fieldX, y - fieldH + 3, fieldW, fieldH, 'S');
    y += gapY + fieldH;

    // Linha 5: Procedência (quadro médio)
    doc.setFont('helvetica', 'bold');
    doc.text('Procedência:', labelX, y);
    doc.setFont('helvetica', 'normal');
    doc.rect(fieldX, y - fieldH + 3, fieldW / 2, fieldH, 'S');
    y += gapY + fieldH;

    // (Linha divisória removida para visual mais limpo)

    // Linha 6: Motivo (quadro grande)
    doc.setFont('helvetica', 'bold');
    doc.text('Motivo:', labelX, y);
    doc.setFont('helvetica', 'normal');
    doc.rect(fieldX, y - fieldH + 3, fieldW, fieldH, 'S');
    y += gapY + fieldH;

    // Linha 7: Observações (caixa maior)
    doc.setFont('helvetica', 'bold');
    doc.text('Observações:', labelX, y);
    doc.setFont('helvetica', 'normal');
    doc.rect(fieldX, y - fieldH + 3, fieldW, fieldH * 3, 'S');
    y += fieldH * 3 + gapY;

    // Linha 8: Motivo da Interrupção
    doc.setFont('helvetica', 'bold');
    doc.text('Motivo da Interrupção:', labelX, y);
    doc.setFont('helvetica', 'normal');
    doc.rect(fieldX, y - fieldH + 3, fieldW, fieldH, 'S');
    y += gapY + fieldH;

    // Ajustando campo Cartão do SUS ao lado de Dados do Atendimento
    doc.setFont('helvetica', 'bold');
    doc.text('Cartão do SUS:', marginX + quadroW - 70, 52);

    // Linha horizontal antes do rodapé removida para deixar o rodapé limpo
    const rodapeYTopo = 235 + (quadroH - 200); // posição do início do rodapé

    // Rodapé ajustado: centralizado verticalmente no novo espaço
    // Novo espaço útil do rodapé: rodapeYTopo até y final do quadro
    const rodapeAltura = (45 + quadroH) - rodapeYTopo;
    const assinaturaLabelX = marginX + 5;
    const assinaturaY = rodapeYTopo + rodapeAltura / 2 - 1; // centraliza o texto
    const assinaturaLinhaX1 = assinaturaLabelX + 45;
    const assinaturaLinhaX2 = marginX + quadroW - 10;
    doc.setFontSize(9);
    doc.setTextColor(100);
    doc.text('Assinatura do Profissional:', assinaturaLabelX, assinaturaY);
    // Linha para assinatura centralizada
    doc.setDrawColor(100);
    doc.line(assinaturaLinhaX1, assinaturaY + 1, assinaturaLinhaX2, assinaturaY + 1);

    doc.save('ficha-atendimento-em-branco-v2.pdf');
  };
}
