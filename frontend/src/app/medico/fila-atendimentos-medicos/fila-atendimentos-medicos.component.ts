import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { MedicoService } from '../medico.service';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatChipsModule } from '@angular/material/chips';

@Component({
  selector: 'app-fila-atendimentos-medicos',
  templateUrl: './fila-atendimentos-medicos.component.html',
  styleUrls: ['./fila-atendimentos-medicos.component.scss'],
  standalone: true,
  imports: [CommonModule, MatCardModule, MatIconModule, MatButtonModule, MatChipsModule]
})
export class FilaAtendimentosMedicosComponent implements OnInit {
  constructor(private medicoService: MedicoService, private router: Router) {}

  abrirAtendimento(paciente: any) {
    this.router.navigate(['/medico/atendimento', paciente.id]);
  }
  // Cores para classificação de risco
  private coresPrioridade: Record<string, string> = {
    'vermelho': '#E53E3E',
    'laranja': '#FF8C00',
    'amarelo': '#F6E05E',
    'verde': '#48BB78',
    'azul': '#4299E1'
  };

  getCor(classificacao?: string): string {
    return classificacao ? this.coresPrioridade[classificacao] || '#757575' : '#757575';
  }

  getCorStatus(status: string): string {
    const cores: Record<string, string> = {
      'em_sala_medica': '#FF9800',
      'encaminhado_para_sala_medica': '#FF9800',
      'encaminhado para sala médica': '#FF9800',
      '3 - Encaminhado para sala médica': '#FF9800',
      'em_atendimento_medico': '#FF5722',
      'em atendimento médico': '#FF5722',
    };
    return cores[status] || '#757575';
  }

  getDescricaoStatus(status: string): string {
    const descricoes: Record<string, string> = {
      'em_sala_medica': 'Em Sala Médica',
      'encaminhado_para_sala_medica': 'Encaminhado para Sala Médica',
      'encaminhado para sala médica': 'Encaminhado para Sala Médica',
      '3 - Encaminhado para sala médica': 'Encaminhado para Sala Médica',
      'em_atendimento_medico': 'Em Atendimento Médico',
      'em atendimento médico': 'Em Atendimento Médico',
    };
    return descricoes[status] || status;
  }

  getIniciais(nome: string): string {
    return nome.split(' ').slice(0, 2).map(n => n.charAt(0)).join('').toUpperCase();
  }

  getIdade(nascimento: string): number {
    if (!nascimento) return 0;
    const hoje = new Date();
    const dataNasc = new Date(nascimento);
    let idade = hoje.getFullYear() - dataNasc.getFullYear();
    const mes = hoje.getMonth() - dataNasc.getMonth();
    if (mes < 0 || (mes === 0 && hoje.getDate() < dataNasc.getDate())) {
      idade--;
    }
    return idade;
  }

  formatarTempo(minutos: number): string {
    if (!minutos) return '0 min';
    if (minutos < 60) return minutos + ' min';
    const h = Math.floor(minutos / 60);
    const m = minutos % 60;
    return `${h}h ${m}min`;
  }

  formatarDataHora(dataHora: string): string {
    if (!dataHora) return '';
    return new Date(dataHora).toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  }
  atendimentos: any[] = [];


  ngOnInit(): void {
    const statusList = [
      'em_sala_medica',
      'encaminhado_para_sala_medica',
      'encaminhado para sala médica',
      '3 - Encaminhado para sala médica'
    ];
    this.medicoService.getAtendimentosPorStatus(statusList).subscribe((data: any[]) => {
      this.atendimentos = data;
    });
  }
}
