import { Injectable } from '@angular/core';
import * as jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

@Injectable({
  providedIn: 'root'
})
export class PdfGeneratorService {

  constructor() { }

  /**
   * Gera PDF da ficha de atendimento com dados do paciente
   */
  async gerarFichaAtendimento(atendimento: any, paciente: any) {
    try {
      // Formatar valores
      const formatarValor = (valor: any, padrao: string = 'Não informado') => {
        return (typeof valor === 'string' && valor.trim()) ? valor.trim() : padrao;
      };

      const formatarSexo = (s: string) => {
        if (s === 'M') return 'Masculino';
        if (s === 'F') return 'Feminino';
        if (s === 'I') return 'Ignorado';
        return s || 'Não informado';
      };

      const calcularIdade = (nascimento: string) => {
        if (!nascimento) return 'Não informado';
        const nasc = new Date(nascimento);
        if (isNaN(nasc.getTime())) return 'Data inválida';
        const hoje = new Date();
        let anos = hoje.getFullYear() - nasc.getFullYear();
        let meses = hoje.getMonth() - nasc.getMonth();
        let dias = hoje.getDate() - nasc.getDate();
        if (dias < 0) { meses--; dias += new Date(hoje.getFullYear(), hoje.getMonth(), 0).getDate(); }
        if (meses < 0) { anos--; meses += 12; }
        let texto = '';
        if (anos > 0) texto += `${anos} ano${anos !== 1 ? 's' : ''}`;
        if (meses > 0) { if (texto) texto += ', '; texto += `${meses} mês${meses !== 1 ? 'es' : ''}`; }
        if (dias > 0) { if (texto) texto += ' e '; texto += `${dias} dia${dias !== 1 ? 's' : ''}`; }
        return texto || 'Recém-nascido';
      };

      // Gerar HTML da ficha
      const htmlContent = this.gerarHTMLFicha(atendimento, paciente, formatarValor, formatarSexo, calcularIdade);

      // Criar elemento temporário
      const container = document.createElement('div');
      container.innerHTML = htmlContent;
      container.style.position = 'absolute';
      container.style.left = '-9999px';
      container.style.width = '1000px';
      container.style.background = '#fff';
      document.body.appendChild(container);

      // Converter HTML para canvas
      const canvas = await html2canvas(container, {
        scale: 1.5,
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff',
        allowTaint: true
      });

      // Remover elemento temporário
      document.body.removeChild(container);

      // Criar PDF
      const doc = new jsPDF.jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      });

      const imgWidth = 210; // A4 width in mm
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      const imgData = canvas.toDataURL('image/png');

      doc.addImage(imgData, 'PNG', 0, 0, imgWidth, imgHeight);

      const nomeArquivo = `ficha_atendimento_${paciente.nome}_${new Date().getTime()}.pdf`;
      doc.save(nomeArquivo);

      return { success: true, message: 'PDF gerado com sucesso!' };
    } catch (error: any) {
      console.error('Erro ao gerar PDF:', error);
      throw new Error(`Erro ao gerar PDF: ${error?.message || 'Erro desconhecido'}`);
    }
  }

  /**
   * Gera o HTML da ficha de atendimento
   */
  private gerarHTMLFicha(
    atendimento: any,
    paciente: any,
    formatarValor: Function,
    formatarSexo: Function,
    calcularIdade: Function
  ): string {
    const dataFormatada = new Date().toLocaleDateString('pt-BR');

    return `
      <!DOCTYPE html>
      <html lang="pt-BR">
      <head>
        <meta charset="UTF-8">
        <title>Ficha de Atendimento</title>
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
            padding: 15px 20px;
            width: 100%;
            box-sizing: border-box;
          }

          header {
            display: flex;
            align-items: center;
            gap: 12px;
            border-bottom: 1px solid #ddd;
            padding-bottom: 10px;
            margin-bottom: 12px;
          }

          .logo {
            flex-shrink: 0;
          }

          .logo img {
            height: 70px;
            object-fit: contain;
          }

          .info {
            flex: 1;
            text-align: left;
          }

          .info h1 {
            margin: 0;
            font-size: 16px;
            color: #333;
          }

          .info p {
            margin: 1px 0;
            font-size: 11px;
            color: #555;
            line-height: 1.3;
          }

          .title-section {
            text-align: center;
            margin-bottom: 12px;
          }

          .title-section h2 {
            margin: 0;
            font-size: 18px;
            letter-spacing: 0.5px;
            color: #333;
          }

          .title-section p {
            margin: 3px 0;
            font-size: 11px;
            color: #666;
          }

          fieldset {
            border: 1px solid #e0e0e0;
            border-radius: 8px;
            padding: 10px 15px 12px;
            margin-bottom: 12px;
          }

          legend {
            padding: 0 8px;
            font-weight: bold;
            font-size: 12px;
            color: #333;
          }

          .grid {
            display: grid;
            grid-template-columns: repeat(2, 1fr);
            gap: 10px;
          }

          .full {
            grid-column: span 2;
          }

          .field {
            display: flex;
            flex-direction: column;
            font-size: 12px;
          }

          .label {
            font-weight: 600;
            color: #555;
            margin-bottom: 2px;
          }

          .value {
            padding: 4px 6px;
            background: #f9fafb;
            border-radius: 4px;
            min-height: 16px;
            font-size: 11px;
          }

          .line {
            border-bottom: 1px solid #ccc;
            height: 16px;
          }

          .signature {
            margin-top: 15px;
            display: flex;
            justify-content: space-between;
            gap: 20px;
          }

          .signature div {
            flex: 1;
            text-align: center;
          }

          .signature-line {
            margin-top: 25px;
            border-top: 1px solid #000;
            padding-top: 3px;
            font-size: 11px;
            font-weight: 600;
          }

          footer {
            margin-top: 10px;
            padding-top: 10px;
            border-top: 1px solid #e0e0e0;
            text-align: center;
            font-size: 10px;
            color: #999;
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
            <p>Fones: 3637.1340 / 3637.1388 | E-mail: unidademista2009@hotmail.com</p>
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
              <div class="value">${formatarValor(paciente.nome)}</div>
            </div>

            <div class="field">
              <div class="label">Nome da Mãe</div>
              <div class="value">${formatarValor(paciente.mae)}</div>
            </div>

            <div class="field">
              <div class="label">Data de Nascimento</div>
              <div class="value">${paciente.nascimento ? new Date(paciente.nascimento).toLocaleDateString('pt-BR') : 'Não informado'}</div>
            </div>

            <div class="field">
              <div class="label">Idade</div>
              <div class="value">${calcularIdade(paciente.nascimento)}</div>
            </div>

            <div class="field">
              <div class="label">Sexo</div>
              <div class="value">${formatarSexo(paciente.sexo)}</div>
            </div>

            <div class="field">
              <div class="label">Estado Civil</div>
              <div class="value">${formatarValor(paciente.estado_civil)}</div>
            </div>

            <div class="field">
              <div class="label">Telefone</div>
              <div class="value">${formatarValor(paciente.telefone)}</div>
            </div>

            <div class="field">
              <div class="label">Cartão SUS</div>
              <div class="value">${formatarValor(paciente.sus)}</div>
            </div>

          </div>
        </fieldset>

        <fieldset>
          <legend>ENDEREÇO</legend>
          <div class="grid">

            <div class="field full">
              <div class="label">Endereço</div>
              <div class="value">${formatarValor(paciente.endereco)}</div>
            </div>

            <div class="field">
              <div class="label">Bairro</div>
              <div class="value">${formatarValor(paciente.bairro)}</div>
            </div>

            <div class="field">
              <div class="label">Município</div>
              <div class="value">${formatarValor(paciente.municipio)}</div>
            </div>

            <div class="field">
              <div class="label">UF</div>
              <div class="value">${formatarValor(paciente.uf)}</div>
            </div>

            <div class="field">
              <div class="label">CEP</div>
              <div class="value">${formatarValor(paciente.cep)}</div>
            </div>

          </div>
        </fieldset>

        <fieldset>
          <legend>DADOS DO ATENDIMENTO</legend>
          <div class="grid">

            <div class="field">
              <div class="label">Data/Hora</div>
              <div class="value">${new Date(atendimento.data_hora_atendimento).toLocaleString('pt-BR')}</div>
            </div>

            <div class="field">
              <div class="label">Status</div>
              <div class="value">${atendimento.abandonado ? 'ABANDONADO' : (atendimento.status?.charAt(0).toUpperCase() + atendimento.status?.slice(1).toLowerCase() || 'Não informado')}</div>
            </div>

            <div class="field full">
              <div class="label">Motivo</div>
              <div class="value">${formatarValor(atendimento.motivo)}</div>
            </div>

          </div>
        </fieldset>

        <fieldset>
          <legend>DADOS CLÍNICOS</legend>
          <div class="grid">

            <div class="field">
              <div class="label">Pressão Arterial</div>
              <div class="line"></div>
            </div>

            <div class="field">
              <div class="label">Temperatura</div>
              <div class="line"></div>
            </div>

            <div class="field">
              <div class="label">Frequência Cardíaca</div>
              <div class="line"></div>
            </div>

            <div class="field">
              <div class="label">Saturação</div>
              <div class="line"></div>
            </div>

            <div class="field full">
              <div class="label">Queixa Principal</div>
              <div class="line"></div>
            </div>

            <div class="field full">
              <div class="label">Observações</div>
              <div class="line"></div>
            </div>

          </div>
        </fieldset>

        <div class="signature">
          <div>
            <div class="signature-line">Assinatura do Profissional</div>
          </div>
          <div>
            <div class="signature-line">Assinatura do Paciente</div>
          </div>
        </div>

        <footer>
          <div>Gerado em: ${dataFormatada} às ${new Date().toLocaleTimeString('pt-BR')}</div>
          <div>Sistema e-Prontuário - Unidade Mista Municipal de Aliança-PE</div>
        </footer>

      </div>

      </body>
      </html>
    `;
  }
}
