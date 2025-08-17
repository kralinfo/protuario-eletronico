import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Paciente } from '../pacientes.component';

@Component({
  selector: 'app-pacientes-form',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="pacientes-form">
      <h2 *ngIf="pacienteEditando">Editar Paciente</h2>
      <h2 *ngIf="!pacienteEditando">Novo Paciente</h2>
      <!-- Adicione os campos do formulário conforme necessário -->
      <button type="button" (click)="fechar.emit()">Fechar</button>
    </div>
  `,
  styles: [`
    .pacientes-form { padding: 16px; background: #fff; border-radius: 8px; }
    h2 { margin-top: 0; }
  `]
})
export class PacientesFormComponent {
  @Input() pacienteEditando: Paciente | null = null;
  @Output() fechar = new EventEmitter<void>();
}
