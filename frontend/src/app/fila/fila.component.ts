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
  now = new Date();

  pacienteAtual: any = null;
  historicoChamadas: any[] = [];
  exibirDestaque = false;

  constructor(private realtimeService: RealtimeService) {}

  ngOnInit(): void {
    // Atualizar relógio do topo
    setInterval(() => {
      this.now = new Date();
    }, 1000);

    // Conectar ao módulo de fila
    this.realtimeService.connect('fila');

    // Escutar chamadas de pacientes
    this.realtimeService.onPatientCalled()
      .pipe(takeUntil(this.destroy$))
      .subscribe(data => {
        this.processarChamada(data);
      });
  }

  processarChamada(data: any): void {
    // Reiniciar timer se houver uma nova chamada
    this.resetTimer$.next();

    const novoPaciente = {
      ...data,
      timestamp: new Date()
    };

    // 1. Atualiza o paciente em destaque
    this.pacienteAtual = novoPaciente;
    this.exibirDestaque = true;

    // 2. Gerencia o histórico da tabela
    // Remove se já existir e adiciona ao topo
    this.historicoChamadas = this.historicoChamadas.filter(p =>
      p.patientId !== novoPaciente.patientId || p.target !== novoPaciente.target
    );
    this.historicoChamadas.unshift(novoPaciente);

    // Limita o histórico
    if (this.historicoChamadas.length > 10) {
      this.historicoChamadas.pop();
    }

    // 3. Tocar um som de alerta
    this.reproduzirAlerta();

    // 4. Temporizador para remover o destaque visual (15 seg)
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
