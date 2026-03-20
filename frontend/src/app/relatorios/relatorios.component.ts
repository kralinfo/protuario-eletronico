import { Component, OnInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { environment } from '../../environments/environment';
import { AuthService } from '../auth/auth.service';
import * as jsPDF from 'jspdf';
import { dataMaxHojeValidator, datasInicioFimValidator } from '../utils/validators-util';

export interface Paciente {
  id?: number;
  nome: string;
  mae: string;
  nascimento: string;
  sexo: string;
  estadoCivil: string;
  profissao: string;
  escolaridade: string;
  raca: string;
  endereco: string;
  bairro: string;
  municipio: string;
  uf: string;
  cep: string;
  acompanhante: string;
  procedencia: string;
  created_at?: string;
  updated_at?: string;
}

export interface FiltrosRelatorio {
  dataInicio?: string;
  dataFim?: string;
  sexo?: string;
  municipio?: string;
  uf?: string;
  estadoCivil?: string;
  escolaridade?: string;
}

@Component({
  selector: 'app-relatorios',
  templateUrl: './relatorios.component.html',
  styleUrls: ['./relatorios.component.scss', '../shared/styles/table-footer.css'],
  standalone: false
})
export class RelatoriosComponent implements OnInit {
  filtrosForm: FormGroup;
  pacientes: Paciente[] = [];
  pacientesFiltrados: Paciente[] = [];
  atendimentos: any[] = []; // Adiciona array para atendimentos
  carregando = false;
  acessoNegado = false;

  // Propriedades de paginação
  currentPage = 0;
  pageSize = 10;
  totalPages = 0;
  pageSizeOptions = [10, 25, 50];
  paginatedPacientes: Paciente[] = [];

  // Opções para os filtros
  opcoesSexo = [
    { value: '', label: 'Todos' },
    { value: 'M', label: 'Masculino' },
    { value: 'F', label: 'Feminino' }
  ];

  opcoesUF = [
    { value: '', label: 'Todos' },
    { value: 'AC', label: 'Acre' },
    { value: 'AL', label: 'Alagoas' },
    { value: 'AP', label: 'Amapá' },
    { value: 'AM', label: 'Amazonas' },
    { value: 'BA', label: 'Bahia' },
    { value: 'CE', label: 'Ceará' },
    { value: 'DF', label: 'Distrito Federal' },
    { value: 'ES', label: 'Espírito Santo' },
    { value: 'GO', label: 'Goiás' },
    { value: 'MA', label: 'Maranhão' },
    { value: 'MT', label: 'Mato Grosso' },
    { value: 'MS', label: 'Mato Grosso do Sul' },
    { value: 'MG', label: 'Minas Gerais' },
    { value: 'PA', label: 'Pará' },
    { value: 'PB', label: 'Paraíba' },
    { value: 'PR', label: 'Paraná' },
    { value: 'PE', label: 'Pernambuco' },
    { value: 'PI', label: 'Piauí' },
    { value: 'RJ', label: 'Rio de Janeiro' },
    { value: 'RN', label: 'Rio Grande do Norte' },
    { value: 'RS', label: 'Rio Grande do Sul' },
    { value: 'RO', label: 'Rondônia' },
    { value: 'RR', label: 'Roraima' },
    { value: 'SC', label: 'Santa Catarina' },
    { value: 'SP', label: 'São Paulo' },
    { value: 'SE', label: 'Sergipe' },
    { value: 'TO', label: 'Tocantins' }
  ];

  opcoesEstadoCivil = [
    { value: '', label: 'Todos' },
    { value: 'solteiro', label: 'Solteiro(a)' },
    { value: 'casado', label: 'Casado(a)' },
    { value: 'divorciado', label: 'Divorciado(a)' },
    { value: 'viuvo', label: 'Viúvo(a)' },
    { value: 'uniao_estavel', label: 'União Estável' }
  ];

  opcoesEscolaridade = [
    { value: '', label: 'Todos' },
    { value: 'analfabeto', label: 'Analfabeto(a)' },
    { value: 'fundamental_incompleto', label: 'Ensino Fundamental Incompleto' },
    { value: 'fundamental_completo', label: 'Ensino Fundamental Completo' },
    { value: 'medio_incompleto', label: 'Ensino Médio Incompleto' },
    { value: 'medio_completo', label: 'Ensino Médio Completo' },
    { value: 'superior_incompleto', label: 'Ensino Superior Incompleto' },
    { value: 'superior_completo', label: 'Ensino Superior Completo' },
    { value: 'pos_graduacao', label: 'Pós-graduação' }
  ];

  constructor(
    private http: HttpClient,
    public authService: AuthService,
    private fb: FormBuilder
  ) {
        this.filtrosForm = this.fb.group({
          dataInicio: ['', [dataMaxHojeValidator]],
          dataFim: ['', [dataMaxHojeValidator]],
          sexo: [''],
          municipio: [''],
          uf: [''],
          estadoCivil: [''],
          escolaridade: ['']
        }, { validators: datasInicioFimValidator });
  }

  ngOnInit() {
    // Acesso liberado para todos os usuários autenticados
    this.acessoNegado = false;
    this.carregarEstadosCivisDoBanco();
    this.carregarEscolaridadesDoBanco();
    this.carregarPacientes();
  }

  carregarEstadosCivisDoBanco() {
    const token = this.authService.getToken();
    this.http.get<any>(`${environment.apiUrl}/pacientes/estados-civis`, {
      headers: { 'Authorization': `Bearer ${token}` }
    }).subscribe({
      next: (response) => {
        const estadosCivisDoBanco = response.data || [];
        // Atualizar as opções baseado nos dados reais do banco
        this.atualizarOpcoesEstadoCivil(estadosCivisDoBanco);
      },
      error: (error) => {
        console.error('Erro ao carregar estados civis:', error);
        // Manter as opções padrão em caso de erro
      }
    });
  }

  carregarEscolaridadesDoBanco() {
    const token = this.authService.getToken();
    this.http.get<any>(`${environment.apiUrl}/pacientes/escolaridades`, {
      headers: { 'Authorization': `Bearer ${token}` }
    }).subscribe({
      next: (response) => {
        const escolaridadesDoBanco = response.data || [];
        // Atualizar as opções baseado nos dados reais do banco
        this.atualizarOpcoesEscolaridade(escolaridadesDoBanco);
      },
      error: (error) => {
        console.error('Erro ao carregar escolaridades:', error);
        // Manter as opções padrão em caso de erro
      }
    });
  }

  atualizarOpcoesEstadoCivil(estadosDoBanco: string[]) {
    // Manter a opção "Todos"
    let novasOpcoes = [{ value: '', label: 'Todos' }];

    // Mapear estados do banco para opções padronizadas
    const estadosUnicos = [...new Set(estadosDoBanco.filter(e => e && e.trim()))];

    estadosUnicos.forEach(estado => {
      const estadoLower = estado.toLowerCase();
      if (estadoLower.includes('solteiro')) {
        if (!novasOpcoes.find(o => o.value === 'solteiro')) {
          novasOpcoes.push({ value: 'solteiro', label: 'Solteiro(a)' });
        }
      } else if (estadoLower.includes('casad')) {
        if (!novasOpcoes.find(o => o.value === 'casado')) {
          novasOpcoes.push({ value: 'casado', label: 'Casado(a)' });
        }
      } else if (estadoLower.includes('divorciado')) {
        if (!novasOpcoes.find(o => o.value === 'divorciado')) {
          novasOpcoes.push({ value: 'divorciado', label: 'Divorciado(a)' });
        }
      } else if (estadoLower.includes('viúv') || estadoLower.includes('viuv')) {
        if (!novasOpcoes.find(o => o.value === 'viuvo')) {
          novasOpcoes.push({ value: 'viuvo', label: 'Viúvo(a)' });
        }
      } else if (estadoLower.includes('união') || estadoLower.includes('uniao')) {
        if (!novasOpcoes.find(o => o.value === 'uniao_estavel')) {
          novasOpcoes.push({ value: 'uniao_estavel', label: 'União Estável' });
        }
      }
    });

    this.opcoesEstadoCivil = novasOpcoes;
    console.log('Opções de estado civil atualizadas:', this.opcoesEstadoCivil);
  }

  atualizarOpcoesEscolaridade(escolaridadesDoBanco: string[]) {
    // Manter a opção "Todos"
    let novasOpcoes = [{ value: '', label: 'Todos' }];

    // Mapear escolaridades do banco para opções padronizadas
    const escolaridadesUnicas = [...new Set(escolaridadesDoBanco.filter(e => e && e.trim()))];

    escolaridadesUnicas.forEach(escolaridade => {
      const escolaridadeLower = escolaridade.toLowerCase();

      if (escolaridadeLower.includes('analfabet')) {
        if (!novasOpcoes.find(o => o.value === 'analfabeto')) {
          novasOpcoes.push({ value: 'analfabeto', label: 'Analfabeto(a)' });
        }
      } else if (escolaridadeLower.includes('fundamental') && escolaridadeLower.includes('incompleto')) {
        if (!novasOpcoes.find(o => o.value === 'fundamental_incompleto')) {
          novasOpcoes.push({ value: 'fundamental_incompleto', label: 'Ensino Fundamental Incompleto' });
        }
      } else if (escolaridadeLower.includes('fundamental') && (escolaridadeLower.includes('completo') || escolaridadeLower.includes('compl'))) {
        if (!novasOpcoes.find(o => o.value === 'fundamental_completo')) {
          novasOpcoes.push({ value: 'fundamental_completo', label: 'Ensino Fundamental Completo' });
        }
      } else if ((escolaridadeLower.includes('médio') || escolaridadeLower.includes('medio')) && escolaridadeLower.includes('incompleto')) {
        if (!novasOpcoes.find(o => o.value === 'medio_incompleto')) {
          novasOpcoes.push({ value: 'medio_incompleto', label: 'Ensino Médio Incompleto' });
        }
      } else if ((escolaridadeLower.includes('médio') || escolaridadeLower.includes('medio')) && (escolaridadeLower.includes('completo') || escolaridadeLower.includes('compl') || escolaridadeLower === 'medio' || escolaridadeLower === 'médio')) {
        if (!novasOpcoes.find(o => o.value === 'medio_completo')) {
          novasOpcoes.push({ value: 'medio_completo', label: 'Ensino Médio Completo' });
        }
      } else if (escolaridadeLower.includes('superior') && escolaridadeLower.includes('incompleto')) {
        if (!novasOpcoes.find(o => o.value === 'superior_incompleto')) {
          novasOpcoes.push({ value: 'superior_incompleto', label: 'Ensino Superior Incompleto' });
        }
      } else if ((escolaridadeLower.includes('superior') && (escolaridadeLower.includes('completo') || escolaridadeLower.includes('compl'))) || escolaridadeLower === 'superior') {
        if (!novasOpcoes.find(o => o.value === 'superior_completo')) {
          novasOpcoes.push({ value: 'superior_completo', label: 'Ensino Superior Completo' });
        }
      } else if (escolaridadeLower.includes('pós') || escolaridadeLower.includes('pos') || escolaridadeLower.includes('mestrado') || escolaridadeLower.includes('doutorado')) {
        if (!novasOpcoes.find(o => o.value === 'pos_graduacao')) {
          novasOpcoes.push({ value: 'pos_graduacao', label: 'Pós-graduação' });
        }
      }
    });

    this.opcoesEscolaridade = novasOpcoes;
    console.log('Opções de escolaridade atualizadas:', this.opcoesEscolaridade);
  }

  carregarPacientes() {
    this.carregando = true;
    const token = this.authService.getToken();

    // Carrega dados de atendimentos para os contadores de status
    this.http.get<any>(`${environment.apiUrl}/atendimentos/reports`, {
      headers: { 'Authorization': `Bearer ${token}` }
    }).subscribe({
      next: (response) => {
        // A resposta deve conter os atendimentos
        this.atendimentos = response.data || response || [];
        console.log('Atendimentos carregados:', this.atendimentos.length);

        // Carrega pacientes para o relatório
        this.http.get<any>(`${environment.apiUrl}/pacientes/reports`, {
          headers: { 'Authorization': `Bearer ${token}` }
        }).subscribe({
          next: (response) => {
            this.pacientes = response.data || [];
            this.aplicarFiltros();
            this.carregando = false;
          },
          error: (error) => {
            console.error('Erro ao carregar pacientes:', error);
            this.carregando = false;
          }
        });
      },
      error: (error) => {
        console.error('Erro ao carregar atendimentos:', error);
        this.carregando = false;
      }
    });
  }

  aplicarFiltros() {
    this.carregando = true;
    const filtros = this.filtrosForm.value;
    const token = this.authService.getToken();
    const params = new URLSearchParams();
    if (filtros.dataInicio) params.append('dataInicio', filtros.dataInicio);
    if (filtros.dataFim) params.append('dataFim', filtros.dataFim);
    if (filtros.sexo) params.append('sexo', filtros.sexo);
    if (filtros.municipio) params.append('municipio', filtros.municipio);
    if (filtros.uf) params.append('uf', filtros.uf);
    if (filtros.estadoCivil) params.append('estadoCivil', filtros.estadoCivil);
    if (filtros.escolaridade) params.append('escolaridade', filtros.escolaridade);
    const queryString = params.toString();
    const url = `${environment.apiUrl}/pacientes/reports${queryString ? '?' + queryString : ''}`;
    this.http.get<any>(url, {
      headers: { 'Authorization': `Bearer ${token}` }
    }).subscribe({
      next: (response) => {
        this.pacientesFiltrados = response.data || [];
        this.carregando = false;
        this.updatePagination();
        console.log(`Filtros aplicados: ${this.pacientesFiltrados.length} pacientes encontrados`);
      },
      error: (error) => {
        console.error('Erro ao aplicar filtros:', error);
        this.carregando = false;
      }
    });
  }

  limparFiltros() {
    this.filtrosForm.reset();
    this.aplicarFiltros();
  }

  gerarRelatorioSimples() {
    const doc = new jsPDF.jsPDF();
    const pageWidth = doc.internal.pageSize.width;
    let currentY = 20;

    // Título
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text('Relatório de Pacientes', pageWidth / 2, currentY, { align: 'center' });
    currentY += 15;

    // Informações do relatório
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(`Data de emissão: ${new Date().toLocaleDateString('pt-BR')}`, 20, currentY);
    currentY += 5;
    doc.text(`Total de pacientes: ${this.pacientesFiltrados.length}`, 20, currentY);
    currentY += 15;

    // Cabeçalho da tabela
    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    const headers = ['Nome', 'Sexo', 'Nascimento', 'Município', 'UF'];
    const colWidths = [60, 15, 25, 50, 15];
    let currentX = 20;

    headers.forEach((header, index) => {
      doc.text(header, currentX, currentY);
      currentX += colWidths[index];
    });
    currentY += 5;

    // Linha do cabeçalho
    doc.line(20, currentY, pageWidth - 20, currentY);
    currentY += 5;

    // Dados dos pacientes
    doc.setFont('helvetica', 'normal');
    this.pacientesFiltrados.forEach(paciente => {
      if (currentY > 270) {
        doc.addPage();
        currentY = 20;
      }

      currentX = 20;
      const dados = [
        paciente.nome.substring(0, 25),
        paciente.sexo,
        new Date(paciente.nascimento).toLocaleDateString('pt-BR'),
        paciente.municipio.substring(0, 20),
        paciente.uf
      ];

      dados.forEach((dado, index) => {
        doc.text(dado, currentX, currentY);
        currentX += colWidths[index];
      });
      currentY += 5;
    });

    doc.save('relatorio-pacientes-simples.pdf');
  }

  gerarRelatorioDetalhado() {
    const doc = new jsPDF.jsPDF();
    const pageWidth = doc.internal.pageSize.width;
    let currentY = 20;

    // Título
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text('Relatório Detalhado de Pacientes', pageWidth / 2, currentY, { align: 'center' });
    currentY += 15;

    // Informações do relatório
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(`Data de emissão: ${new Date().toLocaleDateString('pt-BR')}`, 20, currentY);
    currentY += 5;
    doc.text(`Total de pacientes: ${this.pacientesFiltrados.length}`, 20, currentY);
    currentY += 15;

    // Dados detalhados de cada paciente
    doc.setFontSize(9);
    this.pacientesFiltrados.forEach((paciente, index) => {
      if (currentY > 250) {
        doc.addPage();
        currentY = 20;
      }

      // Separador entre pacientes
      if (index > 0) {
        doc.line(20, currentY, pageWidth - 20, currentY);
        currentY += 5;
      }

      // Dados do paciente
      doc.setFont('helvetica', 'bold');
      doc.text(`${index + 1}. ${paciente.nome}`, 20, currentY);
      currentY += 5;

      doc.setFont('helvetica', 'normal');
      doc.text(`Mãe: ${paciente.mae}`, 20, currentY);
      currentY += 4;
      doc.text(`Nascimento: ${new Date(paciente.nascimento).toLocaleDateString('pt-BR')} | Sexo: ${paciente.sexo}`, 20, currentY);
      currentY += 4;
      doc.text(`Estado Civil: ${paciente.estadoCivil} | Escolaridade: ${paciente.escolaridade}`, 20, currentY);
      currentY += 4;
      doc.text(`Endereço: ${paciente.endereco}, ${paciente.bairro}`, 20, currentY);
      currentY += 4;
      doc.text(`Município: ${paciente.municipio} - ${paciente.uf} | CEP: ${paciente.cep}`, 20, currentY);
      currentY += 4;
      doc.text(`Profissão: ${paciente.profissao} | Raça: ${paciente.raca}`, 20, currentY);
      currentY += 8;
    });

    doc.save('relatorio-pacientes-detalhado.pdf');
  }

  imprimirResumo() {
    const printContent = this.gerarHtmlResumo();
    const printWindow = window.open('', '_blank');

    if (printWindow) {
      printWindow.document.write(`
        <html>
          <head>
            <title>Resumo de Pacientes</title>
            <style>
              body { font-family: Arial, sans-serif; margin: 20px; }
              h1 { text-align: center; color: #333; }
              .info { margin-bottom: 20px; }
              table { width: 100vw !important; border-collapse: collapse; margin-top: 20px; page-break-inside: auto; }
              th, td { border: 1px solid #ddd; padding: 8px; text-align: left; word-break: break-word; }
              th { background-color: #f2f2f2; font-weight: bold; }
              tr { page-break-inside: avoid; page-break-after: auto; }
              @media print { body { margin: 0; } table { width: 100vw !important; page-break-inside: auto; } tr { page-break-inside: avoid; page-break-after: auto; } th, td { word-break: break-word; } }
            </style>
          </head>
          <body>
            ${printContent}
          </body>
        </html>
      `);
      printWindow.document.close();
      printWindow.print();
    }
  }

  getQuantidadeFeminino(): number {
    return this.pacientesFiltrados.filter(p => p.sexo === 'F').length;
  }

  getQuantidadeMasculino(): number {
    return this.pacientesFiltrados.filter(p => p.sexo === 'M').length;
  }

  getQuantidadeMunicipios(): number {
    return new Set(this.pacientesFiltrados.map(p => p.municipio)).size;
  }

  // Novos métodos para contadores de status de atendimentos
  getAtendimentosTriagemPendente(): number {
    return this.atendimentos.filter(a =>
      a.status === 'triagem pendente' ||
      a.status === 'encaminhado para triagem'
    ).length;
  }

  getAtendimentosEmTriagem(): number {
    return this.atendimentos.filter(a =>
      a.status === 'em_triagem' ||
      a.status === 'em triagem'
    ).length;
  }

  getAtendimentosAguardandoMedico(): number {
    return this.atendimentos.filter(a =>
      a.status === 'encaminhado_para_sala_medica' ||
      a.status === 'encaminhado para sala médica' ||
      a.status === 'aguardando' ||
      a.status === 'aguardando_atendimento' ||
      a.status === 'aguardando atendimento'
    ).length;
  }

  getAtendimentosEmAtendimento(): number {
    return this.atendimentos.filter(a =>
      a.status === 'em_atendimento_medico' ||
      a.status === 'em atendimento médico' ||
      a.status === 'em_atendimento' ||
      a.status === 'em atendimento' ||
      a.status === 'em_atendimento_ambulatorial' ||
      a.status === 'em atendimento ambulatorial'
    ).length;
  }

  getAtendimentosFinalizados(): number {
    return this.atendimentos.filter(a =>
      a.status === 'atendimento_concluido' ||
      a.status === 'atendimento concluido' ||
      a.status === 'finalizado' ||
      a.status === 'alta_ambulatorial' ||
      a.status === 'encaminhado_para_exames' ||
      a.status === 'encaminhado para exames'
    ).length;
  }

  getAtendimentosInterrompidos(): number {
    return this.atendimentos.filter(a =>
      a.status === 'interrompido' ||
      a.status === 'abandonado'
    ).length;
  }

  private gerarHtmlResumo(): string {
    let html = `
      <h1>Resumo de Pacientes</h1>
      <div class="info">
        <p><strong>Data de emissão:</strong> ${new Date().toLocaleDateString('pt-BR')}</p>
        <p><strong>Total de pacientes:</strong> ${this.pacientesFiltrados.length}</p>
      </div>
      <table>
        <thead>
          <tr>
            <th>Nome</th>
            <th>Sexo</th>
            <th>Nascimento</th>
            <th>Município</th>
            <th>UF</th>
          </tr>
        </thead>
        <tbody>
    `;

    this.pacientesFiltrados.forEach(paciente => {
      html += `
        <tr>
          <td>${paciente.nome}</td>
          <td>${paciente.sexo}</td>
          <td>${new Date(paciente.nascimento).toLocaleDateString('pt-BR')}</td>
          <td>${paciente.municipio}</td>
          <td>${paciente.uf}</td>
        </tr>
      `;
    });

    html += '</tbody></table>';
    return html;
  }

  // Métodos de paginação
  updatePagination() {
    this.totalPages = Math.ceil(this.pacientesFiltrados.length / this.pageSize);
    if (this.currentPage >= this.totalPages) {
      this.currentPage = Math.max(0, this.totalPages - 1);
    }
    this.updatePaginatedData();
  }

  updatePaginatedData() {
    const startIndex = this.currentPage * this.pageSize;
    const endIndex = startIndex + this.pageSize;
    this.paginatedPacientes = this.pacientesFiltrados.slice(startIndex, endIndex);
  }

  onPageSizeChange(event: any) {
    this.pageSize = parseInt(event.target.value);
    this.currentPage = 0;
    this.updatePagination();
  }

  goToFirstPage() {
    this.currentPage = 0;
    this.updatePaginatedData();
  }

  goToPreviousPage() {
    if (this.currentPage > 0) {
      this.currentPage--;
      this.updatePaginatedData();
    }
  }

  goToNextPage() {
    if (this.currentPage < this.totalPages - 1) {
      this.currentPage++;
      this.updatePaginatedData();
    }
  }

  goToLastPage() {
    this.currentPage = this.totalPages - 1;
    this.updatePaginatedData();
  }

  onPageChange(pageOneBased: number) {
    const page = Math.max(0, (pageOneBased || 1) - 1);
    this.currentPage = page;
    this.updatePaginatedData();
  }
}
