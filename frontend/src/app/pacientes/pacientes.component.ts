// Removed duplicate misplaced methods outside the class
// Removed all misplaced pagination methods from the top of the file
import { Component, OnInit, ViewChild, AfterViewInit, ChangeDetectorRef } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { environment } from '../../environments/environment';
import { AuthService } from '../auth/auth.service';
import * as jsPDF from 'jspdf';
import { MatDialog } from '@angular/material/dialog';
import { RegistrarAtendimentoComponent } from '../atendimento/registrar-atendimento.component';

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

@Component({
    selector: 'app-pacientes',
    templateUrl: './pacientes.component.html',
    styleUrls: ['./pacientes.component.scss'],
    standalone: false
})
export class PacientesComponent implements OnInit, AfterViewInit {
  pageSizeOptions = [5, 10, 25, 50];
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
  imprimirPacientePDF(paciente: Paciente) {
    const doc = new jsPDF.jsPDF();

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
}
