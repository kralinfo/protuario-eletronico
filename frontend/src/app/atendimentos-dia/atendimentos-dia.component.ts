import { Component, OnInit, OnDestroy, HostListener } from '@angular/core';
import { Router } from '@angular/router';
import { AtendimentoService } from '../services/atendimento.service';
import { PdfGeneratorService } from '../services/pdf-generator.service';
import { MatDialog } from '@angular/material/dialog';
import { ConfirmDialogComponent } from '../shared/confirm-dialog/confirm-dialog.component';
import { FeedbackDialogComponent } from '../shared/feedback-dialog/feedback-dialog.component';
import { AbandonoDialogComponent } from '../shared/abandono-dialog/abandono-dialog.component';
import { AuthService } from '../auth/auth.service';
import { DatePipe } from '@angular/common';
import { RealtimeService } from '../services/realtime.service';

@Component({
  selector: 'app-atendimentos-dia',
  templateUrl: './atendimentos-dia.component.html',
  styleUrls: ['../shared/styles/table-footer.css'],
  standalone: false,
  providers: [DatePipe]
})
export class AtendimentosDiaComponent implements OnInit, OnDestroy {
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

  constructor(
    private atendimentoService: AtendimentoService, 
    private pdfGeneratorService: PdfGeneratorService, 
    private dialog: MatDialog, 
    private router: Router, 
    private authService: AuthService,
    private realtimeService: RealtimeService
  ) {
    console.log('🚀 [AtendimentosDiaComponent] Inicializando componente');
  }

  ngOnInit() {
    console.log('🔌 [AtendimentosDiaComponent] Configurando listeners de realtime');
    
    // Inicializar com a data atual
    const hoje = new Date();
    this.dataInicial = hoje.toISOString().slice(0, 10);
    this.dataFinal = hoje.toISOString().slice(0, 10);
    this.carregarAtendimentos();

    // Conectar ao WebSocket de atendimentos
    this.realtimeService.connect('atendimentos').then(() => {
      console.log('✅ [AtendimentosDiaComponent] Conectado ao módulo de atendimentos');
      this._setupRealtimeListeners();
    }).catch(error => {
      console.error('❌ [AtendimentosDiaComponent] Erro ao conectar ao WebSocket:', error);
    });
  }

  /**
   * Configura listeners de eventos em tempo real
   * @private
   */
  private _setupRealtimeListeners(): void {
    console.log('📡 [AtendimentosDiaComponent] Registrando listeners');

    // Listener: Paciente foi transferido de atendimentos
    this.realtimeService.onPatientTransferred().subscribe(data => {
      console.log('📤 [AtendimentosDiaComponent] Paciente saiu - removendo da fila:', {
        patientId: data.patientId,
        patientName: data.patientName,
        timestamp: new Date().toISOString()
      });

      // Remover do array de atendimentos
      const index = this.atendimentos.findIndex(a => a.paciente_id === data.patientId);
      if (index > -1) {
        const removido = this.atendimentos[index];
        this.atendimentos.splice(index, 1);
        console.log('✅ [AtendimentosDiaComponent] Fila atualizada. Total:', this.atendimentos.length);
      }
    });

    // Listener: Novo paciente chegou
    this.realtimeService.onPatientArrived().subscribe(data => {
      console.log('🆕 [AtendimentosDiaComponent] Novo paciente chegou:', {
        patientId: data.patientId,
        patientName: data.patientName,
        timestamp: new Date().toISOString()
      });

      // Recarregar atendimentos para adicionar novo
      this.carregarAtendimentos();
    });

    console.log('✅ [AtendimentosDiaComponent] Listeners configurados');
  }

  /**
   * Cleanup ao destruir componente
   */
  ngOnDestroy(): void {
    console.log('🔌 [AtendimentosDiaComponent] Destruindo componente');
    this.realtimeService.disconnect();
    console.log('✅ [AtendimentosDiaComponent] Desconectado do WebSocket');
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
    const dataFormatada = new Date().toLocaleDateString('pt-BR');
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

    const formatarValor = (valor: any, padrao: string = 'Não informado') => {
      return (typeof valor === 'string' && valor.trim()) ? valor.trim() : padrao;
    };

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

    const printContent = `
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

          .logo {
            flex-shrink: 0;
          }

          .logo img {
            height: 60px;
            object-fit: contain;
          }

          .info {
            flex: 1;
            text-align: left;
          }

          .info h1 {
            margin: 0;
            font-size: 14px;
            color: #333;
          }

          .info p {
            margin: 0 0;
            font-size: 10px;
            color: #555;
            line-height: 1.2;
          }

          .title-section {
            text-align: center;
            margin-bottom: 8px;
          }

          .title-section h2 {
            margin: 0;
            font-size: 16px;
            letter-spacing: 0.5px;
            color: #333;
          }

          .title-section p {
            margin: 2px 0;
            font-size: 10px;
            color: #666;
          }

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

          .full {
            grid-column: span 2;
          }

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

          .line {
            border-bottom: 1px solid #ccc;
            height: 14px;
          }

          .signature {
            margin-top: 10px;
            display: flex;
            justify-content: space-between;
            gap: 15px;
          }

          .signature div {
            flex: 1;
            text-align: center;
          }

          .signature-line {
            margin-top: 12px;
            border-top: 1px solid #000;
            padding-top: 2px;
            font-size: 10px;
            font-weight: 600;
          }

          footer {
            margin-top: 8px;
            padding-top: 8px;
            border-top: 1px solid #e0e0e0;
            text-align: center;
            font-size: 9px;
            color: #999;
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
              <div class="value">${formatarValor(atendimento.paciente_nome)}</div>
            </div>
            <div class="field">
              <div class="label">Nome da Mãe</div>
              <div class="value">${formatarValor(atendimento.paciente_mae)}</div>
            </div>
            <div class="field">
              <div class="label">Data de Nascimento</div>
              <div class="value">${atendimento.paciente_nascimento ? new Date(atendimento.paciente_nascimento).toLocaleDateString('pt-BR') : 'Não informado'}</div>
            </div>
            <div class="field">
              <div class="label">Idade</div>
              <div class="value">${calcularIdade(atendimento.paciente_nascimento)}</div>
            </div>
            <div class="field">
              <div class="label">Sexo</div>
              <div class="value">${formatarSexo(atendimento.paciente_sexo)}</div>
            </div>
            <div class="field">
              <div class="label">Estado Civil</div>
              <div class="value">${formatarValor(atendimento.paciente_estado_civil)}</div>
            </div>
            <div class="field">
              <div class="label">Telefone</div>
              <div class="value">${formatarValor(atendimento.paciente_telefone)}</div>
            </div>
            <div class="field">
              <div class="label">Cartão SUS</div>
              <div class="value">${formatarValor(atendimento.paciente_sus)}</div>
            </div>
          </div>
        </fieldset>

        <fieldset>
          <legend>ENDEREÇO</legend>
          <div class="grid">
            <div class="field full">
              <div class="label">Endereço</div>
              <div class="value">${formatarValor(atendimento.paciente_endereco)}</div>
            </div>
            <div class="field">
              <div class="label">Bairro</div>
              <div class="value">${formatarValor(atendimento.paciente_bairro)}</div>
            </div>
            <div class="field">
              <div class="label">Município</div>
              <div class="value">${formatarValor(atendimento.paciente_municipio)}</div>
            </div>
            <div class="field">
              <div class="label">UF</div>
              <div class="value">${formatarValor(atendimento.paciente_uf)}</div>
            </div>
            <div class="field">
              <div class="label">CEP</div>
              <div class="value">${formatarValor(atendimento.paciente_cep)}</div>
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
  }

  async gerarAtendimentoPDF(atendimento: any) {
    try {
      // Mapear dados do atendimento para a estrutura esperada pelo serviço
      const paciente = {
        nome: atendimento.paciente_nome,
        mae: atendimento.paciente_mae,
        nascimento: atendimento.paciente_nascimento,
        sexo: atendimento.paciente_sexo,
        estado_civil: atendimento.paciente_estado_civil,
        telefone: atendimento.paciente_telefone,
        sus: atendimento.paciente_sus,
        endereco: atendimento.paciente_endereco,
        bairro: atendimento.paciente_bairro,
        municipio: atendimento.paciente_municipio,
        uf: atendimento.paciente_uf,
        cep: atendimento.paciente_cep
      };

      // Chamar serviço de geração de PDF
      await this.pdfGeneratorService.gerarFichaAtendimento(atendimento, paciente);

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
