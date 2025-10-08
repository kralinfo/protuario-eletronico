import { Component, AfterViewInit, AfterViewChecked } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Chart, registerables } from 'chart.js';
import { DashboardAdministracaoService } from './dashboard-administracao.service';
import { HttpClientModule } from '@angular/common/http';

@Component({
  selector: 'app-dashboard-administracao',
  templateUrl: './dashboard-administracao.component.html',
  styleUrls: ['./dashboard-administracao.component.scss'],
  standalone: true,
  imports: [MatIconModule, CommonModule, FormsModule, HttpClientModule]
})
export class DashboardAdministracaoComponent implements AfterViewInit, AfterViewChecked {
  // Dados mock para gráficos
  atendimentosPorPeriodo = {
    semana: [12, 18, 9, 15, 22, 17, 10],
    ano: [120, 98, 150, 130, 170, 160, 140, 180, 200, 190, 210, 220]
  };
  periodoSelecionado: 'semana' | 'ano' = 'semana';

  classificacaoRisco = [
    { label: 'Vermelha', value: 40, color: '#e53935' },
    { label: 'Amarela', value: 30, color: '#fbc02d' },
    { label: 'Verde', value: 20, color: '#43a047' },
    { label: 'Azul', value: 10, color: '#1e88e5' }
  ];

  tempoMedioEsperaSemana = 32; // minutos
  tempoMedioEsperaAno = 45; // minutos

  sexoDistribuicaoSemana = [
    { label: 'Masculino', value: 55, color: '#42a5f5' },
    { label: 'Feminino', value: 45, color: '#ec407a' }
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
  faixaEtariaAno = [
    { faixa: '0-12', value: 20 },
    { faixa: '13-18', value: 15 },
    { faixa: '19-35', value: 35 },
    { faixa: '36-60', value: 30 },
    { faixa: '60+', value: 25 }
  ];

  barChartSemanaInstance: Chart | null = null;
  barChartAnoInstance: Chart | null = null;
  pieChartSemanaInstance: Chart | null = null;
  pieChartAnoInstance: Chart | null = null;
  donutChartSemanaInstance: Chart | null = null;
  donutChartAnoInstance: Chart | null = null;
  ageChartSemanaInstance: Chart | null = null;
  ageChartAnoInstance: Chart | null = null;

  private lastPeriodoSelecionado: 'semana' | 'ano' = 'semana';
  private isLoading = false;
  private dadosCarregados = false;

  // Adicione variáveis para labels vindos do backend
  semanaLabels: string[] = [];
  anoLabels: string[] = [];

  constructor(private dashboardService: DashboardAdministracaoService) {
    Chart.register(...registerables);
  }

  fetchAtendimentosPorPeriodo() {
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

  atualizarGraficoBarra() {
    // Destroi gráficos anteriores se existirem
    if (this.barChartSemanaInstance) {
      this.barChartSemanaInstance.destroy();
      this.barChartSemanaInstance = null;
    }
    if (this.barChartAnoInstance) {
      this.barChartAnoInstance.destroy();
      this.barChartAnoInstance = null;
    }
    // Renderiza o gráfico correto
    if (this.periodoSelecionado === 'semana') {
      this.renderBarChartSemana();
    } else {
      this.renderBarChartAno();
    }
  }

  atualizarGraficoClassificacaoRisco() {
    if (this.pieChartSemanaInstance) {
      this.pieChartSemanaInstance.destroy();
      this.pieChartSemanaInstance = null;
    }
    if (this.pieChartAnoInstance) {
      this.pieChartAnoInstance.destroy();
      this.pieChartAnoInstance = null;
    }
    if (this.periodoSelecionado === 'semana') {
      this.renderPieChartSemana();
    } else {
      this.renderPieChartAno();
    }
  }

  atualizarGraficoDistribuicaoSexo() {
    if (this.donutChartSemanaInstance) {
      this.donutChartSemanaInstance.destroy();
      this.donutChartSemanaInstance = null;
    }
    if (this.donutChartAnoInstance) {
      this.donutChartAnoInstance.destroy();
      this.donutChartAnoInstance = null;
    }
    if (this.periodoSelecionado === 'semana') {
      this.renderDonutChartSemana();
    } else {
      this.renderDonutChartAno();
    }
  }

  atualizarGraficoFaixaEtaria() {
    if (this.ageChartSemanaInstance) {
      this.ageChartSemanaInstance.destroy();
      this.ageChartSemanaInstance = null;
    }
    if (this.ageChartAnoInstance) {
      this.ageChartAnoInstance.destroy();
      this.ageChartAnoInstance = null;
    }
    if (this.periodoSelecionado === 'semana') {
      this.renderAgeChartSemana();
    } else {
      this.renderAgeChartAno();
    }
  }

  ngAfterViewInit() {
    setTimeout(() => {
      this.fetchAtendimentosPorPeriodo();
      this.atualizarGraficoClassificacaoRisco();
      this.atualizarGraficoDistribuicaoSexo();
      this.atualizarGraficoFaixaEtaria();
    }, 100);
  }

  ngAfterViewChecked(): void {
    if (this.lastPeriodoSelecionado !== this.periodoSelecionado) {
      console.log(`🔄 [COMPONENT] Mudança de período: ${this.lastPeriodoSelecionado} → ${this.periodoSelecionado}`);
      this.fetchAtendimentosPorPeriodo();
      this.atualizarGraficoClassificacaoRisco();
      this.atualizarGraficoDistribuicaoSexo();
      this.atualizarGraficoFaixaEtaria();
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
    return this.periodoSelecionado === 'semana' ? this.tempoMedioEsperaSemana : this.tempoMedioEsperaAno;
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
          scales: { y: { beginAtZero: true } }
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
          scales: { y: { beginAtZero: true } }
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
          labels: this.classificacaoRisco.map(r => r.label),
          datasets: [{
            data: this.classificacaoRisco.map(r => r.value),
            backgroundColor: this.classificacaoRisco.map(r => r.color)
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

  renderPieChartAno() {
    const ctx = document.getElementById('pieChartAno') as HTMLCanvasElement;
    if (ctx) {
      // Exemplo de dados mockados para o ano
      this.pieChartAnoInstance = new Chart(ctx, {
        type: 'pie',
        data: {
          labels: this.classificacaoRisco.map(r => r.label),
          datasets: [{
            data: this.classificacaoRisco.map(r => r.value + 10), // Exemplo: valores diferentes para o ano
            backgroundColor: this.classificacaoRisco.map(r => r.color)
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

  renderDonutChartSemana() {
    const ctx = document.getElementById('donutChartSemana') as HTMLCanvasElement;
    if (ctx) {
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

  renderAgeChartAno() {
    const ctx = document.getElementById('ageChartAno') as HTMLCanvasElement;
    if (ctx) {
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
