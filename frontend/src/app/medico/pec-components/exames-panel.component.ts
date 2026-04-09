import { Component, OnInit, Input, EventEmitter, Output } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar } from '@angular/material/snack-bar';
import { ExameSolicitadoService } from '../../services/exame-solicitado.service';

interface ExameSolicitado {
  id: number;
  tipo_exame: string;
  nome_exame: string;
  observacoes: string;
  prioridade: string;
  status: string;
  resultado: string;
  data_solicitacao: string;
  data_resultado: string;
  profissional_nome: string;
  registro_profissional: string;
}

@Component({
  selector: 'app-exames-panel',
  standalone: true,
  imports: [CommonModule, FormsModule, MatIconModule, DatePipe],
  templateUrl: './exames-panel.component.html',
  styleUrls: ['./exames-panel.component.scss']
})
export class ExamesPanelComponent implements OnInit {
  @Input() atendimentoId: number | null = null;
  @Input() pacienteId: number | null = null;
  @Output() criado = new EventEmitter<void>();

  exames: ExameSolicitado[] = [];
  carregando = false;
  mostrandoForm = false;

  novoExame = {
    tipo_exame: 'laboratorial',
    nome_exame: '',
    observacoes: '',
    questao_clinica: '',
    prioridade: 'normal'
  };

  constructor(
    private exameService: ExameSolicitadoService,
    private snackBar: MatSnackBar
  ) {}

  ngOnInit(): void {
    this.carregarExames();
  }

  async carregarExames(): Promise<void> {
    if (!this.atendimentoId) return;
    this.carregando = true;
    try {
      const res = await this.exameService.findByAtendimento(this.atendimentoId).toPromise();
      this.exames = res.data || [];
    } catch (error: any) {
      console.error('Erro ao carregar exames:', error);
    } finally {
      this.carregando = false;
    }
  }

  async salvar(): Promise<void> {
    if (!this.novoExame.nome_exame) {
      this.snackBar.open('Nome do exame e obrigatorio.', 'Fechar', { duration: 4000 });
      return;
    }

    try {
      await this.exameService.criar({
        ...this.novoExame,
        atendimento_id: this.atendimentoId,
        paciente_id: this.pacienteId
      }).toPromise();

      this.snackBar.open('Exame solicitado com sucesso!', 'Fechar', { duration: 3000 });
      this.novoExame = {
        tipo_exame: 'laboratorial',
        nome_exame: '',
        observacoes: '',
        questao_clinica: '',
        prioridade: 'normal'
      };
      this.mostrandoForm = false;
      await this.carregarExames();
      this.criado.emit();
    } catch (error: any) {
      this.snackBar.open(error?.error?.error || 'Erro ao solicitar exame.', 'Fechar', { duration: 5000 });
    }
  }
}
