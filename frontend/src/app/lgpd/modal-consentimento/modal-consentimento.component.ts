import { Component, OnInit, Inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { ConsentimentoService } from '../../services/consentimento.service';
import { MatSnackBar } from '@angular/material/snack-bar';

@Component({
  selector: 'app-modal-consentimento',
  templateUrl: './modal-consentimento.component.html',
  styleUrls: ['./modal-consentimento.component.scss']
})
export class ModalConsentimentoComponent implements OnInit {
  aceitou = false;
  leuPolitica = false;
  salvando = false;

  versaoTermos = '1.0.0';

  constructor(
    public dialogRef: MatDialogRef<ModalConsentimentoComponent>,
    @Inject(MAT_DIALOG_DATA) public data: {
      pacienteId: number;
      tipo?: string;
      router?: any; // Router para navegar para politica de privacidade
    },
    private consentimentoService: ConsentimentoService,
    private snackBar: MatSnackBar
  ) { }

  ngOnInit(): void { }

  aceitar(): void {
    if (!this.leuPolitica) {
      this.snackBar.open('Voce precisa confirmar que leu a Politica de Privacidade.', 'Fechar', { duration: 4000 });
      return;
    }
    this.aceitou = true;
  }

  async confirmar(): Promise<void> {
    if (!this.aceitou || !this.leuPolitica) {
      this.snackBar.open('Voce precisa aceitar os termos para continuar.', 'Fechar', { duration: 4000 });
      return;
    }

    this.salvando = true;

    try {
      await this.consentimentoService.registrar({
        paciente_id: this.data.pacienteId,
        tipo: this.data.tipo || 'cadastro',
        versao_termos: this.versaoTermos
      }).toPromise();

      this.snackBar.open('Consentimento registrado com sucesso!', 'Fechar', { duration: 3000 });
      this.dialogRef.close(true);
    } catch (error: any) {
      this.snackBar.open(
        error?.error?.error || 'Erro ao registrar consentimento.',
        'Fechar',
        { duration: 5000 }
      );
      this.salvando = false;
    }
  }

  recusar(): void {
    this.dialogRef.close(false);
  }
}
