import { AfterViewInit, Component, ElementRef, OnInit, QueryList, ViewChild, ViewChildren } from '@angular/core';
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
export class RelatoriosComponent implements OnInit, AfterViewInit {
  filtrosForm: FormGroup;
  pacientes: Paciente[] = [];
  pacientesFiltrados: Paciente[] = [];
  atendimentos: any[] = []; // Adiciona array para atendimentos
  carregando = false;
  acessoNegado = false;

  // Dados brutos (nunca mudam após carga)
  todosPacientes: Paciente[] = [];

  // Mapeamento de ABA → STATUS(S) do banco (igual ao relatorio-atendimentos)
  private readonly STATUS_MAP: Record<string, string[]> = {
    todas: [],
    triagem_pendente: [
      'encaminhado para triagem',
      'encaminhado_para_triagem',
      'triagem pendente',
      'triagem_pendente'
    ],
    em_triagem: ['em triagem', 'em_triagem'],
    aguardando_medico: [
      'aguardando medico',
      'aguardando médico',
      'aguardando_medico',
      'encaminhado para sala medica',
      'encaminhado para sala médica',
      'encaminhado_para_sala_medica',
      '3 - encaminhado para sala médica',
      'aguardando',
      'aguardando_atendimento',
      'aguardando atendimento'
    ],
    em_atendimento: [
      'em atendimento',
      'em atendimento médico',
      'em atendimento medico',
      'em_atendimento',
      'em_atendimento_medico',
      'em atendimento ambulatorial',
      'em_atendimento_ambulatorial',
      '4 - em atendimento médico'
    ],
    finalizados: [
      'atendimento concluido',
      'atendimento concluído',
      'atendimento_concluido',
      'finalizado',
      'alta medica',
      'alta médica',
      'alta_medica',
      'alta ambulatorial',
      'alta_ambulatorial',
      'encaminhado para exames',
      'encaminhado_para_exames',
      '7 - encaminhado para exames',
      '8 - atendimento concluído'
    ],
    interrompidos: ['interrompido', 'abandonado']
  };

  // Abas com indicador animado
  abaAtiva = 'todas';
  @ViewChild('tabIndicator') tabIndicator!: ElementRef<HTMLElement>;
  @ViewChildren('tabButton') tabButtons!: QueryList<ElementRef<HTMLElement>>;

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

  ngAfterViewInit() {
    setTimeout(() => {
      const firstTab = this.tabButtons.first;
      if (firstTab) this.updateIndicator(firstTab.nativeElement);
    });
  }

  setAba(aba: string, event: MouseEvent) {
    this.abaAtiva = aba;
    this.currentPage = 0;
    this.updateIndicator(event.currentTarget as HTMLElement);
    this.aplicarFiltrosLocais();
  }

  private updateIndicator(el: HTMLElement) {
    if (!this.tabIndicator) return;
    const indicator = this.tabIndicator.nativeElement;

    const rect = el.getBoundingClientRect();
    const parentRect = el.parentElement!.getBoundingClientRect();

    indicator.style.width = rect.width + 'px';
    indicator.style.left = (rect.left - parentRect.left) + 'px';
  }

  /**
   * Filtra os pacientes baseado na aba ativa (status de atendimento)
   */
  getDadosFiltradosPorAba(): Paciente[] {
    if (this.abaAtiva === 'todas') return this.pacientesFiltrados;

    // Mapeia status para cada aba
    const statusMap: Record<string, string[]> = {
      triagem_pendente: ['triagem pendente', 'encaminhado para triagem'],
      em_triagem: ['em_triagem', 'em triagem'],
      aguardando_medico: [
        'encaminhado_para_sala_medica',
        'encaminhado para sala médica',
        'aguardando',
        'aguardando_atendimento',
        'aguardando atendimento'
      ],
      em_atendimento: [
        'em_atendimento_medico',
        'em atendimento médico',
        'em_atendimento',
        'em atendimento',
        'em_atendimento_ambulatorial',
        'em atendimento ambulatorial'
      ],
      finalizados: [
        'atendimento_concluido',
        'atendimento concluido',
        'finalizado',
        'alta_ambulatorial',
        'encaminhado_para_exames',
        'encaminhado para exames'
      ],
      interrompidos: ['interrompido', 'abandonado']
    };

    const statusDaAba = statusMap[this.abaAtiva] || [];
    if (statusDaAba.length === 0) return this.pacientesFiltrados;

    // Filtra pacientes que têm atendimentos com o status da aba
    const pacientesComStatus = this.atendimentos
      .filter(a => statusDaAba.some(s => a.status.toLowerCase() === s.toLowerCase()))
      .map(a => a.paciente_id);

    return this.pacientesFiltrados.filter(p => pacientesComStatus.includes(p.id));
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

    // Carrega atendimentos e pacientes em paralelo
    this.http.get<any>(`${environment.apiUrl}/atendimentos/reports`, {
      headers: { 'Authorization': `Bearer ${token}` }
    }).subscribe({
      next: (respAtend) => {
        this.atendimentos = (respAtend.data || respAtend || []).map((a: any) => ({
          ...a,
          status: (a.status || '').toLowerCase().trim()
        }));

        this.http.get<any>(`${environment.apiUrl}/pacientes/reports`, {
          headers: { 'Authorization': `Bearer ${token}` }
        }).subscribe({
          next: (respPac) => {
            this.todosPacientes = respPac.data || [];
            this.pacientes = this.todosPacientes;
            this.aplicarFiltrosLocais();
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
    this.aplicarFiltrosLocais();
  }

  /**
   * Filtra localmente (sem chamar a API) - igual ao relatorio-atendimentos
   */
  aplicarFiltrosLocais() {
    const filtros = this.filtrosForm.value;
    let lista = [...this.todosPacientes];

    // Helper: parse date input como data local
    const parseDateLocal = (input: string): Date | null => {
      if (!input) return null;
      const m = input.match(/^(\d{4})-(\d{2})-(\d{2})$/);
      if (m) return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
      return null;
    };

    // Filtro por Data Inicial (data de cadastro do paciente)
    const dataInicio = parseDateLocal(filtros.dataInicio);
    if (dataInicio) {
      dataInicio.setHours(0, 0, 0, 0);
      lista = lista.filter(p => {
        if (!p.created_at) return false;
        const d = new Date(p.created_at);
        return d >= dataInicio!;
      });
    }

    // Filtro por Data Final
    const dataFim = parseDateLocal(filtros.dataFim);
    if (dataFim) {
      dataFim.setHours(23, 59, 59, 999);
      lista = lista.filter(p => {
        if (!p.created_at) return false;
        const d = new Date(p.created_at);
        return d <= dataFim!;
      });
    }

    // Filtro por Sexo
    if (filtros.sexo) {
      lista = lista.filter(p => p.sexo === filtros.sexo);
    }

    // Filtro por Município (parcial)
    if (filtros.municipio) {
      const mun = String(filtros.municipio).toLowerCase();
      lista = lista.filter(p => (p.municipio || '').toLowerCase().includes(mun));
    }

    // Filtro por UF
    if (filtros.uf) {
      lista = lista.filter(p => (p.uf || '').toUpperCase() === filtros.uf.toUpperCase());
    }

    // Filtro por Estado Civil
    if (filtros.estadoCivil) {
      lista = lista.filter(p => {
        const ec = (p.estadoCivil || '').toLowerCase().trim();
        return ec === filtros.estadoCivil.toLowerCase();
      });
    }

    // Filtro por Escolaridade
    if (filtros.escolaridade) {
      lista = lista.filter(p => {
        const esc = (p.escolaridade || '').toLowerCase().trim();
        return esc === filtros.escolaridade.toLowerCase();
      });
    }

    this.pacientesFiltrados = lista;
    this.currentPage = 0;
    this.updatePagination();
  }

  limparFiltros() {
    this.filtrosForm.reset();
    this.aplicarFiltrosLocais();
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

  /**
   * Conta atendimentos por lista de status (para os contadores das abas - igual aos cards antigos)
   */
  private contarAtendimentosPorStatus(statusList: string[]): number {
    return this.atendimentos.filter(a =>
      statusList.some(s => (a.status || '').toLowerCase().trim() === s.toLowerCase())
    ).length;
  }

  /**
   * Retorna o total de pacientes (todos, para o label da aba Todas)
   */
  getTotal(): number {
    return this.todosPacientes.length;
  }

  /**
   * Retorna atendimentos com status Triagem Pendente (igual ao card antigo)
   */
  getTriagemPendente(): number {
    return this.contarAtendimentosPorStatus(['triagem pendente', 'encaminhado para triagem']);
  }

  /**
   * Retorna atendimentos com status Em Triagem (igual ao card antigo)
   */
  getEmTriagem(): number {
    return this.contarAtendimentosPorStatus(['em_triagem', 'em triagem']);
  }

  /**
   * Retorna atendimentos com status Aguardando Médico (igual ao card antigo)
   */
  getAguardandoMedico(): number {
    return this.contarAtendimentosPorStatus([
      'encaminhado_para_sala_medica',
      'encaminhado para sala médica',
      'aguardando',
      'aguardando_atendimento',
      'aguardando atendimento'
    ]);
  }

  /**
   * Retorna atendimentos com status Em Atendimento (igual ao card antigo)
   */
  getEmAtendimento(): number {
    return this.contarAtendimentosPorStatus([
      'em_atendimento_medico',
      'em atendimento médico',
      'em_atendimento',
      'em atendimento',
      'em_atendimento_ambulatorial',
      'em atendimento ambulatorial'
    ]);
  }

  /**
   * Retorna atendimentos com status Finalizados (igual ao card antigo)
   */
  getFinalizados(): number {
    return this.contarAtendimentosPorStatus([
      'atendimento_concluido',
      'atendimento concluido',
      'finalizado',
      'alta_ambulatorial',
      'encaminhado_para_exames',
      'encaminhado para exames'
    ]);
  }

  /**
   * Retorna atendimentos com status Interrompidos (igual ao card antigo)
   */
  getInterrompidos(): number {
    return this.contarAtendimentosPorStatus(['interrompido', 'abandonado']);
  }

  /**
   * Função principal que processa todos os dados em ordem:
   * 1. Filtros do formulário
   * 2. Aba selecionada
   * 3. Busca por texto
   */
  getDadosProcessados(): Paciente[] {
    let lista = [...this.pacientesFiltrados];

    // 1. Aplicar filtros do formulário (já aplicados pelo backend em pacientesFiltrados)
    // Os filtros de data, sexo, município, UF, estado civil e escolaridade já vêm do backend

    // 2. Aplicar filtro por aba (status de atendimento)
    lista = this.aplicarFiltroAba(lista);

    // 3. Aplicar busca por texto (se houver)
    lista = this.aplicarBusca(lista);

    return lista;
  }

  /**
   * Aplica filtro de aba baseado no status de atendimento (usa STATUS_MAP)
   */
  private aplicarFiltroAba(lista: Paciente[]): Paciente[] {
    if (this.abaAtiva === 'todas') return lista;

    const statusDaAba = this.STATUS_MAP[this.abaAtiva] || [];
    if (statusDaAba.length === 0) return lista;

    const pacientesComStatus = this.atendimentos
      .filter(a => statusDaAba.some(s => (a.status || '').toLowerCase().trim() === s.toLowerCase()))
      .map(a => a.paciente_id);

    return lista.filter(p => pacientesComStatus.includes(p.id));
  }

  /**
   * Aplica busca por texto no nome do paciente
   */
  private aplicarBusca(lista: Paciente[]): Paciente[] {
    if (!this.termoBusca || this.termoBusca.trim() === '') return lista;

    const termo = this.termoBusca.toLowerCase().trim();
    return lista.filter(p => p.nome.toLowerCase().includes(termo));
  }

  /**
   * Retorna o número de pacientes filtrados pela aba ativa (usado nas abas)
   */
  getPacientesPorAba(aba: string): number {
    switch (aba) {
      case 'todas': return this.getTotal();
      case 'triagem_pendente': return this.getTriagemPendente();
      case 'em_triagem': return this.getEmTriagem();
      case 'aguardando_medico': return this.getAguardandoMedico();
      case 'em_atendimento': return this.getEmAtendimento();
      case 'finalizados': return this.getFinalizados();
      case 'interrompidos': return this.getInterrompidos();
      default: return 0;
    }
  }

  // Termo de busca
  termoBusca = '';

  /**
   * Aplica busca por texto
   */
  aplicarBuscaTexto(event: Event) {
    const input = event.target as HTMLInputElement;
    this.termoBusca = input.value;
    this.currentPage = 0;
    this.updatePagination();
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
    const dadosProcessados = this.getDadosProcessados();
    this.totalPages = Math.ceil(dadosProcessados.length / this.pageSize);
    if (this.currentPage >= this.totalPages) {
      this.currentPage = Math.max(0, this.totalPages - 1);
    }
    this.updatePaginatedData();
  }

  updatePaginatedData() {
    const dadosProcessados = this.getDadosProcessados();
    const startIndex = this.currentPage * this.pageSize;
    const endIndex = startIndex + this.pageSize;
    this.paginatedPacientes = dadosProcessados.slice(startIndex, endIndex);
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
