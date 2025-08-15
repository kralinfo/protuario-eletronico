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
  templateUrl: './abandono-dialog.component.html',
  styleUrls: ['./abandono-dialog.component.scss']
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
