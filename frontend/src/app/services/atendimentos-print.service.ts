/**
 * AtendimentosPrintService
 * Responsabilidade: Gerar e formatar conteúdo para impressão de atendimentos
 */

import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class AtendimentosPrintService {

  /**
   * Calcula a idade com base na data de nascimento
   */
  calcularIdade(nascimento: string | null | undefined): string {
    if (!nascimento) return 'Não informado';
    
    const nasc = new Date(nascimento);
    if (isNaN(nasc.getTime())) return 'Data inválida';
    
    const hoje = new Date();
    let anos = hoje.getFullYear() - nasc.getFullYear();
    let meses = hoje.getMonth() - nasc.getMonth();
    let dias = hoje.getDate() - nasc.getDate();
    
    if (dias < 0) {
      meses--;
      dias += new Date(hoje.getFullYear(), hoje.getMonth(), 0).getDate();
    }
    if (meses < 0) {
      anos--;
      meses += 12;
    }
    
    let texto = '';
    if (anos > 0) texto += `${anos} ano${anos !== 1 ? 's' : ''}`;
    if (meses > 0) {
      if (texto) texto += ', ';
      texto += `${meses} mês${meses !== 1 ? 'es' : ''}`;
    }
    if (dias > 0) {
      if (texto) texto += ' e ';
      texto += `${dias} dia${dias !== 1 ? 's' : ''}`;
    }
    
    return texto || 'Recém-nascido';
  }

  /**
   * Formata valor com padrão
   */
  formatarValor(valor: any, padrao: string = 'Não informado'): string {
    return (typeof valor === 'string' && valor.trim()) ? valor.trim() : padrao;
  }

  /**
   * Formata sexo para exibição
   */
  formatarSexo(sexo: string | null | undefined): string {
    if (sexo === 'M') return 'Masculino';
    if (sexo === 'F') return 'Feminino';
    if (sexo === 'I') return 'Ignorado';
    return sexo || 'Não informado';
  }

  /**
   * Abre janela de impressão com validação
   */
  openPrintWindow(): Window | null {
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      console.error('Não foi possível abrir a janela de impressão');
      return null;
    }
    return printWindow;
  }

  /**
   * Escreve HTML na janela de impressão
   */
  writePrintContent(printWindow: Window, htmlContent: string): void {
    printWindow.document.write(htmlContent);
    printWindow.document.close();
    printWindow.focus();
  }

  /**
   * Dispara a impressão e fecha a janela
   */
  triggerPrint(printWindow: Window, delay: number = 500): void {
    setTimeout(() => {
      printWindow.print();
      printWindow.close();
    }, delay);
  }

  /**
   * Gera HTML para impressão de atendimento
   */
  generatePrintHTML(atendimento: any): string {
    const dataFormatada = new Date().toLocaleDateString('pt-BR');

    return `
      <!DOCTYPE html>
      <html lang="pt-BR">
      <head>
        <meta charset="UTF-8">
        <title>Ficha de Atendimento - ${atendimento.paciente_nome}</title>
        <style>
          body {
            font-family: 'Segoe UI', Tahoma, sans-serif;
            background: #fff;
            padding: 0;
            margin: 0;
          }
          .container {
            max-width: 900px;
            margin: 0;
            background: #fff;
            padding: 8px 12px;
            width: 100%;
            box-sizing: border-box;
          }
          header {
            display: flex;
            align-items: center;
            gap: 8px;
            border-bottom: 1px solid #ddd;
            padding-bottom: 6px;
            margin-bottom: 8px;
          }
          .logo { flex-shrink: 0; }
          .logo img { height: 60px; object-fit: contain; }
          .info { flex: 1; text-align: left; }
          .info h1 { margin: 0; font-size: 14px; color: #333; }
          .info p { margin: 0; font-size: 10px; color: #555; line-height: 1.2; }
          .title-section { text-align: center; margin-bottom: 8px; }
          .title-section h2 { margin: 0; font-size: 16px; color: #333; }
          .title-section p { margin: 2px 0; font-size: 10px; color: #666; }
          fieldset {
            border: 1px solid #e0e0e0;
            border-radius: 6px;
            padding: 6px 10px 8px;
            margin-bottom: 8px;
          }
          legend {
            padding: 0 6px;
            font-weight: bold;
            font-size: 11px;
            color: #333;
          }
          .grid {
            display: grid;
            grid-template-columns: repeat(2, 1fr);
            gap: 6px;
          }
          .full { grid-column: span 2; }
          .field {
            display: flex;
            flex-direction: column;
            font-size: 11px;
          }
          .label {
            font-weight: 600;
            color: #555;
            margin-bottom: 1px;
            font-size: 10px;
          }
          .value {
            padding: 3px 4px;
            background: #f9fafb;
            border-radius: 3px;
            min-height: 14px;
            font-size: 10px;
            line-height: 1.2;
          }
          @media print {
            body { margin: 0; padding: 0; }
            .container { box-shadow: none; border-radius: 0; }
          }
        </style>
      </head>
      <body>
        <div class="container">
          <header>
            <div class="logo">
              <img src="assets/brasao-alianca.png" alt="Brasão da Aliança">
            </div>
            <div class="info">
              <h1>PREFEITURA DA ALIANÇA</h1>
              <p>SECRETARIA MUNICIPAL DE SAÚDE</p>
              <p>UNIDADE MISTA MUNICIPAL DE ALIANÇA</p>
              <p>Rua Marechal Deodoro, s/n - Aliança - PE - CEP: 55.890-000</p>
            </div>
          </header>
          <div class="title-section">
            <h2>FICHA DE ATENDIMENTO</h2>
            <p>Gerado em: ${dataFormatada}</p>
          </div>
          <fieldset>
            <legend>DADOS PESSOAIS</legend>
            <div class="grid">
              <div class="field">
                <div class="label">Nome</div>
                <div class="value">${this.formatarValor(atendimento.paciente_nome)}</div>
              </div>
            </div>
          </fieldset>
        </div>
      </body>
      </html>
    `;
  }
}
