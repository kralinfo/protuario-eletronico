import { Component, OnInit, Input } from '@angular/core';
import { ConsentimentoService } from '../../services/consentimento.service';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatDialog } from '@angular/material/dialog';
import { ModalConsentimentoComponent } from '../modal-consentimento/modal-consentimento.component';

interface Consentimento {
  id: string;
  paciente_id: number;
  usuario_id: number;
  tipo: string;
  versao_termos: string;
  data_consentimento: string;
  ativo: boolean;
  data_revogacao: string | null;
}

@Component({
  selector: 'app-painel-titular',
  templateUrl: './painel-titular.component.html',
  styleUrls: ['./painel-titular.component.scss']
})
export class PainelTitularComponent implements OnInit {
  @Input() pacienteId: number | null = null;
  @Input() pacienteNome: string = '';

  consentimentos: Consentimento[] = [];
  carregando = false;
  exportando = false;
  solicitandoExclusao = false;
  motivoExclusao = '';

  constructor(
    private consentimentoService: ConsentimentoService,
    private snackBar: MatSnackBar,
    private dialog: MatDialog
  ) { }

  ngOnInit(): void {
    if (this.pacienteId) {
      this.carregarConsentimentos();
    }
  }

  async carregarConsentimentos(): Promise<void> {
    if (!this.pacienteId) return;

    this.carregando = true;
    try {
      const res = await this.consentimentoService.buscarPorPaciente(this.pacienteId).toPromise();
      this.consentimentos = res.data || [];
    } catch (error: any) {
      this.snackBar.open(
        error?.error?.error || 'Erro ao carregar consentimentos.',
        'Fechar',
        { duration: 5000 }
      );
    } finally {
      this.carregando = false;
    }
  }

  async exportarDados(): Promise<void> {
    if (!this.pacienteId) return;

    this.exportando = true;
    try {
      const res = await this.consentimentoService['http']
        .get(`/api/pacientes/${this.pacienteId}/exportar-dados`)
        .toPromise();

      const dados = res.data;
      const blob = new Blob([JSON.stringify(dados, null, 2)], { type: 'application/json' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `dados_paciente_${this.pacienteId}_${new Date().toISOString().split('T')[0]}.json`;
      a.click();
      window.URL.revokeObjectURL(url);

      this.snackBar.open('Dados exportados com sucesso!', 'Fechar', { duration: 4000 });
    } catch (error: any) {
      this.snackBar.open(
        error?.error?.error || 'Erro ao exportar dados.',
        'Fechar',
        { duration: 5000 }
      );
    } finally {
      this.exportando = false;
    }
  }

  async solicitarExclusao(): Promise<void> {
    if (!this.pacienteId) return;

    this.solicitandoExclusao = true;
    try {
      await this.consentimentoService['http']
        .post(`/api/pacientes/${this.pacienteId}/solicitar-exclusao`, {
          motivo: this.motivoExclusao || 'Solicitacao do titular dos dados'
        })
        .toPromise();

      this.snackBar.open(
        'Solicitacao de exclusao registrada. Sera processada pelo administrador.',
        'Fechar',
        { duration: 6000 }
      );
      this.motivoExclusao = '';
    } catch (error: any) {
      this.snackBar.open(
        error?.error?.error || 'Erro ao solicitar exclusao.',
        'Fechar',
        { duration: 5000 }
      );
    } finally {
      this.solicitandoExclusao = false;
    }
  }

  abrirModalConsentimento(): void {
    if (!this.pacienteId) return;

    const dialogRef = this.dialog.open(ModalConsentimentoComponent, {
      width: '600px',
      data: {
        pacienteId: this.pacienteId,
        tipo: 'cadastro'
      }
    });

    dialogRef.afterClosed().subscribe(resultado => {
      if (resultado) {
        this.carregarConsentimentos();
      }
    });
  }

  async revogarConsentimento(consentimentoId: string): Promise<void> {
    try {
      await this.consentimentoService.revogar(consentimentoId).toPromise();
      this.snackBar.open('Consentimento revogado com sucesso.', 'Fechar', { duration: 4000 });
      this.carregarConsentimentos();
    } catch (error: any) {
      this.snackBar.open(
        error?.error?.error || 'Erro ao revogar consentimento.',
        'Fechar',
        { duration: 5000 }
      );
    }
  }
}
