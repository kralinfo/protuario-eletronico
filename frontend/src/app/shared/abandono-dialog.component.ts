import { Component, Inject } from '@angular/core';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

export interface AbandonoData {
  atendimento: any;
}

export interface AbandonoResult {
  motivo_abandono: string;
  etapa_abandono: string;
  usuario_id?: number;
}

@Component({
  selector: 'app-abandono-dialog',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="p-6">
      <h2 class="text-xl font-bold text-gray-800 mb-4">
        Registrar Abandono de Atendimento
      </h2>
      
      <div class="mb-4 p-3 bg-blue-50 border-l-4 border-blue-400 rounded">
        <p class="text-sm text-blue-800">
          <strong>Paciente:</strong> {{ data.atendimento.paciente_nome }}
        </p>
        <p class="text-sm text-blue-800">
          <strong>Data:</strong> {{ data.atendimento.data_hora_atendimento | date:'dd/MM/yyyy HH:mm' }}
        </p>
      </div>

      <form #abandonoForm="ngForm">
        <div class="mb-4">
          <label class="block text-sm font-medium text-gray-700 mb-2">
            Etapa em que abandonou *
          </label>
          <select 
            [(ngModel)]="etapa_abandono" 
            name="etapa_abandono"
            required
            class="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="">Selecione a etapa...</option>
            <option value="recepcao">Recepção</option>
            <option value="triagem">Triagem</option>
            <option value="sala_medica">Sala Médica</option>
            <option value="ambulatorio">Ambulatório</option>
            <option value="espera">Sala de Espera</option>
          </select>
        </div>

        <div class="mb-6">
          <label class="block text-sm font-medium text-gray-700 mb-2">
            Motivo do abandono (opcional)
          </label>
          <textarea 
            [(ngModel)]="motivo_abandono"
            name="motivo_abandono"
            rows="3"
            placeholder="Descreva o motivo do abandono..."
            class="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
          ></textarea>
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
            type="button"
            (click)="confirmar()"
            [disabled]="!etapa_abandono"
            class="px-4 py-2 bg-orange-600 text-white rounded hover:bg-orange-700 transition disabled:bg-gray-400 disabled:cursor-not-allowed"
          >
            Registrar Abandono
          </button>
        </div>
      </form>
    </div>
  `,
})
export class AbandonoDialogComponent {
  etapa_abandono: string = '';
  motivo_abandono: string = '';

  constructor(
    public dialogRef: MatDialogRef<AbandonoDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: AbandonoData
  ) {}

  fechar(): void {
    this.dialogRef.close();
  }

  confirmar(): void {
    if (this.etapa_abandono) {
      const result: AbandonoResult = {
        etapa_abandono: this.etapa_abandono,
        motivo_abandono: this.motivo_abandono,
        usuario_id: 1 // TODO: pegar do usuário logado
      };
      this.dialogRef.close(result);
    }
  }
}
