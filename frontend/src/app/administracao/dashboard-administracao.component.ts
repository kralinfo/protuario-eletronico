import { Component, AfterViewInit, AfterViewChecked } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Chart, registerables } from 'chart.js';
import { DashboardAdministracaoService } from './dashboard-administracao.service';
import { HttpClientModule } from '@angular/common/http';
import { DetalhesAtendimentosModalComponent } from './detalhes-atendimentos-modal.component';

@Component({
  selector: 'app-dashboard-administracao',
  templateUrl: './dashboard-administracao.component.html',
  styleUrls: ['./dashboard-administracao.component.scss'],
  standalone: true,
  imports: [MatIconModule, CommonModule, FormsModule, HttpClientModule, DetalhesAtendimentosModalComponent]
})
export class DashboardAdministracaoComponent implements AfterViewInit, AfterViewChecked {
  // Dados mock para gráficos
  atendimentosPorPeriodo = {
    semana: [12, 18, 9, 15, 22, 17, 10],
    mes: [5, 8, 12, 6, 9, 15, 11, 7, 14, 10, 13, 8, 16, 9, 11, 18, 7, 12, 14, 6, 10, 15, 9, 13, 8, 11, 17, 12, 7, 14, 9],
    ano: [120, 98, 150, 130, 170, 160, 140, 180, 200, 190, 210, 220]
  };
  periodoSelecionado: 'semana' | 'mes' | 'ano' = 'semana';
  updating = false; // Flag para evitar atualizações múltiplas

  // Dados que serão carregados dos endpoints
  classificacaoRisco = [
    { label: 'Vermelha', value: 40, color: '#e53935' },
    { label: 'Amarela', value: 30, color: '#fbc02d' },
    { label: 'Verde', value: 20, color: '#43a047' },
    { label: 'Azul', value: 10, color: '#1e88e5' }
  ];

  // Dados reais de tempo médio (serão atualizados pelos endpoints)
  tempoMedioEsperaSemana = 32; // minutos
  tempoMedioEsperaMes = 38; // minutos
  tempoMedioEsperaAno = 45; // minutos

  // Dados reais de classificação de risco (serão atualizados pelos endpoints)
  classificacaoRiscoSemana = [
    { label: 'Vermelha', value: 40, color: '#e53935' },
    { label: 'Amarela', value: 30, color: '#fbc02d' },
    { label: 'Verde', value: 20, color: '#43a047' },
    { label: 'Azul', value: 10, color: '#1e88e5' }
  ];
  classificacaoRiscoMes = [
    { label: 'Vermelha', value: 45, color: '#e53935' },
    { label: 'Amarela', value: 35, color: '#fbc02d' },
    { label: 'Verde', value: 15, color: '#43a047' },
    { label: 'Azul', value: 5, color: '#1e88e5' }
  ];
  classificacaoRiscoAno = [
    { label: 'Vermelha', value: 50, color: '#e53935' },
    { label: 'Amarela', value: 25, color: '#fbc02d' },
    { label: 'Verde', value: 15, color: '#43a047' },
    { label: 'Azul', value: 10, color: '#1e88e5' }
  ];

  sexoDistribuicaoSemana = [
    { label: 'Masculino', value: 55, color: '#42a5f5' },
    { label: 'Feminino', value: 45, color: '#ec407a' }
  ];
  sexoDistribuicaoMes = [
    { label: 'Masculino', value: 58, color: '#42a5f5' },
    { label: 'Feminino', value: 42, color: '#ec407a' }
  ];
  sexoDistribuicaoAno = [
    { label: 'Masculino', value: 60, color: '#42a5f5' },
    { label: 'Feminino', value: 40, color: '#ec407a' }
  ];

  faixaEtariaSemana = [
    { faixa: '0-12', value: 15 },
    { faixa: '13-18', value: 10 },
    { faixa: '19-35', value: 30 },
    { faixa: '36-60', value: 25 },
    { faixa: '60+', value: 20 }
  ];
  faixaEtariaMes = [
    { faixa: '0-12', value: 18 },
    { faixa: '13-18', value: 12 },
    { faixa: '19-35', value: 32 },
    { faixa: '36-60', value: 28 },
    { faixa: '60+', value: 22 }
  ];
  faixaEtariaAno = [
    { faixa: '0-12', value: 20 },
    { faixa: '13-18', value: 15 },
    { faixa: '19-35', value: 35 },
    { faixa: '36-60', value: 30 },
    { faixa: '60+', value: 25 }
  ];

  barChartSemanaInstance: Chart | null = null;
  barChartMesInstance: Chart | null = null;
  barChartAnoInstance: Chart | null = null;
  pieChartSemanaInstance: Chart | null = null;
  pieChartMesInstance: Chart | null = null;
  pieChartAnoInstance: Chart | null = null;
  donutChartSemanaInstance: Chart | null = null;
  donutChartMesInstance: Chart | null = null;
  donutChartAnoInstance: Chart | null = null;
  ageChartSemanaInstance: Chart | null = null;
  ageChartMesInstance: Chart | null = null;
  ageChartAnoInstance: Chart | null = null;

  private lastPeriodoSelecionado: 'semana' | 'mes' | 'ano' = 'semana';
  private isLoading = false;
  private dadosCarregados = false;

  // Adicione variáveis para labels vindos do backend
  semanaLabels: string[] = [];
  mesLabels: string[] = [];
  anoLabels: string[] = [];

  // Variáveis para o modal
  modalVisible: boolean = false;
  modalPeriodo: string = '';
  modalLabel: string = '';
  modalAtendimentos: any[] = [];

  constructor(
    private dashboardService: DashboardAdministracaoService
  ) {
    Chart.register(...registerables);
  }

  // Métodos utilitários para verificar se os gráficos estão vazios
  isSexoDistribuicaoVazia(): boolean {
    const dados = this.periodoSelecionado === 'semana' ? this.sexoDistribuicaoSemana :
                  this.periodoSelecionado === 'mes' ? this.sexoDistribuicaoMes :
                  this.sexoDistribuicaoAno;
    return dados.every(item => item.value === 0);
  }

  isFaixaEtariaVazia(): boolean {
    const dados = this.periodoSelecionado === 'semana' ? this.faixaEtariaSemana :
                  this.periodoSelecionado === 'mes' ? this.faixaEtariaMes :
                  this.faixaEtariaAno;
    return dados.every(item => item.value === 0);
  }

  isClassificacaoRiscoVazia(): boolean {
    const dados = this.periodoSelecionado === 'semana' ? this.classificacaoRiscoSemana :
                  this.periodoSelecionado === 'mes' ? this.classificacaoRiscoMes :
                  this.classificacaoRiscoAno;
    return dados.every(item => item.value === 0);
  }

  isAtendimentosVazio(): boolean {
    const dados = this.atendimentosPorPeriodo[this.periodoSelecionado];
    return dados.every(value => value === 0);
  }

  abrirDetalhesAtendimentos(indice: number, label: string): void {
    console.log(`🔍 [COMPONENT] Abrindo detalhes para ${this.periodoSelecionado} - índice: ${indice}, label: ${label}`);

    // Criar título mais descritivo baseado no período
    let tituloDescritivo = '';
    switch (this.periodoSelecionado) {
      case 'semana':
        const diasSemana = ['Domingo', 'Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sábado'];
        tituloDescritivo = `Dia - ${diasSemana[indice]}`;
        break;
      case 'mes':
        tituloDescritivo = `Dia ${indice + 1}`;
        break;
      case 'ano':
        const meses = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
                      'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
        tituloDescritivo = `Mês - ${meses[indice]}`;
        break;
    }

    this.dashboardService.getDetalhesAtendimentos(this.periodoSelecionado, indice).subscribe(
      (atendimentos) => {
        this.modalPeriodo = this.periodoSelecionado;
        this.modalLabel = tituloDescritivo;
        this.modalAtendimentos = atendimentos;
        this.modalVisible = true;
      },
      (error) => {
        console.error('❌ [COMPONENT] Erro ao buscar detalhes dos atendimentos:', error);
      }
    );
  }

  fecharModal(): void {
    this.modalVisible = false;
    this.modalPeriodo = '';
    this.modalLabel = '';
    this.modalAtendimentos = [];
  }

  abrirModalClassificacaoRisco(classificacao: string): void {
    console.log(`🔍 [COMPONENT] Abrindo modal para classificação: ${classificacao}, período: ${this.periodoSelecionado}`);

    this.dashboardService.getAtendimentosPorClassificacao(classificacao, this.periodoSelecionado).subscribe(
      (atendimentos) => {
        this.modalPeriodo = this.periodoSelecionado;
        this.modalLabel = `Classificação: ${classificacao}`;
        this.modalAtendimentos = atendimentos;
        this.modalVisible = true;
      },
      (error) => {
        console.error('❌ [COMPONENT] Erro ao buscar atendimentos por classificação:', error);
      }
    );
  }

  // Função para mapear labels do frontend para valores do banco
  private mapearClassificacaoParaBanco(label: string): string {
    const mapeamento: { [key: string]: string } = {
      'vermelha': 'vermelho',
      'amarela': 'amarelo',
      'verde': 'verde',
      'azul': 'azul'
    };
    return mapeamento[label.toLowerCase()] || label.toLowerCase();
  }  fetchAtendimentosPorPeriodo() {
    console.log(`🚀 [COMPONENT] Iniciando fetch para período: ${this.periodoSelecionado}`);

    // Evita múltiplas chamadas simultâneas
    if (this.isLoading) {
      console.log('⚠️ [COMPONENT] Já carregando dados, ignorando nova chamada');
      return;
    }

    this.isLoading = true;

    if (this.periodoSelecionado === 'semana') {
      console.log('📅 [COMPONENT] Buscando dados por SEMANA...');
      this.dashboardService.getAtendimentosPorSemana().subscribe({
        next: (data) => {
          console.log('✅ [COMPONENT] Dados REAIS da semana recebidos:', data);
          this.atendimentosPorPeriodo.semana = data.counts;
          this.semanaLabels = data.dias;
          console.log('🔄 [COMPONENT] Atualizando gráfico de barras...');
          this.isLoading = false;
          this.dadosCarregados = true;
          setTimeout(() => this.atualizarGraficoBarra(), 100);
        },
        error: (error) => {
          console.error('❌ [COMPONENT] ERRO ao buscar dados da semana:', error);
          console.error('❌ [COMPONENT] Status:', error.status);
          console.error('❌ [COMPONENT] Message:', error.message);
          console.error('❌ [COMPONENT] URL:', error.url);
          // Usar dados zerados se a requisição falhar
          this.atendimentosPorPeriodo.semana = [0, 0, 0, 0];
          this.semanaLabels = ['Seg', 'Ter', 'Qua', 'Qui'];
          console.log('🔄 [COMPONENT] Usando dados MOCK da semana devido ao erro');
          this.isLoading = false;
          this.dadosCarregados = true;
          setTimeout(() => this.atualizarGraficoBarra(), 100);
        }
      });
    } else if (this.periodoSelecionado === 'mes') {
      console.log('📅 [COMPONENT] Buscando dados por MÊS...');
      this.dashboardService.getAtendimentosPorMes().subscribe({
        next: (data) => {
          console.log('✅ [COMPONENT] Dados REAIS do mês recebidos:', data);
          this.atendimentosPorPeriodo.mes = data.counts;
          this.mesLabels = data.dias;
          console.log('🔄 [COMPONENT] Atualizando gráfico de barras...');
          this.isLoading = false;
          this.dadosCarregados = true;
          setTimeout(() => this.atualizarGraficoBarra(), 100);
        },
        error: (error) => {
          console.error('❌ [COMPONENT] ERRO ao buscar dados do mês:', error);
          console.error('❌ [COMPONENT] Status:', error.status);
          console.error('❌ [COMPONENT] Message:', error.message);
          console.error('❌ [COMPONENT] URL:', error.url);
          // Usar dados zerados se a requisição falhar
          this.atendimentosPorPeriodo.mes = [0, 0, 0, 0, 0, 0, 0, 0, 0];
          this.mesLabels = ['1', '2', '3', '4', '5', '6', '7', '8', '9'];
          console.log('🔄 [COMPONENT] Usando dados MOCK do mês devido ao erro');
          this.isLoading = false;
          this.dadosCarregados = true;
          setTimeout(() => this.atualizarGraficoBarra(), 100);
        }
      });
    } else {
      console.log('📅 [COMPONENT] Buscando dados por ANO...');
      this.dashboardService.getAtendimentosPorAno().subscribe({
        next: (data) => {
          console.log('✅ [COMPONENT] Dados REAIS do ano recebidos:', data);
          this.atendimentosPorPeriodo.ano = data.counts;
          this.anoLabels = data.meses;
          console.log('🔄 [COMPONENT] Atualizando gráfico de barras...');
          this.isLoading = false;
          this.dadosCarregados = true;
          setTimeout(() => this.atualizarGraficoBarra(), 100);
        },
        error: (error) => {
          console.error('❌ [COMPONENT] ERRO ao buscar dados do ano:', error);
          console.error('❌ [COMPONENT] Status:', error.status);
          console.error('❌ [COMPONENT] Message:', error.message);
          console.error('❌ [COMPONENT] URL:', error.url);
          // Usar dados zerados se a requisição falhar
          this.atendimentosPorPeriodo.ano = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
          this.anoLabels = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out'];
          console.log('🔄 [COMPONENT] Usando dados MOCK do ano devido ao erro');
          this.isLoading = false;
          this.dadosCarregados = true;
          setTimeout(() => this.atualizarGraficoBarra(), 100);
        }
      });
    }
  }

  fetchTempoMedioPorPeriodo() {
    console.log(`🚀 [COMPONENT] Buscando tempo médio para período: ${this.periodoSelecionado}`);

    if (this.periodoSelecionado === 'semana') {
      this.dashboardService.getTempoMedioPorSemana().subscribe({
        next: (data) => {
          console.log('✅ [COMPONENT] Tempo médio REAL da semana recebido:', data);
          this.tempoMedioEsperaSemana = data.tempoMedioMinutos;
        },
        error: (error) => {
          console.error('❌ [COMPONENT] ERRO ao buscar tempo médio da semana:', error);
          this.tempoMedioEsperaSemana = 32; // valor padrão
        }
      });
    } else if (this.periodoSelecionado === 'mes') {
      this.dashboardService.getTempoMedioPorMes().subscribe({
        next: (data) => {
          console.log('✅ [COMPONENT] Tempo médio REAL do mês recebido:', data);
          this.tempoMedioEsperaMes = data.tempoMedioMinutos;
        },
        error: (error) => {
          console.error('❌ [COMPONENT] ERRO ao buscar tempo médio do mês:', error);
          this.tempoMedioEsperaMes = 38; // valor padrão
        }
      });
    } else {
      this.dashboardService.getTempoMedioPorAno().subscribe({
        next: (data) => {
          console.log('✅ [COMPONENT] Tempo médio REAL do ano recebido:', data);
          this.tempoMedioEsperaAno = data.tempoMedioMinutos;
        },
        error: (error) => {
          console.error('❌ [COMPONENT] ERRO ao buscar tempo médio do ano:', error);
          this.tempoMedioEsperaAno = 45; // valor padrão
        }
      });
    }
  }

  fetchClassificacaoRiscoPorPeriodo() {
    console.log(`🚀 [COMPONENT] Buscando classificação de risco para período: ${this.periodoSelecionado}`);

    if (this.periodoSelecionado === 'semana') {
      this.dashboardService.getClassificacaoRiscoPorSemana().subscribe({
        next: (data) => {
          console.log('✅ [COMPONENT] Classificação de risco REAL da semana recebida:', data);
          this.classificacaoRiscoSemana = data.classificacoes;
          setTimeout(() => this.atualizarGraficoClassificacaoRisco(), 100);
        },
        error: (error) => {
          console.error('❌ [COMPONENT] ERRO ao buscar classificação de risco da semana:', error);
          // usa dados padrão
          setTimeout(() => this.atualizarGraficoClassificacaoRisco(), 100);
        }
      });
    } else if (this.periodoSelecionado === 'mes') {
      this.dashboardService.getClassificacaoRiscoPorMes().subscribe({
        next: (data) => {
          console.log('✅ [COMPONENT] Classificação de risco REAL do mês recebida:', data);
          this.classificacaoRiscoMes = data.classificacoes;
          setTimeout(() => this.atualizarGraficoClassificacaoRisco(), 100);
        },
        error: (error) => {
          console.error('❌ [COMPONENT] ERRO ao buscar classificação de risco do mês:', error);
          // usa dados padrão
          setTimeout(() => this.atualizarGraficoClassificacaoRisco(), 100);
        }
      });
    } else {
      this.dashboardService.getClassificacaoRiscoPorAno().subscribe({
        next: (data) => {
          console.log('✅ [COMPONENT] Classificação de risco REAL do ano recebida:', data);
          this.classificacaoRiscoAno = data.classificacoes;
          setTimeout(() => this.atualizarGraficoClassificacaoRisco(), 100);
        },
        error: (error) => {
          console.error('❌ [COMPONENT] ERRO ao buscar classificação de risco do ano:', error);
          // usa dados padrão
          setTimeout(() => this.atualizarGraficoClassificacaoRisco(), 100);
        }
      });
    }
  }

  ngOnInit() {
    // Renderiza inicialmente com dados mock e, em seguida, atualiza com dados reais do backend
    this.atualizarGraficoDonut();
    this.atualizarGraficoDistribuicaoSexo();
  }

  atualizarGraficoDonut() {
    // Evita atualizações múltiplas rapidamente
    if (this.updating) {
      return;
    }
    this.updating = true;

    // Destroi instâncias existentes
    if (this.donutChartSemanaInstance) {
      this.donutChartSemanaInstance.destroy();
      this.donutChartSemanaInstance = null;
    }
    if (this.donutChartMesInstance) {
      this.donutChartMesInstance.destroy();
      this.donutChartMesInstance = null;
    }
    if (this.donutChartAnoInstance) {
      this.donutChartAnoInstance.destroy();
      this.donutChartAnoInstance = null;
    }

    // Recria apenas o gráfico visível conforme o período selecionado
    setTimeout(() => {
      try {
        if (this.periodoSelecionado === 'semana') {
          this.renderDonutChartSemana();
        } else if (this.periodoSelecionado === 'mes') {
          this.renderDonutChartMes();
        } else {
          this.renderDonutChartAno();
        }
      } catch (error) {
        console.error('❌ [COMPONENT] Erro ao renderizar gráfico donut:', error);
      } finally {
        this.updating = false;
      }
    }, 100);
  }

  fetchDistribuicaoPorSexo() {
    console.log(`🚀 [COMPONENT] Buscando distribuição por sexo para o período: ${this.periodoSelecionado}`);
    this.dashboardService.getDistribuicaoPorSexo(this.periodoSelecionado).subscribe(
      (data) => {
        console.log('📊 [COMPONENT] Resultado da distribuição por sexo:', data);
      },
      (error) => {
        console.error('❌ [COMPONENT] Erro ao buscar distribuição por sexo:', error);
      }
    );
  }

  atualizarGraficoBarra() {
    // Destroi gráficos anteriores se existirem
    if (this.barChartSemanaInstance) {
      this.barChartSemanaInstance.destroy();
      this.barChartSemanaInstance = null;
    }
    if (this.barChartMesInstance) {
      this.barChartMesInstance.destroy();
      this.barChartMesInstance = null;
    }
    if (this.barChartAnoInstance) {
      this.barChartAnoInstance.destroy();
      this.barChartAnoInstance = null;
    }
    // Renderiza o gráfico correto
    if (this.periodoSelecionado === 'semana') {
      this.renderBarChartSemana();
    } else if (this.periodoSelecionado === 'mes') {
      this.renderBarChartMes();
    } else {
      this.renderBarChartAno();
    }

    // Atualiza também o gráfico de distribuição por sexo
    this.atualizarGraficoDistribuicaoSexo();
  }

  atualizarGraficoClassificacaoRisco() {
    if (this.pieChartSemanaInstance) {
      this.pieChartSemanaInstance.destroy();
      this.pieChartSemanaInstance = null;
    }
    if (this.pieChartMesInstance) {
      this.pieChartMesInstance.destroy();
      this.pieChartMesInstance = null;
    }
    if (this.pieChartAnoInstance) {
      this.pieChartAnoInstance.destroy();
      this.pieChartAnoInstance = null;
    }
    if (this.periodoSelecionado === 'semana') {
      this.renderPieChartSemana();
    } else if (this.periodoSelecionado === 'mes') {
      this.renderPieChartMes();
    } else {
      this.renderPieChartAno();
    }
  }

  atualizarGraficoDistribuicaoSexo() {
    console.log(`🚀 [COMPONENT] Buscando distribuição por sexo para período: ${this.periodoSelecionado}`);

    this.dashboardService.getDistribuicaoPorSexo(this.periodoSelecionado).subscribe(
      (response) => {
        console.log('📊 [COMPONENT] Resposta recebida da distribuição por sexo:', response);

        // Verifica se a resposta tem o formato correto
        if (!response || !response.data) {
          console.error('❌ [COMPONENT] Formato de resposta inválido:', response);
          this.atualizarGraficoDonut();
          return;
        }

        // Backend retorna masculino/feminino, mas também aceita M/F para compatibilidade
        const masculino = response.data.masculino || response.data.M || 0;
        const feminino = response.data.feminino || response.data.F || 0;
        const total = masculino + feminino;

        // Log informativo sobre o tipo de dados
        if (response.real) {
          console.log(`📈 [COMPONENT] 🎯 DADOS REAIS: M=${masculino}, F=${feminino}, Total=${total} para período ${this.periodoSelecionado}`);
        } else if (response.fallback) {
          console.log(`📈 [COMPONENT] 🔄 DADOS MOCK (fallback): M=${masculino}, F=${feminino} para período ${this.periodoSelecionado}`);
        } else {
          console.log(`📈 [COMPONENT] Dados obtidos: M=${masculino}, F=${feminino} para período ${this.periodoSelecionado}`);
        }

        // Atualiza apenas o array do período atual
        const distribuicaoAtualizada = [
          { label: 'Masculino', value: masculino, color: '#42a5f5' },
          { label: 'Feminino', value: feminino, color: '#ec407a' }
        ];

        if (this.periodoSelecionado === 'semana') {
          this.sexoDistribuicaoSemana = distribuicaoAtualizada;
        } else if (this.periodoSelecionado === 'mes') {
          this.sexoDistribuicaoMes = distribuicaoAtualizada;
        } else {
          this.sexoDistribuicaoAno = distribuicaoAtualizada;
        }

        // Reconstrói apenas o gráfico do período atual
        // Se total = 0, o gráfico ficará em branco (como outros gráficos do dashboard)
        if (total === 0) {
          console.log('ℹ️ [COMPONENT] Total = 0, gráfico ficará em branco');
        }
        this.atualizarGraficoDonut();
      },
      (error) => {
        console.error('❌ [COMPONENT] Erro ao buscar distribuição por sexo:', error);
        console.error('❌ [COMPONENT] Detalhes do erro:', error.error || error.message);

        // Ainda assim renderiza o gráfico para não ficar em branco
        this.atualizarGraficoDonut();
      }
    );
  }

  atualizarGraficoFaixaEtaria() {
    console.log('📊 [DEBUG - FAIXA ETÁRIA] Atualizando gráfico com os dados:',
      this.periodoSelecionado === 'semana' ? this.faixaEtariaSemana :
      this.periodoSelecionado === 'mes' ? this.faixaEtariaMes :
      this.faixaEtariaAno
    );

    // Destroi instâncias existentes
    if (this.ageChartSemanaInstance) {
      this.ageChartSemanaInstance.destroy();
      this.ageChartSemanaInstance = null;
    }
    if (this.ageChartMesInstance) {
      this.ageChartMesInstance.destroy();
      this.ageChartMesInstance = null;
    }
    if (this.ageChartAnoInstance) {
      this.ageChartAnoInstance.destroy();
      this.ageChartAnoInstance = null;
    }
    // Recria apenas o gráfico visível conforme o período selecionado
    setTimeout(() => {
      try {
        if (this.periodoSelecionado === 'semana') {
          this.renderAgeChartSemana();
        } else if (this.periodoSelecionado === 'mes') {
          this.renderAgeChartMes();
        } else {
          this.renderAgeChartAno();
        }
      } catch (error) {
        console.error('❌ [COMPONENT] Erro ao renderizar gráfico de faixa etária:', error);
      } finally {
        this.updating = false;
      }
    }, 100);
  }

  ngAfterViewInit() {
    setTimeout(() => {
      this.fetchAtendimentosPorPeriodo();
      this.fetchTempoMedioPorPeriodo();
      this.fetchClassificacaoRiscoPorPeriodo();
      this.atualizarGraficoDistribuicaoSexo();
        this.fetchDistribuicaoPorFaixaEtaria();
      // Garante render inicial do donut após o DOM estar pronto
      this.atualizarGraficoDonut();
    }, 100);
  }
  fetchDistribuicaoPorFaixaEtaria() {
    console.log(`🚀 [COMPONENT] Buscando distribuição por faixa etária para período: ${this.periodoSelecionado}`);
    this.dashboardService.getDistribuicaoPorFaixaEtaria(this.periodoSelecionado).subscribe(
      (response) => {
        console.log('📊 [COMPONENT] Resposta recebida da distribuição por faixa etária:', response);
        if (!response || !response.data) {
          console.error('❌ [COMPONENT] Formato de resposta inválido:', response);
          this.atualizarGraficoFaixaEtaria();
          return;
        }

        // Log inicial para confirmar execução do método
        console.log('📊 [DEBUG - FAIXA ETÁRIA] Método fetchDistribuicaoPorFaixaEtaria chamado para o período:', this.periodoSelecionado);

        // Adicionando logs mais específicos para depuração dos dados recebidos para faixa etária
        console.log('📊 [DEBUG - FAIXA ETÁRIA] Dados recebidos do backend para o período:', this.periodoSelecionado, response.data);

        // Mapeia dados para array de faixas
        const faixas = [
          { faixa: '0-12', value: response.data['0-12'] || 0 },
          { faixa: '13-18', value: response.data['13-18'] || 0 },
          { faixa: '19-35', value: response.data['19-35'] || 0 },
          { faixa: '36-60', value: response.data['36-60'] || 0 },
          { faixa: '60+', value: response.data['60+'] || 0 }
        ];

        console.log('📊 [DEBUG - FAIXA ETÁRIA] Dados mapeados para o gráfico:', faixas);

        if (this.periodoSelecionado === 'semana') {
          this.faixaEtariaSemana = faixas;
        } else if (this.periodoSelecionado === 'mes') {
          this.faixaEtariaMes = faixas;
        } else {
          this.faixaEtariaAno = faixas;
        }

        console.log(`📊 [DEBUG - FAIXA ETÁRIA] Dados atribuídos ao gráfico para o período ${this.periodoSelecionado}:`,
          this.periodoSelecionado === 'semana' ? this.faixaEtariaSemana :
          this.periodoSelecionado === 'mes' ? this.faixaEtariaMes :
          this.faixaEtariaAno
        );
        this.atualizarGraficoFaixaEtaria();
      },
      (error) => {
        console.error('❌ [COMPONENT] Erro ao buscar distribuição por faixa etária:', error);
        this.atualizarGraficoFaixaEtaria();
      }
    );
  }

  ngAfterViewChecked(): void {
    if (this.lastPeriodoSelecionado !== this.periodoSelecionado) {
      console.log(`🔄 [COMPONENT] Mudança de período: ${this.lastPeriodoSelecionado} → ${this.periodoSelecionado}`);
      this.fetchAtendimentosPorPeriodo();
      this.fetchTempoMedioPorPeriodo();
      this.fetchClassificacaoRiscoPorPeriodo();
      this.atualizarGraficoDistribuicaoSexo();
  this.fetchDistribuicaoPorFaixaEtaria();
      this.lastPeriodoSelecionado = this.periodoSelecionado;
    }

    // Só renderiza gráficos uma vez quando os dados foram carregados
    if (this.dadosCarregados && !this.isLoading) {
      setTimeout(() => {
        if (this.periodoSelecionado === 'semana') {
          const ctx = document.getElementById('barChartSemana') as HTMLCanvasElement;
          if (ctx && this.semanaLabels.length && this.atendimentosPorPeriodo.semana.length && !this.barChartSemanaInstance) {
            this.atualizarGraficoBarra();
          }
        } else if (this.periodoSelecionado === 'mes') {
          const ctx = document.getElementById('barChartMes') as HTMLCanvasElement;
          if (ctx && this.mesLabels.length && this.atendimentosPorPeriodo.mes.length && !this.barChartMesInstance) {
            this.atualizarGraficoBarra();
          }
        } else {
          const ctx = document.getElementById('barChartAno') as HTMLCanvasElement;
          if (ctx && this.anoLabels.length && this.atendimentosPorPeriodo.ano.length && !this.barChartAnoInstance) {
            this.atualizarGraficoBarra();
          }
        }
      }, 50);
    }
  }

  get tempoMedioEsperaAtual(): number {
    return this.periodoSelecionado === 'semana' ? this.tempoMedioEsperaSemana :
           this.periodoSelecionado === 'mes' ? this.tempoMedioEsperaMes :
           this.tempoMedioEsperaAno;
  }

  renderBarChartSemana() {
    const ctx = document.getElementById('barChartSemana') as HTMLCanvasElement;
    if (ctx) {
      this.barChartSemanaInstance = new Chart(ctx, {
        type: 'bar',
        data: {
          labels: this.semanaLabels.length ? this.semanaLabels : ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'],
          datasets: [{
            label: 'Atendimentos',
            data: this.atendimentosPorPeriodo.semana,
            backgroundColor: '#42a5f5'
          }]
        },
        options: {
          responsive: false,
          maintainAspectRatio: true,
          plugins: {
            legend: { display: false }
          },
          scales: { y: { beginAtZero: true } },
          onClick: (event, elements) => {
            if (elements.length > 0) {
              const index = elements[0].index;
              let realIndex = index;
              let label = '';

              if (this.semanaLabels && this.semanaLabels.length > 0) {
                // Usar os labels reais retornados pelo backend
                label = this.semanaLabels[index];

                // Converter o índice do array retornado para o índice real da semana
                // O backend retorna apenas os dias até hoje, mas o detalhesAtendimentos
                // espera o índice real do dia da semana (0=domingo, 1=segunda, etc.)
                const diasMap: Record<string, number> = {
                  'Seg': 1, 'Ter': 2, 'Qua': 3, 'Qui': 4,
                  'Sex': 5, 'Sáb': 6, 'Dom': 0
                };
                if (label in diasMap) {
                  realIndex = diasMap[label as keyof typeof diasMap];
                } else {
                  realIndex = index;
                }
              } else {
                // Fallback para o array padrão
                const defaultLabels = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'];
                label = defaultLabels[index];
                realIndex = index + 1; // Ajustar porque o array padrão começa com Segunda=0, mas queremos Segunda=1
                if (realIndex === 7) realIndex = 0; // Domingo
              }

              console.log(`🔍 [CLICK] Index clicado: ${index}, Label: ${label}, Index real: ${realIndex}`);
              this.abrirDetalhesAtendimentos(realIndex, label);
            }
          }
        }
      });
    }
  }

  renderBarChartMes() {
    const ctx = document.getElementById('barChartMes') as HTMLCanvasElement;
    if (ctx) {
      this.barChartMesInstance = new Chart(ctx, {
        type: 'bar',
        data: {
          labels: this.mesLabels.length ? this.mesLabels : ['1', '2', '3', '4', '5', '6', '7', '8', '9'],
          datasets: [{
            label: 'Atendimentos',
            data: this.atendimentosPorPeriodo.mes,
            backgroundColor: '#42a5f5'
          }]
        },
        options: {
          responsive: false,
          maintainAspectRatio: true,
          plugins: {
            legend: { display: false }
          },
          scales: { y: { beginAtZero: true } },
          onClick: (event, elements) => {
            if (elements.length > 0) {
              const index = elements[0].index;
              const label = this.mesLabels.length ? this.mesLabels[index] : ['1', '2', '3', '4', '5', '6', '7', '8', '9'][index];
              this.abrirDetalhesAtendimentos(index, label);
            }
          }
        }
      });
    }
  }

  renderBarChartAno() {
    const ctx = document.getElementById('barChartAno') as HTMLCanvasElement;
    if (ctx) {
      this.barChartAnoInstance = new Chart(ctx, {
        type: 'bar',
        data: {
          labels: this.anoLabels.length ? this.anoLabels : ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'],
          datasets: [{
            label: 'Atendimentos',
            data: this.atendimentosPorPeriodo.ano,
            backgroundColor: '#42a5f5'
          }]
        },
        options: {
          responsive: false,
          maintainAspectRatio: true,
          plugins: {
            legend: { display: false }
          },
          scales: { y: { beginAtZero: true } },
          onClick: (event, elements) => {
            if (elements.length > 0) {
              const index = elements[0].index;
              const label = this.anoLabels.length ? this.anoLabels[index] : ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'][index];
              this.abrirDetalhesAtendimentos(index, label);
            }
          }
        }
      });
    }
  }

  renderPieChartSemana() {
    const ctx = document.getElementById('pieChartSemana') as HTMLCanvasElement;
    if (ctx) {
      this.pieChartSemanaInstance = new Chart(ctx, {
        type: 'pie',
        data: {
          labels: this.classificacaoRiscoSemana.map(r => r.label),
          datasets: [{
            data: this.classificacaoRiscoSemana.map(r => r.value),
            backgroundColor: this.classificacaoRiscoSemana.map(r => r.color)
          }]
        },
        options: {
          responsive: false,
          maintainAspectRatio: true,
          plugins: {
            legend: {
              display: true,
              position: 'bottom'
            }
          },
          onClick: (event, elements) => {
            if (elements.length > 0) {
              const index = elements[0].index;
              const label = this.classificacaoRiscoSemana[index].label;
              const classificacao = this.mapearClassificacaoParaBanco(label);
              this.abrirModalClassificacaoRisco(classificacao);
            }
          }
        }
      });
    }
  }

  renderPieChartMes() {
    const ctx = document.getElementById('pieChartMes') as HTMLCanvasElement;
    if (ctx) {
      this.pieChartMesInstance = new Chart(ctx, {
        type: 'pie',
        data: {
          labels: this.classificacaoRiscoMes.map(r => r.label),
          datasets: [{
            data: this.classificacaoRiscoMes.map(r => r.value),
            backgroundColor: this.classificacaoRiscoMes.map(r => r.color)
          }]
        },
        options: {
          responsive: false,
          maintainAspectRatio: true,
          plugins: {
            legend: {
              display: true,
              position: 'bottom'
            }
          },
          onClick: (event, elements) => {
            if (elements.length > 0) {
              const index = elements[0].index;
              const label = this.classificacaoRiscoMes[index].label;
              const classificacao = this.mapearClassificacaoParaBanco(label);
              this.abrirModalClassificacaoRisco(classificacao);
            }
          }
        }
      });
    }
  }

  renderPieChartAno() {
    const ctx = document.getElementById('pieChartAno') as HTMLCanvasElement;
    if (ctx) {
      this.pieChartAnoInstance = new Chart(ctx, {
        type: 'pie',
        data: {
          labels: this.classificacaoRiscoAno.map(r => r.label),
          datasets: [{
            data: this.classificacaoRiscoAno.map(r => r.value),
            backgroundColor: this.classificacaoRiscoAno.map(r => r.color)
          }]
        },
        options: {
          responsive: false,
          maintainAspectRatio: true,
          plugins: {
            legend: {
              display: true,
              position: 'bottom'
            }
          },
          onClick: (event, elements) => {
            if (elements.length > 0) {
              const index = elements[0].index;
              const label = this.classificacaoRiscoAno[index].label;
              const classificacao = this.mapearClassificacaoParaBanco(label);
              this.abrirModalClassificacaoRisco(classificacao);
            }
          }
        }
      });
    }
  }

  renderDonutChartSemana() {
    const ctx = document.getElementById('donutChartSemana') as HTMLCanvasElement;
    if (ctx) {
      try {
        // Destruir instância existente se houver
        if (this.donutChartSemanaInstance) {
          this.donutChartSemanaInstance.destroy();
          this.donutChartSemanaInstance = null;
        }

        this.donutChartSemanaInstance = new Chart(ctx, {
          type: 'doughnut',
          data: {
            labels: this.sexoDistribuicaoSemana.map(s => s.label),
            datasets: [{
              data: this.sexoDistribuicaoSemana.map(s => s.value),
              backgroundColor: this.sexoDistribuicaoSemana.map(s => s.color)
            }]
          },
          options: {
            responsive: false,
            maintainAspectRatio: true,
            plugins: {
              legend: {
                display: true,
                position: 'bottom'
              }
            }
          }
        });
        console.log('✅ [COMPONENT] Gráfico donut semana renderizado com sucesso');
      } catch (error) {
        console.error('❌ [COMPONENT] Erro ao renderizar gráfico donut semana:', error);
      }
    }
  }

  renderDonutChartMes() {
    const ctx = document.getElementById('donutChartMes') as HTMLCanvasElement;
    if (ctx) {
      // Destruir instância existente antes de criar um novo gráfico
      if (this.donutChartMesInstance) {
        this.donutChartMesInstance.destroy();
        this.donutChartMesInstance = null;
      }

      this.donutChartMesInstance = new Chart(ctx, {
        type: 'doughnut',
        data: {
          labels: this.sexoDistribuicaoMes.map(s => s.label),
          datasets: [{
            data: this.sexoDistribuicaoMes.map(s => s.value),
            backgroundColor: this.sexoDistribuicaoMes.map(s => s.color)
          }]
        },
        options: {
          responsive: false,
          maintainAspectRatio: true,
          plugins: {
            legend: {
              display: true,
              position: 'bottom'
            }
          }
        }
      });
    }
  }

  renderDonutChartAno() {
    const ctx = document.getElementById('donutChartAno') as HTMLCanvasElement;
    if (ctx) {
      this.donutChartAnoInstance = new Chart(ctx, {
        type: 'doughnut',
        data: {
          labels: this.sexoDistribuicaoAno.map(s => s.label),
          datasets: [{
            data: this.sexoDistribuicaoAno.map(s => s.value),
            backgroundColor: this.sexoDistribuicaoAno.map(s => s.color)
          }]
        },
        options: {
          responsive: false,
          maintainAspectRatio: true,
          plugins: {
            legend: {
              display: true,
              position: 'bottom'
            }
          }
        }
      });
    }
  }

  renderAgeChartSemana() {
    const ctx = document.getElementById('ageChartSemana') as HTMLCanvasElement;
    if (ctx) {
      console.log('📊 [DEBUG - FAIXA ETÁRIA] Dados para o gráfico semanal:', this.faixaEtariaSemana);
      this.ageChartSemanaInstance = new Chart(ctx, {
        type: 'bar',
        data: {
          labels: this.faixaEtariaSemana.map(f => f.faixa),
          datasets: [{
            label: 'Pacientes',
            data: this.faixaEtariaSemana.map(f => f.value),
            backgroundColor: '#22c55e'
          }]
        },
        options: {
          responsive: false,
          maintainAspectRatio: true,
          plugins: {
            legend: { display: false }
          },
          scales: { y: { beginAtZero: true } }
        }
      });
    }
  }

  renderAgeChartMes() {
    const ctx = document.getElementById('ageChartMes') as HTMLCanvasElement;
    if (ctx) {
      console.log('📊 [DEBUG - FAIXA ETÁRIA] Dados para o gráfico mensal:', this.faixaEtariaMes);
      this.ageChartMesInstance = new Chart(ctx, {
        type: 'bar',
        data: {
          labels: this.faixaEtariaMes.map(f => f.faixa),
          datasets: [{
            label: 'Pacientes',
            data: this.faixaEtariaMes.map(f => f.value),
            backgroundColor: '#22c55e'
          }]
        },
        options: {
          responsive: false,
          maintainAspectRatio: true,
          plugins: {
            legend: { display: false }
          },
          scales: { y: { beginAtZero: true } }
        }
      });
    }
  }

  renderAgeChartAno() {
    const ctx = document.getElementById('ageChartAno') as HTMLCanvasElement;
    if (ctx) {
      console.log('📊 [DEBUG - FAIXA ETÁRIA] Dados para o gráfico anual:', this.faixaEtariaAno);
      this.ageChartAnoInstance = new Chart(ctx, {
        type: 'bar',
        data: {
          labels: this.faixaEtariaAno.map(f => f.faixa),
          datasets: [{
            label: 'Pacientes',
            data: this.faixaEtariaAno.map(f => f.value),
            backgroundColor: '#22c55e'
          }]
        },
        options: {
          responsive: false,
          maintainAspectRatio: true,
          plugins: {
            legend: { display: false }
          },
          scales: { y: { beginAtZero: true } }
        }
      });
    }
  }
}
