import { Component, Inject, OnInit } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatDialogModule } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { AmbulatorioService } from '../ambulatorio.service';

@Component({
  selector: 'app-atendimento-ambulatorio-modal',
  templateUrl: './atendimento-ambulatorio-modal.component.html',
  styleUrls: ['./atendimento-ambulatorio-modal.component.scss'],
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatButtonModule,
    MatDialogModule,
    MatIconModule,
    MatExpansionModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule
  ]
})
export class AtendimentoAmbulatorioModalComponent implements OnInit {
  modoVisualizacao = true;
  atendimento: any = {};
  dadosTriagem: any = {};
  condutaMedicamentos: any = {};
  observacaoMedica: string = '';
  examesProcedimentos: any = {};
  informacoesComplementares: string = '';

  constructor(
    public dialogRef: MatDialogRef<AtendimentoAmbulatorioModalComponent>,
    @Inject(MAT_DIALOG_DATA) public data: any,
    private ambulatorioService: AmbulatorioService
  ) {
    if (data?.consulta) {
      this.atendimento = data.consulta;
      // Sempre inicia em modo visualização
      this.modoVisualizacao = data.modoVisualizacao !== false ? true : false;
    }
  }

  ngOnInit() {
    console.log('🏥 Modal ambulatorial iniciado com dados:', this.data);
    this.carregarDadosAtendimento();
  }

  carregarDadosAtendimento() {
    console.log('📋 Carregando dados do atendimento:', this.atendimento?.id);

    // Primeiro, usar os dados já disponíveis no objeto atendimento
    if (this.atendimento) {
      this.dadosTriagem = {
        classificacao_risco: this.atendimento.classificacao_risco,
        queixa_principal: this.atendimento.queixa_principal,
        sinais_vitais: this.atendimento.sinais_vitais,
        temperatura: this.atendimento.temperatura,
        pressao_arterial: this.atendimento.pressao_arterial,
        frequencia_cardiaca: this.atendimento.frequencia_cardiaca,
        saturacao: this.atendimento.saturacao_oxigenio
      };

      this.observacaoMedica = this.atendimento.observacao_medica || this.atendimento.observacoes || '';
      this.informacoesComplementares = this.atendimento.informacoes_complementares || '';

      // Tentar fazer parse dos dados ambulatoriais se existirem
      try {
        this.condutaMedicamentos = this.atendimento.conduta_ambulatorio ?
          (typeof this.atendimento.conduta_ambulatorio === 'string' ?
            JSON.parse(this.atendimento.conduta_ambulatorio) :
            this.atendimento.conduta_ambulatorio) :
          { conduta: '', medicamentos: '' };

        this.examesProcedimentos = this.atendimento.exames_ambulatorio ?
          (typeof this.atendimento.exames_ambulatorio === 'string' ?
            JSON.parse(this.atendimento.exames_ambulatorio) :
            this.atendimento.exames_ambulatorio) :
          { exames: '', procedimentos: '' };
      } catch (e) {
        console.log('⚠️ Erro ao fazer parse dos dados ambulatoriais, usando dados vazios');
        this.condutaMedicamentos = { conduta: '', medicamentos: '' };
        this.examesProcedimentos = { exames: '', procedimentos: '' };
      }

      console.log('✅ Dados carregados:', {
        dadosTriagem: this.dadosTriagem,
        observacaoMedica: this.observacaoMedica,
        condutaMedicamentos: this.condutaMedicamentos,
        examesProcedimentos: this.examesProcedimentos
      });
    }

    // Buscar dados adicionais do backend se necessário
    if (this.atendimento?.id) {
      this.ambulatorioService.getAtendimento(this.atendimento.id).subscribe({
        next: (dados: any) => {
          console.log('📦 Dados adicionais do backend:', dados);

          // Atualizar apenas se não temos dados ou se os dados do backend são mais completos
          if (!this.observacaoMedica && dados.observacao_medica) {
            this.observacaoMedica = dados.observacao_medica;
          }

          if (!this.informacoesComplementares && dados.informacoes_complementares) {
            this.informacoesComplementares = dados.informacoes_complementares;
          }
        },
        error: (err: any) => {
          console.error('❌ Erro ao carregar dados adicionais:', err);
          // Não é crítico, continuamos com os dados que já temos
        }
      });
    }
  }

  habilitarEdicao() {
    this.modoVisualizacao = false;
  }

  cancelar() {
    this.dialogRef.close({ cancelado: true });
  }

  salvar() {
    const dadosAmbulatorio = {
      conduta_ambulatorio: this.condutaMedicamentos,
      exames_ambulatorio: this.examesProcedimentos,
      informacoes_complementares: this.informacoesComplementares,
      status: 'em_atendimento_ambulatorial'
    };

    this.ambulatorioService.salvarAtendimentoAmbulatorio(this.atendimento.id, dadosAmbulatorio).subscribe({
      next: () => {
        this.dialogRef.close({ salvo: true });
      },
      error: (err: any) => {
        console.error('Erro ao salvar:', err);
      }
    });
  }

  getCorClassificacao(classificacao: string): string {
    switch ((classificacao || '').toLowerCase()) {
      case 'vermelho': return '#ef4444';
      case 'laranja': return '#f97316';
      case 'amarelo': return '#eab308';
      case 'verde': return '#22c55e';
      case 'azul': return '#3b82f6';
      default: return '#d1d5db';
    }
  }
}
