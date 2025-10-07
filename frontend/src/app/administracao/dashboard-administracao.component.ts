import { Component, AfterViewInit } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Chart, registerables } from 'chart.js';

@Component({
  selector: 'app-dashboard-administracao',
  templateUrl: './dashboard-administracao.component.html',
  styleUrls: ['./dashboard-administracao.component.scss'],
  standalone: true,
  imports: [MatIconModule, CommonModule, FormsModule]
})
export class DashboardAdministracaoComponent implements AfterViewInit {
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

  tempoMedioEspera = 32; // minutos

  sexoDistribuicao = [
    { label: 'Masculino', value: 55, color: '#42a5f5' },
    { label: 'Feminino', value: 45, color: '#ec407a' }
  ];

  faixaEtaria = [
    { faixa: '0-12', value: 15 },
    { faixa: '13-18', value: 10 },
    { faixa: '19-35', value: 30 },
    { faixa: '36-60', value: 25 },
    { faixa: '60+', value: 20 }
  ];

  constructor() {
    Chart.register(...registerables);
  }

  ngAfterViewInit() {
    setTimeout(() => {
      this.renderBarChart();
      this.renderPieChart();
      this.renderDonutChart();
      this.renderAgeChart();
    }, 100);
  }

  renderBarChart() {
    const ctx = document.getElementById('barChart') as HTMLCanvasElement;
    new Chart(ctx, {
      type: 'bar',
      data: {
        labels: this.periodoSelecionado === 'semana' ? ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'] : ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'],
        datasets: [{
          label: 'Atendimentos',
          data: this.periodoSelecionado === 'semana' ? this.atendimentosPorPeriodo.semana : this.atendimentosPorPeriodo.ano,
          backgroundColor: '#42a5f5'
        }]
      },
      options: {
        responsive: false,
        maintainAspectRatio: true,
        plugins: {
          legend: {
            display: false
          }
        },
        scales: {
          y: {
            beginAtZero: true
          }
        }
      }
    });
  }

  renderPieChart() {
    const ctx = document.getElementById('pieChart') as HTMLCanvasElement;
    new Chart(ctx, {
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

  renderDonutChart() {
    const ctx = document.getElementById('donutChart') as HTMLCanvasElement;
    new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels: this.sexoDistribuicao.map(s => s.label),
        datasets: [{
          data: this.sexoDistribuicao.map(s => s.value),
          backgroundColor: this.sexoDistribuicao.map(s => s.color)
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

  renderAgeChart() {
    const ctx = document.getElementById('ageChart') as HTMLCanvasElement;
    new Chart(ctx, {
      type: 'bar',
      data: {
        labels: this.faixaEtaria.map(f => f.faixa),
        datasets: [{
          label: 'Pacientes',
          data: this.faixaEtaria.map(f => f.value),
          backgroundColor: '#22c55e'
        }]
      },
      options: {
        responsive: false,
        maintainAspectRatio: true,
        plugins: {
          legend: {
            display: false
          }
        },
        scales: {
          y: {
            beginAtZero: true
          }
        }
      }
    });
  }
}
