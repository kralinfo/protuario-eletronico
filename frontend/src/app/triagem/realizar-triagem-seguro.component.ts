import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBarModule, MatSnackBar } from '@angular/material/snack-bar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatChipsModule } from '@angular/material/chips';
import { MatDividerModule } from '@angular/material/divider';
import { ActivatedRoute, Router } from '@angular/router';

import { TriagemService, AtendimentoCompleto, ClassificacaoRisco, StatusDestino } from '../services/triagem.service';
import { TriagemEventService } from '../services/triagem-event.service';

@Component({
  selector: 'app-realizar-triagem',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatButtonModule,
    MatIconModule,
    MatSnackBarModule,
    MatProgressSpinnerModule,
    MatChipsModule,
    MatDividerModule
  ],
  templateUrl: './realizar-triagem-seguro.component.html',
  styleUrls: ['./realizar-triagem-seguro.component.scss']
})
export class RealizarTriagemComponent implements OnInit {
  atendimentoId: number;
  triagemForm!: FormGroup;
  paciente?: AtendimentoCompleto;
  classificacaoRisco?: ClassificacaoRisco;
  statusDestino?: StatusDestino; // Opções de destino após triagem
  carregando = false; // Começar SEM loading para evitar travamento
  salvando = false;

  constructor(
    private fb: FormBuilder,
    private triagemService: TriagemService,
    private route: ActivatedRoute,
    private router: Router,
    private snackBar: MatSnackBar,
    private cdr: ChangeDetectorRef,
    private triagemEventService: TriagemEventService
  ) {
    console.log('Constructor - Inicializando componente SEGURO');
    this.atendimentoId = +this.route.snapshot.params['id'];
    console.log('Constructor - Atendimento ID:', this.atendimentoId);
    this.triagemForm = this.criarFormulario();
    console.log('Constructor - Componente inicializado com sucesso');
  }

  ngOnInit() {
    console.log('NgOnInit - Componente SEGURO carregado');
    // Carregar opções de status de destino
    this.triagemService.obterStatusDestino().subscribe({
      next: (status) => {
        this.statusDestino = status;
        console.log('Status de destino carregados:', status);
      },
      error: (error) => {
        console.error('Erro ao carregar status de destino:', error);
      }
    });
    console.log('NgOnInit - Pronto para uso manual');
  }

  private criarFormulario(): FormGroup {
    return this.fb.group({
      pressao_arterial: ['', [Validators.required]],
      temperatura: ['', [Validators.required]],
      frequencia_cardiaca: ['', [Validators.required]],
      saturacao_oxigenio: [''],
      classificacao_risco: ['', Validators.required],
      status_destino: ['encaminhado para sala médica', Validators.required],
      queixa_principal: ['', Validators.required],
      historia_atual: [''],
      observacoes_triagem: ['']
    });
  }

  async salvarTriagem() {
    if (!this.triagemForm.valid) {
      this.snackBar.open('Por favor, preencha todos os campos obrigatórios', 'Fechar', {
        duration: 5000
      });
      return;
    }

    try {
      this.salvando = true;
      const dados = this.triagemForm.value;
      const statusDestino = dados.status_destino;
      
      console.log('Salvando triagem:', dados);
      console.log('Status de destino:', statusDestino);
      
      // Primeiro salvar os dados da triagem
      await this.triagemService.salvarTriagem(this.atendimentoId, dados).toPromise();
      
      // Depois finalizar a triagem com o status de destino
      await this.triagemService.finalizarTriagem(this.atendimentoId, statusDestino).toPromise();
      
      // Notificar que a triagem foi finalizada
      this.triagemEventService.notificarTriagemFinalizada();
      
      this.snackBar.open('Triagem finalizada com sucesso!', 'Fechar', {
        duration: 3000
      });
      
      this.router.navigate(['/triagem']);
    } catch (error) {
      console.error('Erro ao salvar triagem:', error);
      this.snackBar.open('Erro ao finalizar triagem', 'Fechar', {
        duration: 5000
      });
    } finally {
      this.salvando = false;
    }
  }

  voltar() {
    this.router.navigate(['/triagem']);
  }

  getStatusDestinoEntries() {
    if (!this.statusDestino) return [];
    return Object.keys(this.statusDestino).map(key => ({
      key,
      value: this.statusDestino![key]
    }));
  }
}
