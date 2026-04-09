import { Component, OnInit, Input, EventEmitter, Output } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar } from '@angular/material/snack-bar';
import { EncaminhamentoService } from '../../services/encaminhamento.service';

interface Encaminhamento {
  id: number;
  tipo_encaminhamento: string;
  estabelecimento_destino: string;
  motivo_encaminhamento: string;
  cid_relacionado: string;
  prioridade: string;
  status: string;
  data_agendada: string;
  data_encaminhamento: string;
  profissional_nome: string;
  registro_profissional: string;
}

@Component({
  selector: 'app-encaminhamentos-panel',
  standalone: true,
  imports: [CommonModule, FormsModule, MatIconModule, DatePipe],
  templateUrl: './encaminhamentos-panel.component.html',
  styleUrls: ['./encaminhamentos-panel.component.scss']
})
export class EncaminhamentosPanelComponent implements OnInit {
  @Input() atendimentoId: number | null = null;
  @Input() pacienteId: number | null = null;
  @Output() criado = new EventEmitter<void>();

  encaminhamentos: Encaminhamento[] = [];
  carregando = false;
  mostrandoForm = false;

  novoEncaminhamento = {
    tipo_encaminhamento: '',
    estabelecimento_destino: '',
    motivo_encaminhamento: '',
    cid_relacionado: '',
    prioridade: 'normal',
    data_agendada: ''
  };

  constructor(
    private encaminhamentoService: EncaminhamentoService,
    private snackBar: MatSnackBar
  ) {}

  ngOnInit(): void {
    this.carregarEncaminhamentos();
  }

  async carregarEncaminhamentos(): Promise<void> {
    if (!this.atendimentoId) return;
    this.carregando = true;
    try {
      const res = await this.encaminhamentoService.findByAtendimento(this.atendimentoId).toPromise();
      this.encaminhamentos = res.data || [];
    } catch (error: any) {
      console.error('Erro ao carregar encaminhamentos:', error);
    } finally {
      this.carregando = false;
    }
  }

  async salvar(): Promise<void> {
    if (!this.novoEncaminhamento.tipo_encaminhamento || !this.novoEncaminhamento.motivo_encaminhamento) {
      this.snackBar.open('Tipo e motivo do encaminhamento sao obrigatorios.', 'Fechar', { duration: 4000 });
      return;
    }

    try {
      await this.encaminhamentoService.criar({
        ...this.novoEncaminhamento,
        atendimento_id: this.atendimentoId,
        paciente_id: this.pacienteId
      }).toPromise();

      this.snackBar.open('Encaminhamento registrado com sucesso!', 'Fechar', { duration: 3000 });
      this.novoEncaminhamento = {
        tipo_encaminhamento: '',
        estabelecimento_destino: '',
        motivo_encaminhamento: '',
        cid_relacionado: '',
        prioridade: 'normal',
        data_agendada: ''
      };
      this.mostrandoForm = false;
      await this.carregarEncaminhamentos();
      this.criado.emit();
    } catch (error: any) {
      this.snackBar.open(error?.error?.error || 'Erro ao criar encaminhamento.', 'Fechar', { duration: 5000 });
    }
  }
}
