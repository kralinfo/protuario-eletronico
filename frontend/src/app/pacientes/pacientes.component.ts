import { Component, OnInit, ViewChild, AfterViewInit, ChangeDetectorRef, HostListener } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { environment } from '../../environments/environment';
import { AuthService } from '../auth/auth.service';
import * as jsPDF from 'jspdf';
import { MatDialog } from '@angular/material/dialog';
import { HistoricoAtendimentosComponent } from './historico-atendimentos.component';
import { HistoricoPacienteTimelineComponent } from './historico-paciente-timeline.component';
import { RegistrarAtendimentoComponent } from '../atendimento/registrar-atendimento.component';
import { FeedbackDialogComponent } from '../shared/feedback-dialog/feedback-dialog.component';

export interface Paciente {
  id?: number;
  nome: string;
  mae: string;
  nascimento: string;
  sexo: string;
  estadoCivil?: string;
  profissao?: string;
  escolaridade?: string;
  telefone?: string;
  sus?: string;
  raca: string;
  endereco: string;
  bairro: string;
  municipio: string;
  uf: string;
  cep: string;
  acompanhante: string;
  procedencia: string;
}

import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { PacientesFormComponent } from './pacientes-form.component';
import { PaginationComponent } from '../shared/components/pagination/pagination.component';

@Component({
    selector: 'app-pacientes',
    templateUrl: './pacientes.component.html',
    styleUrls: ['./pacientes.component.scss', '../shared/styles/table-footer.css'],
    standalone: true,
    imports: [CommonModule, FormsModule, PacientesFormComponent, PaginationComponent]
})
export class PacientesComponent implements OnInit, AfterViewInit {

  imprimirFichaPacienteEmBranco() {
    // Carrega a imagem do brasão dinamicamente do assets e gera o PDF após carregamento
    const img = new window.Image();
    img.src = 'assets/brasao-alianca.png';
    img.onload = () => {
      const doc = new jsPDF.jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });

      // Cabeçalho institucional (igual ficha de atendimento)
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

      // Título
      doc.setFontSize(13);
      doc.setFont('helvetica', 'bold');
      // Centralizar o texto no centro da folha A4 (210mm de largura)
      const fichaTitulo = 'FICHA DE CADASTRO DO PACIENTE';
      const fichaTituloW = doc.getTextWidth(fichaTitulo);
      const pageWidth = 210; // largura da folha A4 em mm
      const fichaTituloX = (pageWidth - fichaTituloW) / 2;
      doc.text(fichaTitulo, fichaTituloX, 40);

      // Quadro principal externo
      const marginX = 20;
      const quadroW = 180; // aumentado de 170 para 180
      const quadroH = 235; // aumentado de 215 para 235

      doc.rect(marginX, 45, quadroW, quadroH, 'S');

      // Variáveis de altura e espaçamento dos campos (precisam estar antes do uso)
      const fieldH = 8;
      const gapY = 10;
      const labelX = marginX + 7;
      const fieldX = marginX + 50;
      const fieldW = quadroW - 60;

      // Título do quadro

      // Título do quadro e Cartão do SUS alinhado à direita

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(11);
      const dadosPessoaisY = 52;
      doc.text('DADOS PESSOAIS', marginX + 5, dadosPessoaisY);
      // Cartão do SUS apenas como texto no topo, alinhado à direita
      doc.setFontSize(9);
      doc.setFont('helvetica', 'bold');
      const susLabel = 'Cartão do SUS:';
      const susLabelW = doc.getTextWidth(susLabel);
      const susFieldW = 40;
      const susFieldX = fieldX + fieldW - susFieldW;
      doc.text(susLabel, susFieldX - susLabelW - 2, dadosPessoaisY);

      // Linha horizontal após título
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.line(marginX, 55, marginX + quadroW, 55);

      let y = 67;


      // Campos principais
      // Nome
      doc.setFont('helvetica', 'bold');
      doc.text('Nome:', labelX, y);
      doc.setFont('helvetica', 'normal');
      doc.rect(fieldX, y - fieldH + 3, fieldW, fieldH, 'S');
      y += gapY + fieldH;

      // Nome da Mãe
      doc.setFont('helvetica', 'bold');
      doc.text('Nome da Mãe:', labelX, y);
      doc.setFont('helvetica', 'normal');
      doc.rect(fieldX, y - fieldH + 3, fieldW, fieldH, 'S');
      y += gapY + fieldH;


      // Data de Nascimento, Idade e Sexo na mesma linha (Sexo alinhado ao final dos campos)
      doc.setFont('helvetica', 'bold');
      doc.text('Data de Nascimento:', labelX, y);
      doc.setFont('helvetica', 'normal');
      const nascW = 28;
      doc.rect(fieldX, y - fieldH + 3, nascW, fieldH, 'S');
      doc.setFont('helvetica', 'bold');
      const idadeLabelX = fieldX + nascW + 6;
      doc.text('Idade:', idadeLabelX, y);
      doc.setFont('helvetica', 'normal');
      const idadeFieldX = idadeLabelX + 13;
      doc.rect(idadeFieldX, y - fieldH + 3, 15, fieldH, 'S');
      doc.setFont('helvetica', 'bold');
      const sexoLabelX = idadeFieldX + 15 + 6;
      doc.text('Sexo:', sexoLabelX, y);
      doc.setFont('helvetica', 'normal');
      // O campo Sexo vai até o final dos campos principais (fieldX + fieldW)
      const sexoFieldX = sexoLabelX + 13;
      const sexoW = (fieldX + fieldW) - sexoFieldX;
      doc.rect(sexoFieldX, y - fieldH + 3, sexoW, fieldH, 'S');
      y += gapY + fieldH;


      // Estado Civil na linha


      // Estado Civil

      // Estado Civil e Profissão na mesma linha
      doc.setFont('helvetica', 'bold');
      doc.text('Estado Civil:', labelX, y);
      doc.setFont('helvetica', 'normal');
      const estadoCivilW = 40;
      doc.rect(fieldX, y - fieldH + 3, estadoCivilW, fieldH, 'S');

      // Profissão ao lado
      const profissaoLabelX = fieldX + estadoCivilW + 8;
      doc.setFont('helvetica', 'bold');
      doc.text('Profissão:', profissaoLabelX, y);
      doc.setFont('helvetica', 'normal');
      const profissaoFieldX = profissaoLabelX + 22;
      const profissaoW = (fieldX + fieldW) - profissaoFieldX;
      doc.rect(profissaoFieldX, y - fieldH + 3, profissaoW, fieldH, 'S');
      y += gapY + fieldH;

      // Telefone e Escolaridade na mesma linha
      doc.setFont('helvetica', 'bold');
      doc.text('Telefone:', labelX, y);
      doc.setFont('helvetica', 'normal');
      const telefoneW = 50;
      doc.rect(fieldX, y - fieldH + 3, telefoneW, fieldH, 'S');

      // Escolaridade ao lado
      const escolaridadeLabelX = fieldX + telefoneW + 8;
      doc.setFont('helvetica', 'bold');
      doc.text('Escolaridade:', escolaridadeLabelX, y);
      doc.setFont('helvetica', 'normal');
      const escolaridadeFieldX = escolaridadeLabelX + 28;
      const escolaridadeW = (fieldX + fieldW) - escolaridadeFieldX;
      doc.rect(escolaridadeFieldX, y - fieldH + 3, escolaridadeW, fieldH, 'S');
      y += gapY + fieldH;

      // Demais campos (sem repetição de Profissão, Telefone e Escolaridade)
      // Raça/Cor com largura igual ao campo Telefone
      doc.setFont('helvetica', 'bold');
      doc.text('Raça/Cor:', labelX, y);
      doc.setFont('helvetica', 'normal');
      doc.rect(fieldX, y - fieldH + 3, 50, fieldH, 'S');
      y += gapY + fieldH;

      // Demais campos
      // Endereço (linha única)
      doc.setFont('helvetica', 'bold');
      doc.text('Endereço:', labelX, y);
      doc.setFont('helvetica', 'normal');
      doc.rect(fieldX, y - fieldH + 3, fieldW, fieldH, 'S');
      y += gapY + fieldH;

      // Bairro e CEP na mesma linha

      // Bairro e UF na mesma linha
      doc.setFont('helvetica', 'bold');
      doc.text('Bairro:', labelX, y);
      doc.setFont('helvetica', 'normal');
      const bairroW = 60; // diminuído para 60mm
      doc.rect(fieldX, y - fieldH + 3, bairroW, fieldH, 'S');

      // O campo UF deve terminar alinhado com o final dos demais campos (fieldX + fieldW)
      const ufW = 18; // mantém 18mm
      const ufFieldX = fieldX + fieldW - ufW;
      const ufLabelX = ufFieldX - 10; // espaço de 10mm antes do campo
      doc.setFont('helvetica', 'bold');
      doc.text('UF:', ufLabelX, y);
      doc.setFont('helvetica', 'normal');
      doc.rect(ufFieldX, y - fieldH + 3, ufW, fieldH, 'S');
      y += gapY + fieldH;

      // Demais campos
      // Município e CEP na mesma linha
      // Município e UF na mesma linha

      // Município e CEP na mesma linha
      doc.setFont('helvetica', 'bold');
      doc.text('Município:', labelX, y);
      doc.setFont('helvetica', 'normal');
      const municipioW = 60;
      doc.rect(fieldX, y - fieldH + 3, municipioW, fieldH, 'S');

      const cep2LabelX = fieldX + municipioW + 8;
      doc.setFont('helvetica', 'bold');
      doc.text('CEP:', cep2LabelX, y);
      doc.setFont('helvetica', 'normal');
      const cep2FieldX = cep2LabelX + 13;
      const cep2W = (fieldX + fieldW) - cep2FieldX;
      doc.rect(cep2FieldX, y - fieldH + 3, cep2W, fieldH, 'S');
      y += gapY + fieldH;

      // UF em linha separada


      // Demais campos
      const camposRestantes = [
        'Acompanhante',
        'Procedência'
      ];
      camposRestantes.forEach((campo) => {
        doc.setFont('helvetica', 'bold');
        doc.text(campo + ':', labelX, y);
        doc.setFont('helvetica', 'normal');
        doc.rect(fieldX, y - fieldH + 3, fieldW, fieldH, 'S');
        y += gapY + fieldH;
      });

      // Rodapé
      // Assinatura do profissional mais próxima da borda inferior do quadro
      const assinaturaLabelX = marginX + 5;
      const assinaturaY = 45 + quadroH - 7; // agora 7mm acima da base do quadro
      const assinaturaLinhaX1 = assinaturaLabelX + 45;
      const assinaturaLinhaX2 = marginX + quadroW - 10;
      doc.setFontSize(9);
      doc.setTextColor(100);
      doc.text('Assinatura do Profissional:', assinaturaLabelX, assinaturaY);
      doc.setDrawColor(100);
      doc.line(assinaturaLinhaX1, assinaturaY + 1, assinaturaLinhaX2, assinaturaY + 1);

      doc.save('ficha-paciente-em-branco.pdf');
    };
  }
  pageSizeOptions = [10, 25, 50];
  pageSize = 10;
  currentPage = 0;
  get totalPages() {
    return Math.ceil(this.filteredPacientes.length / this.pageSize);
  }
  get paginatedPacientes() {
    const start = this.currentPage * this.pageSize;
    return this.filteredPacientes.slice(start, start + this.pageSize);
  }
  onPageSizeChange(event: Event) {
    const value = (event.target as HTMLSelectElement).value;
    this.pageSize = Number(value);
    this.currentPage = 0;
  }
  goToFirstPage() { this.currentPage = 0; }
  goToPreviousPage() { if (this.currentPage > 0) this.currentPage--; }
  goToNextPage() { if (this.currentPage < this.totalPages - 1) this.currentPage++; }
  goToLastPage() { this.currentPage = this.totalPages - 1; }

  onPageChange(pageOneBased: number) {
    const page = Math.max(0, (pageOneBased || 1) - 1);
    this.currentPage = page;
  }
  pacientes: Paciente[] = [];
  filteredPacientes: Paciente[] = [];
  novoPaciente: Paciente = {
    nome: '',
    mae: '',
    nascimento: '',
    sexo: '',
    estadoCivil: '',
    profissao: '',
    escolaridade: '',
    raca: '',
    endereco: '',
    bairro: '',
    municipio: '',
    uf: '',
    cep: '',
    acompanhante: '',
    procedencia: ''
  };
  pacienteEditando: Paciente | null = null;
  filtroNome: string = '';
  exibirFormulario = false;
  loading = false;
  openMenuId: number | null = null;
  menuPos = { top: 0, left: 0 };

  @HostListener('document:click')
  onDocumentClick() {
    this.openMenuId = null;
  }

  toggleMenu(event: Event, id: number | undefined) {
    event.stopPropagation();
    if (id === undefined) return;
    if (this.openMenuId === id) {
      this.openMenuId = null;
    } else {
      const btn = event.currentTarget as HTMLElement;
      const rect = btn.getBoundingClientRect();
      this.menuPos = { top: rect.bottom + 4, left: rect.left };
      this.openMenuId = id;
    }
  }
  colunas = [
    'acoes', 'nome', 'mae', 'nascimento', 'sexo', 'estadoCivil', 'profissao', 'escolaridade', 'raca',
    'endereco', 'bairro', 'municipio', 'uf', 'cep', 'acompanhante', 'procedencia'
  ];
  apiUrl = environment.apiUrl + '/pacientes'; // já está correto

  // Removido MatPaginator e MatTableDataSource
  currentUser: any = null;

  constructor(private http: HttpClient, private router: Router, private authService: AuthService, private dialog: MatDialog, private cdr: ChangeDetectorRef) {}

  abrirRelatorios() {
    this.router.navigate(['/relatorios']);
  }

  ngOnInit() {
    this.listarPacientes();
    // Carregar informações do usuário atual
    this.authService.user$.subscribe(user => {
      this.currentUser = user;
    });
  }

  ngAfterViewInit() {
    // Removido Angular Material paginator
  }

  listarPacientes() {
    this.loading = true;
    this.http.get<Paciente[]>(this.apiUrl).subscribe({
      next: (pacientes) => {
        this.pacientes = pacientes;
        this.filteredPacientes = pacientes;
        this.loading = false;
      },
      error: (error) => {
        console.error('Erro ao carregar pacientes:', error);
        this.loading = false;
      }
    });
  }

  mostrarFormularioCadastro() {
    this.exibirFormulario = true;
    this.pacienteEditando = null;
    this.novoPaciente = { nome: '', mae: '', nascimento: '', sexo: '', estadoCivil: '', profissao: '', escolaridade: '', raca: '', endereco: '', bairro: '', municipio: '', uf: '', cep: '', acompanhante: '', procedencia: '' };
  }

  adicionarPaciente() {
    if (this.pacienteEditando && this.pacienteEditando.id) {
      // Confirmação antes de atualizar
      if (confirm('Tem certeza que deseja atualizar este registro?')) {
        this.loading = true;
        this.http.put<Paciente>(`${this.apiUrl}/${this.pacienteEditando.id}`, this.novoPaciente).subscribe({
          next: () => {
            this.novoPaciente = { nome: '', mae: '', nascimento: '', sexo: '', estadoCivil: '', profissao: '', escolaridade: '', raca: '', endereco: '', bairro: '', municipio: '', uf: '', cep: '', acompanhante: '', procedencia: '' };
            this.pacienteEditando = null;
            this.exibirFormulario = false;
            this.listarPacientes();
          },
          error: (error) => {
            console.error('Erro ao atualizar paciente:', error);
            this.loading = false;
          }
        });
      }
    } else {
      // Adicionar novo paciente
      this.loading = true;
      this.http.post<Paciente>(this.apiUrl, this.novoPaciente).subscribe({
        next: () => {
          this.novoPaciente = { nome: '', mae: '', nascimento: '', sexo: '', estadoCivil: '', profissao: '', escolaridade: '', raca: '', endereco: '', bairro: '', municipio: '', uf: '', cep: '', acompanhante: '', procedencia: '' };
          this.exibirFormulario = false;
          this.listarPacientes();
        },
        error: (error) => {
          console.error('Erro ao adicionar paciente:', error);
          this.loading = false;
        }
      });
    }
  }

  editarPaciente(paciente: Paciente) {
    this.pacienteEditando = paciente;
    this.exibirFormulario = true;
  }

  removerPaciente(id: number) {
    if (confirm('Tem certeza que deseja remover este paciente?')) {
      this.loading = true;
      this.http.delete(`${this.apiUrl}/${id}`).subscribe({
        next: () => {
          this.listarPacientes();
          if (this.pacienteEditando && this.pacienteEditando.id === id) {
            this.pacienteEditando = null;
            this.novoPaciente = { nome: '', mae: '', nascimento: '', sexo: '', estadoCivil: '', profissao: '', escolaridade: '', raca: '', endereco: '', bairro: '', municipio: '', uf: '', cep: '', acompanhante: '', procedencia: '' };
          }
        },
        error: (error) => {
          console.error('Erro ao remover paciente:', error);
          this.loading = false;
        }
      });
    }
  }

  cancelarEdicao() {
    this.pacienteEditando = null;
    this.novoPaciente = { nome: '', mae: '', nascimento: '', sexo: '', estadoCivil: '', profissao: '', escolaridade: '', raca: '', endereco: '', bairro: '', municipio: '', uf: '', cep: '', acompanhante: '', procedencia: '' };
    this.exibirFormulario = false;
    this.listarPacientes();
    this.cdr.detectChanges();
  }

  get pacientesFiltrados(): Paciente[] {
    if (!this.filtroNome.trim()) return this.pacientes;
    return this.pacientes.filter(p =>
      p.nome.toLowerCase().includes(this.filtroNome.trim().toLowerCase())
    );
  }

  // Método para aplicar filtro na tabela
  aplicarFiltro() {
    const filtro = this.filtroNome.trim().toLowerCase();
    this.filteredPacientes = this.pacientes.filter(p =>
      p.nome.toLowerCase().includes(filtro)
    );
    this.currentPage = 0;
  }

  // Método para gerar PDF do cadastro do paciente
  imprimirPaciente(paciente: Paciente) {
    // Criar HTML para impressão
    const printContent = `
      <html>
        <head>
          <title>Ficha do Paciente - ${paciente.nome}</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 20px; color: #333; }
            .header { text-align: center; border-bottom: 2px solid #333; padding-bottom: 10px; margin-bottom: 20px; }
            .header h1 { margin: 0; color: #1976d2; }
            .header h2 { margin: 5px 0 0 0; color: #666; }
            .section { margin-bottom: 20px; }
            .section-title { font-weight: bold; color: #1976d2; border-bottom: 1px solid #ddd; padding-bottom: 5px; margin-bottom: 10px; }
            .field { margin: 5px 0; }
            .label { font-weight: bold; }
            .footer { margin-top: 30px; text-align: center; font-size: 12px; color: #666; border-top: 1px solid #ddd; padding-top: 10px; }
            @media print {
              body { margin: 0; }
              .no-print { display: none; }
            }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>e-Prontuário Aliança-PE</h1>
            <h2>Ficha de Cadastro do Paciente</h2>
          </div>

          <div class="section">
            <div class="section-title">DADOS PESSOAIS</div>
            <div class="field"><span class="label">Nome:</span> ${paciente.nome}</div>
            <div class="field"><span class="label">Nome da Mãe:</span> ${paciente.mae}</div>
            <div class="field"><span class="label">Data de Nascimento:</span> ${new Date(paciente.nascimento).toLocaleDateString('pt-BR')}</div>
            <div class="field"><span class="label">Idade:</span> ${this.calcularIdade(paciente.nascimento)} anos</div>
            <div class="field"><span class="label">Sexo:</span> ${this.formatarSexo(paciente.sexo)}</div>
            ${paciente.estadoCivil ? `<div class="field"><span class="label">Estado Civil:</span> ${paciente.estadoCivil}</div>` : ''}
            ${paciente.profissao ? `<div class="field"><span class="label">Profissão:</span> ${paciente.profissao}</div>` : ''}
            ${paciente.escolaridade ? `<div class="field"><span class="label">Escolaridade:</span> ${paciente.escolaridade}</div>` : ''}
            ${paciente.raca ? `<div class="field"><span class="label">Raça/Cor:</span> ${paciente.raca}</div>` : ''}
            ${paciente.telefone ? `<div class="field"><span class="label">Telefone:</span> ${paciente.telefone}</div>` : ''}
            ${paciente.sus ? `<div class="field"><span class="label">SUS:</span> ${paciente.sus}</div>` : ''}
          </div>

          <div class="section">
            <div class="section-title">ENDEREÇO</div>
            ${paciente.endereco ? `<div class="field"><span class="label">Endereço:</span> ${paciente.endereco}</div>` : ''}
            ${paciente.bairro ? `<div class="field"><span class="label">Bairro:</span> ${paciente.bairro}</div>` : ''}
            ${paciente.municipio ? `<div class="field"><span class="label">Município:</span> ${paciente.municipio}</div>` : ''}
            ${paciente.uf ? `<div class="field"><span class="label">UF:</span> ${paciente.uf}</div>` : ''}
            ${paciente.cep ? `<div class="field"><span class="label">CEP:</span> ${paciente.cep}</div>` : ''}
          </div>

          ${paciente.acompanhante ? `
          <div class="section">
            <div class="section-title">ACOMPANHANTE</div>
            <div class="field"><span class="label">Acompanhante:</span> ${paciente.acompanhante}</div>
          </div>` : ''}

          ${paciente.procedencia ? `
          <div class="section">
            <div class="section-title">PROCEDÊNCIA</div>
            <div class="field"><span class="label">Procedência:</span> ${paciente.procedencia}</div>
          </div>` : ''}

          <div class="footer">
            <div>Gerado em: ${new Date().toLocaleDateString('pt-BR')} às ${new Date().toLocaleTimeString('pt-BR')}</div>
            <div>Sistema e-Prontuário Aliança-PE</div>
          </div>
        </body>
      </html>
    `;

    // Abrir janela de impressão
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(printContent);
      printWindow.document.close();
      printWindow.onload = () => {
        printWindow.print();
        printWindow.close();
      };
    }
  }

  async gerarPacientePDF(paciente: Paciente) {
    try {
      // Importar jsPDF dinamicamente
      let jsPDF;

      // Tentar importar jsPDF
      try {
        const jsPDFModule = await import('jspdf');
        jsPDF = jsPDFModule.default;
      } catch (importError) {
        // Fallback para window.jsPDF se a importação falhar
        if ((window as any).jsPDF) {
          jsPDF = (window as any).jsPDF;
        } else {
          throw new Error('jsPDF não encontrado');
        }
      }

      if (!jsPDF) {
        const feedbackRef = this.dialog.open(FeedbackDialogComponent, {
          data: {
            title: 'Erro',
            message: 'Biblioteca de geração de PDF não encontrada. Verifique se o jsPDF está instalado.',
            type: 'error'
          }
        });
        setTimeout(() => feedbackRef.close(), 3000);
        return;
      }
      // Gerar PDF do paciente
      const doc = new jsPDF();

      // Configuração das fontes e cores
      doc.setFontSize(20);
      doc.setTextColor(40);

      // Cabeçalho
      doc.text('e-Prontuário Aliança-PE', 20, 20);
      doc.setFontSize(14);
      doc.text('Ficha de Cadastro do Paciente', 20, 30);

      // Linha separadora
      doc.setLineWidth(0.5);
      doc.line(20, 35, 190, 35);

      // Dados do paciente
      doc.setFontSize(12);
      doc.setTextColor(0);

      let yPosition = 50;
      const lineHeight = 8;

      // Dados pessoais
      doc.setFont('helvetica', 'bold');
      doc.text('DADOS PESSOAIS', 20, yPosition);
      yPosition += lineHeight + 2;

      doc.setFont('helvetica', 'normal');
      doc.text(`Nome: ${paciente.nome}`, 20, yPosition);
      yPosition += lineHeight;

      doc.text(`Nome da Mãe: ${paciente.mae}`, 20, yPosition);
      yPosition += lineHeight;

      doc.text(`Data de Nascimento: ${new Date(paciente.nascimento).toLocaleDateString('pt-BR')}`, 20, yPosition);
      yPosition += lineHeight;

      // Cálculo da idade
      let idadeTexto = '';
      if (paciente.nascimento) {
        const nascimentoDate = new Date(paciente.nascimento);
        const hoje = new Date();
        let idade = hoje.getFullYear() - nascimentoDate.getFullYear();
        const m = hoje.getMonth() - nascimentoDate.getMonth();
        if (m < 0 || (m === 0 && hoje.getDate() < nascimentoDate.getDate())) {
          idade--;
        }
        idadeTexto = idade + ' anos';
      }
      doc.text(`Idade: ${idadeTexto}`, 20, yPosition);
      yPosition += lineHeight;

      doc.text(`Sexo: ${this.formatarSexo(paciente.sexo)}`, 20, yPosition);
      yPosition += lineHeight;

      if (paciente.estadoCivil) {
        doc.text(`Estado Civil: ${paciente.estadoCivil}`, 20, yPosition);
        yPosition += lineHeight;
      }

      if (paciente.profissao) {
        doc.text(`Profissão: ${paciente.profissao}`, 20, yPosition);
        yPosition += lineHeight;
      }

      if (paciente.escolaridade) {
        doc.text(`Escolaridade: ${paciente.escolaridade}`, 20, yPosition);
        yPosition += lineHeight;
      }

      if (paciente.raca) {
        doc.text(`Raça/Cor: ${paciente.raca}`, 20, yPosition);
        yPosition += lineHeight + 5;
      }

      // Endereço
      doc.setFont('helvetica', 'bold');
      doc.text('ENDEREÇO', 20, yPosition);
      yPosition += lineHeight + 2;

      doc.setFont('helvetica', 'normal');
      if (paciente.endereco) {
        doc.text(`Endereço: ${paciente.endereco}`, 20, yPosition);
        yPosition += lineHeight;
      }

      if (paciente.bairro) {
        doc.text(`Bairro: ${paciente.bairro}`, 20, yPosition);
        yPosition += lineHeight;
      }

      if (paciente.municipio) {
        doc.text(`Município: ${paciente.municipio}`, 20, yPosition);
        yPosition += lineHeight;
      }

      if (paciente.uf) {
        doc.text(`UF: ${paciente.uf}`, 20, yPosition);
        yPosition += lineHeight;
      }

      if (paciente.cep) {
        doc.text(`CEP: ${paciente.cep}`, 20, yPosition);
        yPosition += lineHeight + 5;
      }

      // Rodapé
      const pageHeight = doc.internal.pageSize.height;
      doc.setFontSize(10);
      doc.setTextColor(100);
      doc.text(`Gerado em: ${new Date().toLocaleDateString('pt-BR')} às ${new Date().toLocaleTimeString('pt-BR')}`, 20, pageHeight - 20);
      doc.text('Sistema e-Prontuário Aliança-PE', 20, pageHeight - 10);

      // Salvar o PDF
      const nomeArquivo = `paciente_${paciente.nome.replace(/\s+/g, '_').toLowerCase()}_${new Date().getTime()}.pdf`;
      doc.save(nomeArquivo);

      // Mostrar feedback de sucesso
      const feedbackRef = this.dialog.open(FeedbackDialogComponent, {
        data: {
          title: 'Sucesso',
          message: 'PDF gerado com sucesso!',
          type: 'success'
        }
      });
      setTimeout(() => feedbackRef.close(), 2000);

    } catch (error: any) {
      console.error('Erro ao gerar PDF:', error);
      const feedbackRef = this.dialog.open(FeedbackDialogComponent, {
        data: {
          title: 'Erro',
          message: `Erro ao gerar PDF: ${error?.message || 'Erro desconhecido'}`,
          type: 'error'
        }
      });
      setTimeout(() => feedbackRef.close(), 3000);
    }
  }

  // Método auxiliar para calcular idade
  private calcularIdade(nascimento: string): number {
    if (!nascimento) return 0;

    const nascimentoDate = new Date(nascimento);
    const hoje = new Date();
    let idade = hoje.getFullYear() - nascimentoDate.getFullYear();
    const m = hoje.getMonth() - nascimentoDate.getMonth();
    if (m < 0 || (m === 0 && hoje.getDate() < nascimentoDate.getDate())) {
      idade--;
    }
    return idade;
  }

  // Método auxiliar para formatar sexo
  private formatarSexo(sexo: string): string {
    switch (sexo) {
      case 'M': return 'Masculino';
      case 'F': return 'Feminino';
      case 'I': return 'Ignorado';
      default: return sexo;
    }
  }

  logout() {
    this.authService.logout();
  }

  abrirRegistrarAtendimento(pacienteId: number) {
    this.dialog.open(RegistrarAtendimentoComponent, {
      width: '400px',
      data: { pacienteId }
    });
  }
  abrirHistoricoPaciente(paciente: Paciente) {
    this.dialog.open(HistoricoPacienteTimelineComponent, {
      width: '600px',
      data: { pacienteId: paciente.id }
    });
  }
}
