import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-detalhes-atendimentos-modal',
  standalone: true,
  imports: [CommonModule],
  template: `
    <!-- Overlay -->
    <div *ngIf="isVisible" class="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4" (click)="fecharModal($event)">
      <!-- Modal Container -->
      <div class="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden" (click)="$event.stopPropagation()">
        <!-- Header -->
        <div class="bg-blue-600 text-white px-6 py-4 flex justify-between items-center">
          <h2 class="text-xl font-bold">
            Detalhes dos Atendimentos - {{ label }}
          </h2>
          <button
            (click)="fechar()"
            class="text-white hover:text-gray-200 text-2xl font-bold w-8 h-8 flex items-center justify-center rounded hover:bg-blue-700 transition-colors">
            ×
          </button>
        </div>

        <!-- Content -->
        <div class="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
          <div class="overflow-x-auto">
            <table class="min-w-full bg-white border border-gray-200 rounded-lg">
              <thead class="bg-gray-50">
                <tr *ngIf="isPacientesData(); else atendimentosHeaders">
                  <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b">
                    Nome
                  </th>
                  <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b">
                    Sexo
                  </th>
                  <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b">
                    Nascimento
                  </th>
                  <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b">
                    Data Cadastro
                  </th>
                </tr>
                <ng-template #atendimentosHeaders>
                  <tr>
                    <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b">
                      Paciente
                    </th>
                    <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b">
                      Data/Hora
                    </th>
                    <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b">
                      Classificação
                    </th>
                    <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b">
                      Status
                    </th>
                  </tr>
                </ng-template>
              </thead>
              <tbody class="divide-y divide-gray-200">
                <tr *ngFor="let item of atendimentos; let i = index"
                    class="hover:bg-gray-50 transition-colors"
                    [class.bg-gray-25]="i % 2 === 0">

                  <!-- Dados de Pacientes -->
                  <ng-container *ngIf="isPacientesData()">
                    <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-medium">
                      {{ item.nome }}
                    </td>
                    <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      {{ item.sexo === 'M' ? 'Masculino' : 'Feminino' }}
                    </td>
                    <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      {{ formatarDataNascimento(item.nascimento) }}
                    </td>
                    <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      {{ item.created_at ? formatarData(item.created_at) : 'Data não disponível' }}
                    </td>
                  </ng-container>

                  <!-- Dados de Atendimentos -->
                  <ng-container *ngIf="!isPacientesData()">
                    <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-medium">
                      {{ item.paciente }}
                    </td>
                    <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      {{ formatarData(item.data_hora_atendimento) }}
                    </td>
                    <td class="px-6 py-4 whitespace-nowrap">
                      <span class="px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full"
                            [ngClass]="{
                              'bg-red-100 text-red-800 border border-red-200': item.classificacao_risco === 'vermelho',
                              'bg-yellow-100 text-yellow-800 border border-yellow-200': item.classificacao_risco === 'amarelo',
                              'bg-green-100 text-green-800 border border-green-200': item.classificacao_risco === 'verde',
                              'bg-blue-100 text-blue-800 border border-blue-200': item.classificacao_risco === 'azul',
                              'bg-gray-100 text-gray-800 border border-gray-200': !item.classificacao_risco
                            }">
                        {{ item.classificacao_risco || 'N/A' }}
                      </span>
                    </td>
                    <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      {{ item.status }}
                    </td>
                  </ng-container>
                </tr>
              </tbody>
            </table>

            <!-- Empty State -->
            <div *ngIf="atendimentos.length === 0" class="text-center py-12">
              <div class="text-gray-400 text-6xl mb-4">📊</div>
              <h3 class="text-lg font-medium text-gray-900 mb-2">Nenhum {{ isPacientesData() ? 'paciente' : 'atendimento' }} encontrado</h3>
              <p class="text-gray-500">Não há {{ isPacientesData() ? 'pacientes registrados' : 'atendimentos registrados' }} para este período.</p>
            </div>
          </div>
        </div>

        <!-- Footer -->
        <div class="bg-gray-50 px-6 py-4 flex justify-between items-center border-t">
          <span class="text-sm text-gray-600">
            Total: {{ atendimentos.length }} {{ isPacientesData() ? 'paciente' : 'atendimento' }}{{ atendimentos.length !== 1 ? 's' : '' }}
          </span>
          <button
            (click)="fechar()"
            class="px-4 py-2 bg-gray-500 text-white rounded-md hover:bg-gray-600 transition-colors focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2">
            Fechar
          </button>
        </div>
      </div>
    </div>
  `,
  styles: []
})
export class DetalhesAtendimentosModalComponent {
  @Input() isVisible: boolean = false;
  @Input() periodo: string = '';
  @Input() label: string = '';
  @Input() atendimentos: any[] = [];
  @Output() onClose = new EventEmitter<void>();

  fechar(): void {
    this.onClose.emit();
  }

  fecharModal(event: Event): void {
    if (event.target === event.currentTarget) {
      this.fechar();
    }
  }

  formatarData(dataStr: string): string {
    if (!dataStr) return 'N/A';
    try {
      const data = new Date(dataStr);
      if (isNaN(data.getTime())) return 'Data inválida';
      return data.toLocaleString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch (error) {
      console.error('Erro ao formatar data:', error);
      return 'Erro na data';
    }
  }

  formatarDataNascimento(dataStr: string): string {
    if (!dataStr) return 'N/A';
    try {
      const data = new Date(dataStr);
      if (isNaN(data.getTime())) return 'Data inválida';
      return data.toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
      });
    } catch (error) {
      console.error('Erro ao formatar data de nascimento:', error);
      return 'Erro na data';
    }
  }

  isPacientesData(): boolean {
    // Verifica se os dados são de pacientes (possuem campo 'nome') ou atendimentos (possuem campo 'paciente')
    if (this.atendimentos.length === 0) return false;
    const isPaciente = this.atendimentos[0].hasOwnProperty('nome') && !this.atendimentos[0].hasOwnProperty('paciente');

    // Log para debug
    console.log('🔍 [MODAL] Verificando tipo de dados:', {
      isPaciente,
      primeiroItem: this.atendimentos[0],
      totalItens: this.atendimentos.length
    });

    return isPaciente;
  }
}
