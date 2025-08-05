import { Component, Inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { AtendimentoService } from '../services/atendimento.service';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { DatePipe } from '@angular/common';

export interface EditarAtendimentoData {
  atendimento: any;
}

@Component({
  selector: 'app-editar-atendimento-dialog',
  standalone: true,
  imports: [FormsModule, CommonModule, DatePipe],
  template: `
    <div class="p-6 max-w-lg">
      <h2 class="text-xl font-bold text-gray-800 mb-4">
        Editar Atendimento
      </h2>
      
      <div class="mb-4 p-3 bg-blue-50 border-l-4 border-blue-400 rounded">
        <p class="text-sm text-blue-800">
          <strong>Paciente:</strong> {{ data.atendimento.paciente_nome }}
        </p>
        <p class="text-sm text-blue-800">
          <strong>Data:</strong> {{ data.atendimento.data_hora_atendimento | date:'dd/MM/yyyy HH:mm' }}
        </p>
      </div>

      <form #editForm="ngForm" (ngSubmit)="salvar()">
        <div class="mb-4">
          <label class="block text-sm font-medium text-gray-700 mb-2">
            Motivo do Atendimento *
          </label>
          <textarea 
            [(ngModel)]="motivo" 
            name="motivo"
            required
            rows="3"
            placeholder="Descreva o motivo do atendimento..."
            class="w-full p-3 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
          ></textarea>
        </div>

        <div class="mb-4">
          <label class="block text-sm font-medium text-gray-700 mb-2">
            Observações
          </label>
          <textarea 
            [(ngModel)]="observacoes"
            name="observacoes"
            rows="3"
            placeholder="Observações adicionais..."
            class="w-full p-3 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
          ></textarea>
        </div>

        <div class="mb-4">
          <label class="block text-sm font-medium text-gray-700 mb-2">
            Status
          </label>
          <select 
            [(ngModel)]="status"
            name="status"
            class="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="recepcao">Recepção</option>
            <option value="triagem">Triagem</option>
            <option value="consulta">Consulta Médica</option>
            <option value="ambulatorio">Ambulatório</option>
            <option value="concluido">Concluído</option>
          </select>
        </div>

        <div class="mb-4">
          <label class="block text-sm font-medium text-gray-700 mb-2">
            Procedência
          </label>
          <input 
            [(ngModel)]="procedencia"
            name="procedencia"
            type="text"
            placeholder="Ex: Demanda espontânea, Referenciado..."
            class="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
          />
        </div>

        <div class="mb-4">
          <label class="block text-sm font-medium text-gray-700 mb-2">
            Acompanhante
          </label>
          <input 
            [(ngModel)]="acompanhante"
            name="acompanhante"
            type="text"
            placeholder="Nome do acompanhante (se houver)"
            class="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
          />
        </div>

        <div class="mb-6" *ngIf="mensagem">
          <div 
            [ngClass]="{
              'bg-green-50 border-green-400 text-green-800': mensagem.includes('sucesso'),
              'bg-red-50 border-red-400 text-red-800': !mensagem.includes('sucesso')
            }"
            class="border-l-4 p-3 rounded"
          >
            {{ mensagem }}
          </div>
        </div>

        <div class="flex gap-3 justify-end">
          <button 
            type="button"
            (click)="fechar()"
            class="px-4 py-2 text-gray-600 bg-gray-200 rounded hover:bg-gray-300 transition"
          >
            Cancelar
          </button>
          <button 
            type="submit"
            [disabled]="!motivo || loading"
            class="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition disabled:bg-gray-400 disabled:cursor-not-allowed"
          >
            <span *ngIf="loading">Salvando...</span>
            <span *ngIf="!loading">Salvar Alterações</span>
          </button>
        </div>
      </form>
    </div>
  `
})
export class EditarAtendimentoDialogComponent {
  motivo: string = '';
  observacoes: string = '';
  status: string = '';
  procedencia: string = '';
  acompanhante: string = '';
  loading: boolean = false;
  mensagem: string = '';

  constructor(
    public dialogRef: MatDialogRef<EditarAtendimentoDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: EditarAtendimentoData,
    private atendimentoService: AtendimentoService
  ) {
    // Preencher campos com dados atuais
    this.motivo = data.atendimento.motivo || '';
    this.observacoes = data.atendimento.observacao || '';
    this.status = data.atendimento.status || 'recepcao';
    this.procedencia = data.atendimento.procedimento || '';
    this.acompanhante = data.atendimento.acompanhante || '';
  }

  fechar(): void {
    this.dialogRef.close();
  }

  salvar(): void {
    if (!this.motivo.trim()) {
      this.mensagem = 'Motivo é obrigatório.';
      return;
    }

    this.loading = true;
    this.mensagem = '';

    const dadosAtualizados = {
      motivo: this.motivo.trim(),
      observacoes: this.observacoes.trim(),
      status: this.status,
      procedencia: this.procedencia.trim(),
      acompanhante: this.acompanhante.trim()
    };

    this.atendimentoService.atualizarAtendimento(this.data.atendimento.id, dadosAtualizados).subscribe({
      next: (response: any) => {
        this.mensagem = 'Atendimento atualizado com sucesso!';
        this.loading = false;
        
        // Fechar dialog após 1.5 segundos
        setTimeout(() => {
          this.dialogRef.close(true); // true indica que houve alteração
        }, 1500);
      },
      error: (error: any) => {
        console.error('Erro ao atualizar atendimento:', error);
        this.mensagem = error.error?.error || 'Erro ao atualizar atendimento. Tente novamente.';
        this.loading = false;
      }
    });
  }
}
