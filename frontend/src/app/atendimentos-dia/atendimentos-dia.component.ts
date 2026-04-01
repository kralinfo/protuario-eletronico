import { Component, OnInit, HostListener } from '@angular/core';
import { Router } from '@angular/router';
import { AtendimentoService } from '../services/atendimento.service';
import { MatDialog } from '@angular/material/dialog';
import { ConfirmDialogComponent } from '../shared/confirm-dialog/confirm-dialog.component';
import { FeedbackDialogComponent } from '../shared/feedback-dialog/feedback-dialog.component';
import { AbandonoDialogComponent } from '../shared/abandono-dialog/abandono-dialog.component';
import { AuthService } from '../auth/auth.service';
import { DatePipe } from '@angular/common';

@Component({
  selector: 'app-atendimentos-dia',
  templateUrl: './atendimentos-dia.component.html',
  styleUrls: ['../shared/styles/table-footer.css'],
  standalone: false,
  providers: [DatePipe]
})
export class AtendimentosDiaComponent implements OnInit {
  atendimentos: any[] = [];
  filtro = '';
  paginaAtual = 1;
  itensPorPagina = 10;
  totalPaginas = 1;
  pageSizeOptions = [10, 25, 50];
  loading = false;

  // Filtros de data
  dataInicial: string = '';
  dataFinal: string = '';
  // O filtro de data deve estar sempre visível
  mostrarFiltroData = true;
  openMenuId: number | null = null;
  menuPos = { top: 0, left: 0 };

  @HostListener('document:click')
  onDocumentClick() {
    this.openMenuId = null;
  }

  toggleMenu(event: Event, id: number) {
    event.stopPropagation();
    if (this.openMenuId === id) {
      this.openMenuId = null;
    } else {
      const btn = event.currentTarget as HTMLElement;
      const rect = btn.getBoundingClientRect();
      this.menuPos = { top: rect.bottom + 4, left: rect.left };
      this.openMenuId = id;
    }
  }

  // Verificar se o usuário pode dar baixa no atendimento (não é módulo recepção)
  get podeFinalizarAtendimento(): boolean {
    return this.authService.getSelectedModule() !== 'recepcao';
  }

  constructor(private atendimentoService: AtendimentoService, private dialog: MatDialog, private router: Router, private authService: AuthService) {}

  ngOnInit() {
    // Inicializar com a data atual
    const hoje = new Date();
    this.dataInicial = hoje.toISOString().slice(0, 10);
    this.dataFinal = hoje.toISOString().slice(0, 10);
    this.carregarAtendimentos();
  }

  carregarAtendimentos() {
    this.loading = true;
    this.atendimentoService.buscarRelatorioAtendimentos({
      dataInicial: this.dataInicial,
      dataFinal: this.dataFinal
    }).subscribe((res: any) => {
      this.atendimentos = res.data || [];
      this.totalPaginas = Math.max(1, Math.ceil(this.atendimentosFiltradosSemPaginacao.length / this.itensPorPagina));
      this.paginaAtual = 1;
      this.loading = false;
    }, () => { this.loading = false; });
  }

  get atendimentosFiltradosSemPaginacao() {
    if (!this.filtro) return this.atendimentos;
    return this.atendimentos.filter(a =>
      a.paciente_nome?.toLowerCase().includes(this.filtro.toLowerCase()) ||
      a.motivo?.toLowerCase().includes(this.filtro.toLowerCase())
    );
  }

  get atendimentosFiltrados() {
    const inicio = (this.paginaAtual - 1) * this.itensPorPagina;
    const fim = inicio + this.itensPorPagina;
    return this.atendimentosFiltradosSemPaginacao.slice(inicio, fim);
  }

  paginaAnterior() {
    if (this.paginaAtual > 1) {
      this.paginaAtual--;
    }
  }

  proximaPagina() {
    if (this.paginaAtual < this.totalPaginas) {
      this.paginaAtual++;
    }
  }

  goToFirstPage() {
    this.paginaAtual = 1;
  }

  goToLastPage() {
    this.paginaAtual = this.totalPaginas;
  }

  onPageSizeChange(event: any) {
    this.itensPorPagina = +event.target.value;
    this.totalPaginas = Math.max(1, Math.ceil(this.atendimentosFiltradosSemPaginacao.length / this.itensPorPagina));
    this.paginaAtual = 1;
  }

  editarAtendimento(atendimento: any) {
    // Verificar se o atendimento foi abandonado
    if (atendimento.abandonado) {
      this.dialog.open(FeedbackDialogComponent, {
        data: {
          title: 'Edição não permitida',
          message: 'Não é possível editar um atendimento que foi abandonado.',
          type: 'warning'
        }
      });
      return;
    }

    // Navegar para o formulário de edição
    this.router.navigate(['/atendimentos/editar', atendimento.id]);
  }

  imprimirAtendimento(atendimento: any) {
    // Carregar brasão e converter para data URL para a janela de impressão
    const img = new window.Image();
    img.src = 'assets/brasao-alianca.png';
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d')!;
      ctx.drawImage(img, 0, 0);
      const logoDataUrl = canvas.toDataURL('image/png');

      const printWindow = window.open('', '_blank');
      if (!printWindow) {
        this.dialog.open(FeedbackDialogComponent, {
          data: {
            title: 'Erro',
            message: 'Não foi possível abrir a janela de impressão. Verifique se pop-ups estão bloqueados.',
            type: 'error'
          }
        });
        return;
      }

      // Helper para formatar sexo
      const formatarSexo = (s: string) => {
        if (s === 'M') return 'Masculino';
        if (s === 'F') return 'Feminino';
        if (s === 'I') return 'Ignorado';
        return s || '-';
      };

      // Helper para calcular idade
      const calcularIdade = (nascimento: string) => {
        if (!nascimento) return '-';
        const nasc = new Date(nascimento);
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

      // Helper para formatar valores vazios
      const formatarValor = (valor: any, padrao: string = 'Não informado') => {
        return (typeof valor === 'string' && valor.trim()) ? valor.trim() : padrao;
      };

      const formatarEstadoCivil = (valor: any) => {
        return (typeof valor === 'string' && valor.trim()) ? valor.trim() : 'Indefinido';
      };

      const printContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <title>Ficha de Atendimento - ${atendimento.paciente_nome}</title>
          <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body { font-family: Arial, sans-serif; margin: 20mm; color: #222; font-size: 11px; line-height: 1.4; }
            .inst-header { display: flex; align-items: center; margin-bottom: 8px; padding-bottom: 8px; border-bottom: 1px solid #ddd; }
            .brasao { width: 72px; height: 72px; margin-right: 14px; object-fit: contain; }
            .inst-name { font-size: 14px; font-weight: bold; margin-bottom: 2px; }
            .inst-dept, .inst-unit { font-size: 10px; margin-bottom: 2px; font-weight: 600; }
            .inst-addr { font-size: 9px; color: #555; margin-bottom: 1px; }
            .title-bar { text-align: center; font-size: 14px; font-weight: bold; padding: 8px 0; border-top: 2px solid #333; border-bottom: 2px solid #333; margin-bottom: 14px; letter-spacing: 1px; }
            .section { border: 1px solid #bbb; border-radius: 4px; padding: 12px 14px; margin-bottom: 12px; background-color: #fafafa; }
            .section-title { font-weight: bold; font-size: 11px; color: #1565c0; border-bottom: 2px solid #1565c0; padding-bottom: 5px; margin-bottom: 10px; text-transform: uppercase; letter-spacing: 0.5px; }
            .field { margin: 8px 0; font-size: 11px; line-height: 1.7; display: flex; }
            .field-inline { display: inline-flex; width: 50%; margin: 8px 0; }
            .field-inline.half { width: 50%; }
            .field-inline.third { width: 33.33%; }
            .row { display: flex; margin: 0 -4px; }
            .row .col { flex: 1; padding: 0 4px; }
            .label { font-weight: bold; color: #333; min-width: 120px; display: inline-block; }
            .value { color: #666; flex: 1; word-break: break-word; }
            .status-badge { display: inline-block; padding: 4px 12px; border-radius: 12px; font-size: 10px; font-weight: bold; text-transform: uppercase; }
            .status-badge.abandonado { background-color: #fee2e2; color: #dc2626; border: 1px solid #fca5a5; }
            .status-badge.concluido { background-color: #dcfce7; color: #16a34a; border: 1px solid #86efac; }
            .status-badge.recepcao { background-color: #fef3c7; color: #d97706; border: 1px solid #fcd34d; }
            .status-badge.triagem, .status-badge.encaminhado { background-color: #dbeafe; color: #2563eb; border: 1px solid #93c5fd; }
            .signature-area { margin-top: 50px; text-align: center; }
            .signature-line { width: 55%; border-top: 1px solid #666; margin: 0 auto 4px; }
            .signature-label { font-size: 10px; color: #666; }
            .footer { margin-top: 20px; text-align: center; font-size: 9px; color: #999; border-top: 1px solid #ddd; padding-top: 6px; }
            @media print { body { margin: 15mm; } .no-print { display: none; } }
          </style>
        </head>
        <body>
          <div class="inst-header">
            <img src="${logoDataUrl}" alt="Brasão Aliança" class="brasao" />
            <div>
              <div class="inst-name">PREFEITURA DA ALIANÇA</div>
              <div class="inst-dept">SECRETARIA MUNICIPAL DE SAÚDE</div>
              <div class="inst-unit">UNIDADE MISTA MUNICIPAL DE ALIANÇA</div>
              <div class="inst-addr">Rua Marechal Deodoro, s/n - Aliança - PE - CEP: 55.890-000</div>
              <div class="inst-addr">Fones: 3637.1340 / 3637.1388 | E-mail: unidademista2009@hotmail.com</div>
            </div>
          </div>

          <div class="title-bar">FICHA DE ATENDIMENTO</div>

          <div class="section">
            <div class="section-title">Dados Pessoais do Paciente</div>
            <div class="field"><span class="label">Nome:</span> <span class="value">${formatarValor(atendimento.paciente_nome)}</span></div>
            <div class="field"><span class="label">Nome da Mãe:</span> <span class="value">${formatarValor(atendimento.paciente_mae)}</span></div>
            
            <div>
              <div class="col"><span class="label">Data Nasc.:</span> <span class="value">${atendimento.paciente_nascimento ? new Date(atendimento.paciente_nascimento).toLocaleDateString('pt-BR') : 'Não informado'}</span></div>
              <div class="col"><span class="label">Idade:</span> <span class="value">${calcularIdade(atendimento.paciente_nascimento)}</span></div>
              <div class="col"><span class="label">Sexo:</span> <span class="value">${formatarSexo(atendimento.paciente_sexo)}</span></div>
            </div>
            
            <div>
              <div class="col"><span class="label">Estado Civil:</span> <span class="value">${formatarEstadoCivil(atendimento.paciente_estado_civil)}</span></div>
              <div class="col"><span class="label">Profissão:</span> <span class="value">${formatarValor(atendimento.paciente_profissao)}</span></div>
            </div>
            
            <div>
              <div class="col"><span class="label">Telefone:</span> <span class="value">${formatarValor(atendimento.paciente_telefone)}</span></div>
              <div class="col"><span class="label">Escolaridade:</span> <span class="value">${formatarValor(atendimento.paciente_escolaridade)}</span></div>
            </div>
            
            <div>
              <div class="col"><span class="label">Raça/Cor:</span> <span class="value">${formatarValor(atendimento.paciente_raca)}</span></div>
              <div class="col"><span class="label">Cartão SUS:</span> <span class="value">${formatarValor(atendimento.paciente_sus)}</span></div>
            </div>
          </div>

          <div class="section">
            <div class="section-title">Endereço</div>
            <div class="field"><span class="label">Endereço:</span> <span class="value">${formatarValor(atendimento.paciente_endereco)}</span></div>
            
            <div>
              <div class="col"><span class="label">Bairro:</span> <span class="value">${formatarValor(atendimento.paciente_bairro)}</span></div>
              <div class="col"><span class="label">Município:</span> <span class="value">${formatarValor(atendimento.paciente_municipio)}</span></div>
            </div>
            
            <div>
              <div class="col"><span class="label">UF:</span> <span class="value">${formatarValor(atendimento.paciente_uf)}</span></div>
              <div class="col"><span class="label">CEP:</span> <span class="value">${formatarValor(atendimento.paciente_cep)}</span></div>
            </div>
          </div>

          <div class="section">
            <div class="section-title">Dados do Atendimento</div>
            <div>
              <div class="col"><span class="label">Data/Hora:</span> <span class="value">${new Date(atendimento.data_hora_atendimento).toLocaleString('pt-BR')}</span></div>
              <div class="col"><span class="label">Status:</span> 
                <span class="status-badge ${atendimento.abandonado ? 'abandonado' : atendimento.status}">
                  ${atendimento.abandonado ? 'ABANDONADO' : atendimento.status?.toUpperCase()}
                </span>
              </div>
            </div>
            <div class="field"><span class="label">Motivo:</span> <span class="value">${formatarValor(atendimento.motivo)}</span></div>
            ${atendimento.observacoes ? '<div class="field"><span class="label">Observações:</span> <span class="value">' + atendimento.observacoes + '</span></div>' : ''}
          </div>

          ${atendimento.acompanhante || atendimento.procedencia ? '<div class="section"><div class="section-title">Informações Complementares</div>' + (atendimento.acompanhante ? '<div class="field"><span class="label">Acompanhante:</span> <span class="value">' + atendimento.acompanhante + '</span></div>' : '') + (atendimento.procedencia ? '<div class="field"><span class="label">Procedência:</span> <span class="value">' + atendimento.procedencia + '</span></div>' : '') + '</div>' : ''}

          ${atendimento.abandonado && atendimento.motivo_abandono ? '<div class="section"><div class="section-title">Registro de Abandono</div><div class="field"><span class="label">Motivo do Abandono:</span> <span class="value">' + atendimento.motivo_abandono + '</span></div></div>' : ''}

          <div class="signature-area">
            <div class="signature-line"></div>
            <div class="signature-label">Assinatura do Profissional</div>
          </div>

          <div class="footer">
            <div>Gerado em: ${new Date().toLocaleDateString('pt-BR')} às ${new Date().toLocaleTimeString('pt-BR')}</div>
            <div>Sistema e-Prontuário - Unidade Mista Municipal de Aliança-PE</div>
          </div>

          <script>
            window.onload = function() {
              window.print();
              window.onafterprint = function() { window.close(); };
            }
          </script>
        </body>
        </html>
      `;

      printWindow.document.write(printContent);
      printWindow.document.close();
    };
  }

  async gerarAtendimentoPDF(atendimento: any) {
    try {
      // Importar jsPDF dinamicamente
      let jsPDF;
      try {
        const jsPDFModule = await import('jspdf');
        jsPDF = jsPDFModule.default;
      } catch (importError) {
        if ((window as any).jsPDF) {
          jsPDF = (window as any).jsPDF;
        } else {
          throw new Error('jsPDF não encontrado');
        }
      }

      if (!jsPDF) {
        const feedbackRef = this.dialog.open(FeedbackDialogComponent, {
          data: { title: 'Erro', message: 'Biblioteca de geração de PDF não encontrada.', type: 'error' }
        });
        setTimeout(() => feedbackRef.close(), 3000);
        return;
      }

      // Carregar brasão para o cabeçalho institucional
      const brasao = await new Promise<HTMLImageElement>((resolve, reject) => {
        const image = new window.Image();
        image.onload = () => resolve(image);
        image.onerror = () => reject(new Error('Erro ao carregar brasão'));
        image.src = 'assets/brasao-alianca.png';
      });

      const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
      const pageWidth = 210;

      // Cabeçalho institucional (igual ficha em branco)
      const logoX = 10;
      const logoY = 10;
      const logoH = 32;
      const logoW = 32;
      const textX = logoX + logoW + 7;
      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.addImage(brasao, 'PNG', logoX, logoY, logoW, logoH);
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
      doc.text(titulo, (pageWidth - tituloW) / 2, 42);

      // Helper para formatar valores
      const formatarValor = (valor: any, padrao: string = 'Não informado') => {
        return (typeof valor === 'string' && valor.trim()) ? valor.trim() : padrao;
      };

      const formatarEstadoCivil = (valor: any) => {
        return (typeof valor === 'string' && valor.trim()) ? valor.trim() : 'Não informado';
      };

      // Helper para formatar sexo
      const formatarSexo = (s: string) => {
        if (s === 'M') return 'Masculino';
        if (s === 'F') return 'Feminino';
        if (s === 'I') return 'Ignorado';
        return s || 'Não informado';
      };

      // Helper para calcular idade
      const calcularIdade = (nascimento: string) => {
        if (!nascimento) return 'Não informado';
        const nasc = new Date(nascimento);
        if (isNaN(nasc.getTime())) return 'Data inválida';
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

      // Campos
      doc.setFontSize(10);
      let y = 57;
      const marginX = 20;
      const labelX = marginX + 2;
      const valueX = marginX + 50;
      const lineH = 5;

      // ========== SEÇÃO: DADOS PESSOAIS DO PACIENTE ==========
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(11);
      doc.text('DADOS PESSOAIS DO PACIENTE', labelX, y);
      y += 3;
      doc.setLineWidth(0.5);
      doc.line(marginX, y, marginX + 170, y);
      y += 8;

      doc.setFontSize(9);

      // Nome
      doc.setFont('helvetica', 'bold');
      doc.text('Nome:', labelX, y);
      doc.setFont('helvetica', 'normal');
      doc.text(formatarValor(atendimento.paciente_nome), valueX, y);
      y += lineH + 1;

      // Nome da Mãe
      doc.setFont('helvetica', 'bold');
      doc.text('Nome da Mãe:', labelX, y);
      doc.setFont('helvetica', 'normal');
      doc.text(formatarValor(atendimento.paciente_mae), valueX, y);
      y += lineH + 1;

      // Data de Nascimento
      doc.setFont('helvetica', 'bold');
      doc.text('Data Nasc.:', labelX, y);
      doc.setFont('helvetica', 'normal');
      doc.text(atendimento.paciente_nascimento ? new Date(atendimento.paciente_nascimento).toLocaleDateString('pt-BR') : 'Não informado', valueX, y);
      y += lineH + 1;

      // Idade
      doc.setFont('helvetica', 'bold');
      doc.text('Idade:', labelX, y);
      doc.setFont('helvetica', 'normal');
      doc.text(calcularIdade(atendimento.paciente_nascimento), valueX, y);
      y += lineH + 1;

      // Sexo
      doc.setFont('helvetica', 'bold');
      doc.text('Sexo:', labelX, y);
      doc.setFont('helvetica', 'normal');
      doc.text(formatarSexo(atendimento.paciente_sexo), valueX, y);
      y += lineH + 1;

      // Estado Civil
      doc.setFont('helvetica', 'bold');
      doc.text('Estado Civil:', labelX, y);
      doc.setFont('helvetica', 'normal');
      doc.text(formatarEstadoCivil(atendimento.paciente_estado_civil), valueX, y);
      y += lineH + 1;

      // Profissão
      doc.setFont('helvetica', 'bold');
      doc.text('Profissão:', labelX, y);
      doc.setFont('helvetica', 'normal');
      doc.text(formatarValor(atendimento.paciente_profissao), valueX, y);
      y += lineH + 1;

      // Telefone
      doc.setFont('helvetica', 'bold');
      doc.text('Telefone:', labelX, y);
      doc.setFont('helvetica', 'normal');
      doc.text(formatarValor(atendimento.paciente_telefone), valueX, y);
      y += lineH + 1;

      // Escolaridade
      doc.setFont('helvetica', 'bold');
      doc.text('Escolaridade:', labelX, y);
      doc.setFont('helvetica', 'normal');
      doc.text(formatarValor(atendimento.paciente_escolaridade), valueX, y);
      y += lineH + 1;

      // Raça/Cor
      doc.setFont('helvetica', 'bold');
      doc.text('Raça/Cor:', labelX, y);
      doc.setFont('helvetica', 'normal');
      doc.text(formatarValor(atendimento.paciente_raca), valueX, y);
      y += lineH + 1;

      // Cartão SUS
      doc.setFont('helvetica', 'bold');
      doc.text('Cartão SUS:', labelX, y);
      doc.setFont('helvetica', 'normal');
      doc.text(formatarValor(atendimento.paciente_sus), valueX, y);
      y += lineH + 3;

      // ========== SEÇÃO: ENDEREÇO ==========
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(11);
      doc.text('ENDEREÇO', labelX, y);
      y += 3;
      doc.setLineWidth(0.5);
      doc.line(marginX, y, marginX + 170, y);
      y += 8;

      doc.setFontSize(9);

      // Endereço
      doc.setFont('helvetica', 'bold');
      doc.text('Endereço:', labelX, y);
      doc.setFont('helvetica', 'normal');
      doc.text(formatarValor(atendimento.paciente_endereco), valueX, y);
      y += lineH + 1;

      // Bairro
      doc.setFont('helvetica', 'bold');
      doc.text('Bairro:', labelX, y);
      doc.setFont('helvetica', 'normal');
      doc.text(formatarValor(atendimento.paciente_bairro), valueX, y);
      y += lineH + 1;

      // Município
      doc.setFont('helvetica', 'bold');
      doc.text('Município:', labelX, y);
      doc.setFont('helvetica', 'normal');
      doc.text(formatarValor(atendimento.paciente_municipio), valueX, y);
      y += lineH + 1;

      // UF
      doc.setFont('helvetica', 'bold');
      doc.text('UF:', labelX, y);
      doc.setFont('helvetica', 'normal');
      doc.text(formatarValor(atendimento.paciente_uf), valueX, y);
      y += lineH + 1;

      // CEP
      doc.setFont('helvetica', 'bold');
      doc.text('CEP:', labelX, y);
      doc.setFont('helvetica', 'normal');
      doc.text(formatarValor(atendimento.paciente_cep), valueX, y);
      y += lineH + 3;

      // ========== SEÇÃO: DADOS DO ATENDIMENTO ==========
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(11);
      doc.text('DADOS DO ATENDIMENTO', labelX, y);
      y += 3;
      doc.setLineWidth(0.5);
      doc.line(marginX, y, marginX + 170, y);
      y += 8;

      doc.setFontSize(9);

      // Data/Hora
      doc.setFont('helvetica', 'bold');
      doc.text('Data/Hora:', labelX, y);
      doc.setFont('helvetica', 'normal');
      doc.text(new Date(atendimento.data_hora_atendimento).toLocaleString('pt-BR'), valueX, y);
      y += lineH + 1;

      // Status
      doc.setFont('helvetica', 'bold');
      doc.text('Status:', labelX, y);
      doc.setFont('helvetica', 'normal');
      doc.text(atendimento.abandonado ? 'ABANDONADO' : (atendimento.status?.toUpperCase() || ''), valueX, y);
      y += lineH + 1;

      // Motivo
      doc.setFont('helvetica', 'bold');
      doc.text('Motivo:', labelX, y);
      doc.setFont('helvetica', 'normal');
      const motivoText = formatarValor(atendimento.motivo);
      doc.text(motivoText, valueX, y, { maxWidth: 120 });
      y += lineH + 1;

      // Observações
      if (atendimento.observacoes) {
        doc.setFont('helvetica', 'bold');
        doc.text('Observações:', labelX, y);
        doc.setFont('helvetica', 'normal');
        doc.text(atendimento.observacoes, valueX, y, { maxWidth: 120 });
        y += lineH + 1;
      }

      // Acompanhante
      if (atendimento.acompanhante) {
        doc.setFont('helvetica', 'bold');
        doc.text('Acompanhante:', labelX, y);
        doc.setFont('helvetica', 'normal');
        doc.text(atendimento.acompanhante, valueX, y);
        y += lineH + 1;
      }

      // Procedência
      if (atendimento.procedencia) {
        doc.setFont('helvetica', 'bold');
        doc.text('Procedência:', labelX, y);
        doc.setFont('helvetica', 'normal');
        doc.text(atendimento.procedencia, valueX, y);
        y += lineH + 1;
      }

      // Motivo do Abandono
      if (atendimento.abandonado && atendimento.motivo_abandono) {
        doc.setFont('helvetica', 'bold');
        doc.text('Motivo do Abandono:', labelX, y);
        doc.setFont('helvetica', 'normal');
        doc.text(atendimento.motivo_abandono, valueX, y);
        y += lineH + 1;
      }

      // Assinatura do profissional
      y += 10;
      doc.setFontSize(9);
      doc.setFont('helvetica', 'bold');
      doc.text('Assinatura do Profissional', marginX + 5, y);
      doc.setDrawColor(0, 0, 0);
      doc.setLineWidth(0.5);
      doc.line(marginX + 45, y + 3, marginX + 170 - 15, y + 3);

      // Rodapé
      doc.setFontSize(8);
      doc.setTextColor(150);
      const pageHeight = doc.internal.pageSize.height;
      const rodape = 'Gerado em: ' + new Date().toLocaleDateString('pt-BR') + ' às ' + new Date().toLocaleTimeString('pt-BR') + ' - Sistema e-Prontuário Aliança-PE';
      const rodapeW = doc.getTextWidth(rodape);
      doc.text(rodape, (pageWidth - rodapeW) / 2, pageHeight - 10);

      doc.save(`atendimento_${atendimento.paciente_nome}_${atendimento.id}.pdf`);

      const feedbackRef = this.dialog.open(FeedbackDialogComponent, {
        data: { title: 'Sucesso', message: 'PDF gerado com sucesso!', type: 'success' }
      });
      setTimeout(() => feedbackRef.close(), 2000);

    } catch (error: any) {
      console.error('Erro ao gerar PDF:', error);
      const feedbackRef = this.dialog.open(FeedbackDialogComponent, {
        data: { title: 'Erro', message: `Erro ao gerar PDF: ${error?.message || 'Erro desconhecido'}`, type: 'error' }
      });
      setTimeout(() => feedbackRef.close(), 3000);
    }
  }

  registrarAbandono(atendimento: any) {
    // Criar dialog customizado para abandono
    const dialogRef = this.dialog.open(AbandonoDialogComponent, {
      data: {
        atendimento: atendimento
      },
      width: '500px'
    });

    dialogRef.afterClosed().subscribe({
      next: (result) => {
        if (result) {
          this.atendimentoService.registrarAbandono(atendimento.id, result).subscribe({
            next: () => {
              this.carregarAtendimentos();
              const feedbackRef = this.dialog.open(FeedbackDialogComponent, {
                data: {
                  title: 'Abandono Registrado',
                  message: 'Atendimento marcado como abandonado com sucesso!',
                  type: 'success'
                }
              });
              setTimeout(() => feedbackRef.close(), 2000);
            },
            error: (error: any) => {
              console.error('Erro ao registrar abandono:', error);
              const feedbackRef = this.dialog.open(FeedbackDialogComponent, {
                data: {
                  title: 'Erro',
                  message: 'Falha ao registrar abandono. Tente novamente.',
                  type: 'error'
                }
              });
              setTimeout(() => feedbackRef.close(), 2500);
            }
          });
        }
      },
      error: (error: any) => {
        console.error('Erro ao abrir dialog de abandono:', error);
      }
    });
  }

  removerAtendimento(id: number) {
    const dialogRef = this.dialog.open(ConfirmDialogComponent, {
      data: {
        title: 'Confirmar exclusão',
        message: 'Deseja realmente remover este atendimento?'
      }
    });
    dialogRef.afterClosed().subscribe({
      next: (result) => {
        if (result) {
          this.atendimentoService.removerAtendimento(id).subscribe({
            next: () => {
              this.carregarAtendimentos();
              const feedbackRef = this.dialog.open(FeedbackDialogComponent, {
                data: {
                  title: 'Sucesso',
                  message: 'Atendimento excluído com sucesso!',
                  type: 'success'
                }
              });
              setTimeout(() => feedbackRef.close(), 1800);
            },
            error: () => {
              const feedbackRef = this.dialog.open(FeedbackDialogComponent, {
                data: {
                  title: 'Erro',
                  message: 'Falha ao excluir atendimento. Tente novamente.',
                  type: 'error'
                }
              });
              setTimeout(() => feedbackRef.close(), 2200);
            }
          });
        }
      },
      error: (error: any) => {
        console.error('Erro ao abrir dialog de confirmação de exclusão:', error);
      }
    });
  }

  finalizarAtendimento(atendimento: any) {
    // Confirmar finalização
    const dialogRef = this.dialog.open(ConfirmDialogComponent, {
      data: {
        title: 'Finalizar Atendimento',
        message: `Confirma a finalização do atendimento do paciente ${atendimento.paciente_nome}?`
      }
    });

    dialogRef.afterClosed().subscribe({
      next: (result) => {
        if (result) {
          // Atualizar status para 'concluido', mantendo outros dados
          const dadosAtualizacao = {
            motivo: atendimento.motivo,
            observacoes: atendimento.observacoes,
            status: 'concluido',
            procedencia: atendimento.procedencia,
            acompanhante: atendimento.acompanhante
          };

          this.atendimentoService.atualizarAtendimento(atendimento.id, dadosAtualizacao).subscribe({
            next: () => {
              this.dialog.open(FeedbackDialogComponent, {
                data: {
                  title: 'Sucesso',
                  message: 'Atendimento finalizado com sucesso!',
                  type: 'success'
                }
              });
              // Recarregar lista
              this.carregarAtendimentos();
            },
            error: (err) => {
              this.dialog.open(FeedbackDialogComponent, {
                data: {
                  title: 'Erro',
                  message: err?.error?.message || 'Erro ao finalizar atendimento.',
                  type: 'error'
                }
              });
            }
          });
        }
      },
      error: (error: any) => {
        console.error('Erro ao abrir dialog de confirmação de finalização:', error);
      }
    });
  }

  toggleFiltroData() {
    this.mostrarFiltroData = !this.mostrarFiltroData;
  }

  aplicarFiltroData() {
    if (this.dataInicial && this.dataFinal) {
      if (this.dataInicial > this.dataFinal) {
        this.dialog.open(FeedbackDialogComponent, {
          data: {
            title: 'Data inválida',
            message: 'A data inicial não pode ser maior que a data final.',
            type: 'warning'
          }
        });
        return;
      }
      this.carregarAtendimentos();
    }
  }

  limparFiltroData() {
    const hoje = new Date();
    this.dataInicial = hoje.toISOString().slice(0, 10);
    this.dataFinal = hoje.toISOString().slice(0, 10);
    this.carregarAtendimentos();
  }

  formatarPeriodo(): string {
    if (this.dataInicial === this.dataFinal) {
      return new Date(this.dataInicial + 'T00:00:00').toLocaleDateString('pt-BR');
    } else {
      const inicio = new Date(this.dataInicial + 'T00:00:00').toLocaleDateString('pt-BR');
      const fim = new Date(this.dataFinal + 'T00:00:00').toLocaleDateString('pt-BR');
      return `${inicio} até ${fim}`;
    }
  }
}
