import { Component, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Paciente } from '../pacientes.component';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';

@Component({
  selector: 'app-pacientes-form',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="pacientes-form">
      <h2 *ngIf="pacienteEditando">Editar Paciente</h2>
      <h2 *ngIf="!pacienteEditando">Novo Paciente</h2>
      <!-- Adicione os campos do formulário conforme necessário -->
      <button type="button" (click)="fecharModal()">Fechar</button>
    </div>
  `,
  styles: [`
    .pacientes-form { padding: 16px; background: #fff; border-radius: 8px; }
    h2 { margin-top: 0; }
  `]
})
export class PacientesFormComponent {
  pacienteEditando: Paciente | null = null;

  constructor(
    public dialogRef: MatDialogRef<PacientesFormComponent>,
    @Inject(MAT_DIALOG_DATA) public data: any
  ) {
    this.pacienteEditando = data?.pacienteEditando || null;
  }

  fecharModal() {
    this.dialogRef.close();
  }
}
