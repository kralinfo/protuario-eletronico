import { Component, OnInit, OnDestroy } from '@angular/core';
import { RealtimeService } from '../services/realtime.service';
import { Subject, timer } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

import { CommonModule } from '@angular/common';

interface PacienteChamado {
  patientId: number;
  patientName: string;
  target: 'triagem' | 'medico';
  timestamp: Date;
}

@Component({
  selector: 'app-fila',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './fila.component.html',
  styleUrls: ['./fila.component.scss']
})
export class FilaComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();
  private resetTimer$ = new Subject<void>();

  pacienteAtual: PacienteChamado | null = null;
  historicoChamadas: PacienteChamado[] = [];
  exibirDestaque = false;

  constructor(private realtimeService: RealtimeService) {}

  ngOnInit(): void {
    // Conectar ao módulo de fila
    this.realtimeService.connect('fila');

    // Escutar chamadas de pacientes
    this.realtimeService.onPatientCalled()
      .pipe(takeUntil(this.destroy$))
      .subscribe(data => {
        this.processarChamada(data);
      });
  }

  processarChamada(data: PacienteChamado): void {
    // Reiniciar timer se houver uma nova chamada
    this.resetTimer$.next();

    // 1. Move o paciente atual para o histórico se ele existir
    if (this.pacienteAtual) {
      this.historicoChamadas.unshift({...this.pacienteAtual});
      // Mantém apenas as últimas 5 chamadas no histórico
      if (this.historicoChamadas.length > 5) {
        this.historicoChamadas.pop();
      }
    }

    // 2. Define o novo paciente atual
    this.pacienteAtual = {
      ...data,
      timestamp: new Date(data.timestamp)
    };
    this.exibirDestaque = true;

    // 3. Tocar um som de alerta
    this.reproduzirAlerta();

    // 4. Temporizador para ocultar o destaque após 15 segundos
    timer(15000)
      .pipe(takeUntil(this.resetTimer$), takeUntil(this.destroy$))
      .subscribe(() => {
        this.exibirDestaque = false;
      });
  }

  reproduzirAlerta(): void {
    try {
      // Som suave de notificação
      const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2358/2358-preview.mp3');
      audio.volume = 0.4;
      audio.play().catch(e => console.log('Bloqueio de áudio (interaja com a página):', e));
    } catch (err) {
      console.error('Erro ao processar áudio:', err);
    }
  }

  getMensagemDirecionamento(): string {
    if (!this.pacienteAtual) return '';
    return this.pacienteAtual.target === 'triagem'
      ? 'DIRIJA-SE À TRIAGEM'
      : 'DIRIJA-SE AO CONSULTÓRIO';
  }

  getTargetClass(): string {
    if (!this.pacienteAtual) return '';
    return this.pacienteAtual.target === 'triagem' ? 'target-triagem' : 'target-medico';
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    this.resetTimer$.next();
    this.resetTimer$.complete();
  }
}
