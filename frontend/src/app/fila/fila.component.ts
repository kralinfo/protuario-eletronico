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
  now = new Date();

  // Fila de chamadas e controle de exibição
  callQueue: any[] = [];
  currentCall: any = null;
  exibirDestaque = false;
  isProcessingQueue = false;

  historicoChamadas: any[] = [];

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
        this.receberChamada(data);
      });
  }

  receberChamada(data: any): void {
    // 1. Evitar duplicidade (se já estiver na fila ou sendo exibido)
    const jaNaLista = this.callQueue.some(p => p.patientId === data.patientId && p.target === data.target) ||
                     (this.currentCall?.patientId === data.patientId && this.currentCall?.target === data.target);

    if (jaNaLista) return;

    // 2. Adicionar na fila
    const novoPaciente = {
      ...data,
      timestamp: new Date(),
      priority: data.priority || 'normal' // Preparado para prioridades futuras
    };
    this.callQueue.push(novoPaciente);

    // 3. Atualizar a tabela IMEDIATAMENTE (conforme requisito 5)
    this.atualizarTabela(novoPaciente);

    // 4. Iniciar processamento da fila
    this.processQueue();
  }

  processQueue(): void {
    // Se já estiver exibindo algo ou fila vazia, não faz nada
    if (this.currentCall || this.callQueue.length === 0) return;

    // Remover primeiro item (FIFO)
    this.currentCall = this.callQueue.shift();
    this.exibirDestaque = true;

    // Tocar alerta
    this.reproduzirAlerta();

    // Tempo de exibição: 7 segundos antes da próxima chamada
    timer(7000)
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => {
        this.exibirDestaque = false;
        this.currentCall = null;
        // Processar próximo da fila
        this.processQueue();
      });
  }

  atualizarTabela(paciente: any): void {
    // Remove se já existir e adiciona ao topo
    this.historicoChamadas = this.historicoChamadas.filter(p =>
      p.patientId !== paciente.patientId || p.target !== paciente.target
    );
    this.historicoChamadas.unshift(paciente);

    // Limita o histórico
    if (this.historicoChamadas.length > 10) {
      this.historicoChamadas.pop();
    }
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
    if (!this.currentCall) return '';
    return this.currentCall.target === 'triagem'
      ? 'DIRIJA-SE À TRIAGEM'
      : 'DIRIJA-SE AO CONSULTÓRIO';
  }

  getTargetClass(): string {
    if (!this.currentCall) return '';
    return this.currentCall.target === 'triagem' ? 'target-triagem' : 'target-medico';
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
