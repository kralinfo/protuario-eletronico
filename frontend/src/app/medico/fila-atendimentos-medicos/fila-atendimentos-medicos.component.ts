import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { MatDialog } from '@angular/material/dialog';
import { ClassificacaoDialogComponent } from 'src/app/classificacao-dialog/classificacao-dialog.component';
import { MedicoService } from '../medico.service';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatChipsModule } from '@angular/material/chips';

@Component({
  selector: 'app-fila-atendimentos-medicos',
  templateUrl: './fila-atendimentos-medicos.component.html',
  styleUrls: ['./fila-atendimentos-medicos.component.scss'],
  standalone: true,
  imports: [CommonModule, FormsModule, MatCardModule, MatIconModule, MatButtonModule, MatChipsModule]
})
export class FilaAtendimentosMedicosComponent implements OnInit {
  estatisticas: any = {
    por_classificacao: {
      vermelho: 0,
      laranja: 0,
      amarelo: 0,
      verde: 0,
      azul: 0
    }
  };
  getEncaminhadosParaAmbulatorioCount(): number {
    const hoje = new Date();
    const statusList = [
      'encaminhado para ambulatório',
      'encaminhado_para_ambulatorio',
      '5 - Encaminhado para ambulatório'
    ];
    return this.atendimentos?.filter(a => {
      if (!statusList.includes(a.status)) return false;
      let campoData = a.created_at || a.data_hora_atendimento;
      if (!campoData) return false;
      const data = new Date(campoData);
      return data.getDate() === hoje.getDate() &&
        data.getMonth() === hoje.getMonth() &&
        data.getFullYear() === hoje.getFullYear();
    })?.length || 0;
  }
  filtroStatus: string = 'encaminhado para sala médica';
  constructor(
    private medicoService: MedicoService,
    private router: Router,
    private dialog: MatDialog
  ) {}

  abrirDialogClassificacao() {
    this.dialog.open(ClassificacaoDialogComponent, {
      panelClass: ['p-0', 'max-w-3xl', 'w-full']
    });
  }

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

    getAguardandoAtendimentoCount(): number {
      const hoje = new Date();
      return this.atendimentos?.filter(a => {
        if (a.status !== 'encaminhado para sala médica') return false;
        let campoData = a.created_at || a.data_hora_atendimento;
        if (!campoData) return false;
        const data = new Date(campoData);
        return data.getDate() === hoje.getDate() &&
          data.getMonth() === hoje.getMonth() &&
          data.getFullYear() === hoje.getFullYear();
      })?.length || 0;
    }

  get atendimentosRecentes(): any[] {
    const agora = new Date();
    return this.atendimentos.filter(atendimento => {
      let campoData = atendimento.created_at;
      if (!campoData && atendimento.data_hora_atendimento) campoData = atendimento.data_hora_atendimento;
      if (!campoData) return false;
      const dataAtendimento = new Date(campoData);
      const diffMs = agora.getTime() - dataAtendimento.getTime();
      const diffHoras = diffMs / (1000 * 60 * 60);
      // Filtro por status
      if (this.filtroStatus) {
        if (this.filtroStatus === 'alta médica' || this.filtroStatus === 'Alta Médica') {
          if (atendimento.status !== 'atendimento_concluido') return false;
        } else {
          if (atendimento.status !== this.filtroStatus) return false;
        }
      }
      return diffHoras < 24;
    });
  }

  quantidadeEncaminhados: number = 0;

  calcularEncaminhadosParaAmbulatorio() {
    this.medicoService.getAtendimentosPorStatus(['encaminhado_para_ambulatorio']).subscribe((atendimentos: any[]) => {
      console.log('Atendimentos recebidos com status encaminhado_para_ambulatorio:', atendimentos);
      const agora = new Date();
      const encaminhadosUltimas24Horas = atendimentos.filter(a => {
        const campoData = a.created_at || a.data_hora_atendimento;
        if (!campoData) {
          console.log('Atendimento ignorado (sem data):', a);
          return false;
        }
        const dataAtendimento = new Date(campoData);
        console.log('Data do atendimento:', dataAtendimento, 'Status:', a.status);
        const diffHoras = (agora.getTime() - dataAtendimento.getTime()) / (1000 * 60 * 60);
        if (diffHoras > 24) {
          console.log('Atendimento ignorado (fora das últimas 24 horas):', a);
        }
        return diffHoras <= 24;
      });
      console.log('Atendimentos encaminhados para ambulatório nas últimas 24 horas:', encaminhadosUltimas24Horas);
      this.estatisticas.encaminhados_para_ambulatorio = encaminhadosUltimas24Horas.length;
      console.log('Total de encaminhados para ambulatório nas últimas 24 horas:', this.estatisticas.encaminhados_para_ambulatorio);
    });
  }

  ngOnInit(): void {
    this.medicoService.getAtendimentosPorStatus([
      'encaminhado para sala médica', '3 - Encaminhado para sala médica', 'encaminhado_para_sala_medica'
    ]).subscribe((atendimentos: any[]) => {
      const agora = new Date();
      const atendimentos24h = (atendimentos || []).filter(a => {
        let campoData = a.created_at || a.data_hora_atendimento;
        if (!campoData) return false;
        const dataAtendimento = new Date(campoData);
        const diffHoras = (agora.getTime() - dataAtendimento.getTime()) / (1000 * 60 * 60);
        return diffHoras <= 24;
      });

      this.quantidadeEncaminhados = atendimentos24h.filter(a => {
        const status = (a.status || '').toLowerCase().replace(/_/g, ' ').replace(/-/g, ' ');
        return status.includes('encaminhado para sala médica');
      }).length;
    });
    const statusList = [
      'encaminhado para sala médica',
      'em atendimento médico',
      'encaminhado_para_ambulatorio',
      'encaminhado_para_exames',
      'alta médica',
      'atendimento_concluido',
      'transferido',
      'óbito'
    ];
    this.medicoService.getAtendimentosPorStatus(statusList).subscribe((data: any[]) => {
      this.atendimentos = data;
      // Atualiza estatísticas por classificação apenas para atendimentos até 24h
      const agora = new Date();
      const por_classificacao = {
        vermelho: 0,
        laranja: 0,
        amarelo: 0,
        verde: 0,
        azul: 0
      };
      for (const p of data || []) {
        let campoData = p.created_at || p.data_hora_atendimento;
        if (!campoData) continue;
        const dataAtendimento = new Date(campoData);
        const diffHoras = (agora.getTime() - dataAtendimento.getTime()) / (1000 * 60 * 60);
        if (diffHoras > 24) continue;
        const risco = typeof p.classificacao_risco === 'string' ? p.classificacao_risco.toLowerCase() : '';
        switch (risco) {
          case 'vermelho':
          case 'laranja':
          case 'amarelo':
          case 'verde':
          case 'azul':
            por_classificacao[risco as keyof typeof por_classificacao]++;
            break;
        }
      }
      this.estatisticas.por_classificacao = por_classificacao;
    });
    this.calcularEncaminhadosParaAmbulatorio();
  }
}
