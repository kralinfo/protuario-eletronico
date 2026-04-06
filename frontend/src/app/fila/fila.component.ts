import { Component, OnInit, OnDestroy } from '@angular/core';
import { RealtimeService } from '../services/realtime.service';
import { Subject } from 'rxjs';
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

  pacienteAtual: PacienteChamado | null = null;
  historicoChamadas: PacienteChamado[] = [];

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
    // Se o novo paciente for o mesmo que o atual em um curto intervalo, ignorar duplicatas se necessário
    // Aqui apenas atualizamos

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

    // 3. Tocar um som de alerta (opcional, mas comum em painéis)
    this.reproduzirAlerta();
  }

  reproduzirAlerta(): void {
    try {
      const audio = new Audio('assets/sounds/notification.mp3');
      audio.play().catch(e => console.log('Erro ao tocar som (bloqueio do navegador):', e));
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
  }
}
