import { Component, OnInit, OnDestroy } from '@angular/core';
import { RealtimeService } from '../services/realtime.service';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { AuthService } from '../auth/auth.service';

const MIN_DISPLAY_MS = 30000; // 30 segundos mínimos antes de aceitar substituição

interface ChamadaAtiva {
  patientId: number;
  patientName: string;
  target: 'triagem' | 'medico';
  timestamp: Date;
  displayedAt: Date;
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
  private clockInterval: any;
  now = new Date();

  // Chamadas ativas independentes por destino
  currentTriagem: ChamadaAtiva | null = null;
  currentMedico: ChamadaAtiva | null = null;

  // Filas separadas por destino
  queueTriagem: ChamadaAtiva[] = [];
  queueMedico: ChamadaAtiva[] = [];

  historicoChamadas: ChamadaAtiva[] = [];

  constructor(
    private realtimeService: RealtimeService,
    private router: Router,
    public authService: AuthService
  ) {}

  ngOnInit(): void {
    this.clockInterval = setInterval(() => { this.now = new Date(); }, 1000);
    this.realtimeService.connect('fila');
    this.realtimeService.onPatientCalled()
      .pipe(takeUntil(this.destroy$))
      .subscribe(data => this.receberChamada(data));
  }

  receberChamada(data: any): void {
    const chamada: ChamadaAtiva = {
      patientId: data.patientId,
      patientName: data.patientName || 'Paciente não identificado',
      target: data.target,
      timestamp: new Date(),
      displayedAt: new Date()
    };

    this.atualizarHistorico(chamada);

    if (chamada.target === 'triagem') {
      this.agendarExibicao(chamada, 'triagem');
    } else {
      this.agendarExibicao(chamada, 'medico');
    }
  }

  private agendarExibicao(chamada: ChamadaAtiva, tipo: 'triagem' | 'medico'): void {
    const current = tipo === 'triagem' ? this.currentTriagem : this.currentMedico;
    const queue = tipo === 'triagem' ? this.queueTriagem : this.queueMedico;

    // Evitar duplicidade
    if (current?.patientId === chamada.patientId) return;
    if (queue.some(c => c.patientId === chamada.patientId)) return;

    if (!current) {
      this.exibir(chamada, tipo);
      return;
    }

    const tempoDecorrido = Date.now() - current.displayedAt.getTime();
    const tempoRestante = Math.max(0, MIN_DISPLAY_MS - tempoDecorrido);

    if (tempoRestante === 0) {
      this.exibir(chamada, tipo);
    } else {
      queue.push(chamada);
      setTimeout(() => {
        const idx = queue.indexOf(chamada);
        if (idx !== -1) queue.splice(idx, 1);
        this.exibir(chamada, tipo);
      }, tempoRestante);
    }
  }

  private exibir(chamada: ChamadaAtiva, tipo: 'triagem' | 'medico'): void {
    chamada.displayedAt = new Date();
    if (tipo === 'triagem') {
      this.currentTriagem = chamada;
    } else {
      this.currentMedico = chamada;
    }
    this.reproduzirAlerta();
  }

  atualizarHistorico(paciente: ChamadaAtiva): void {
    this.historicoChamadas = this.historicoChamadas.filter(p =>
      p.patientId !== paciente.patientId || p.target !== paciente.target
    );
    this.historicoChamadas.unshift(paciente);
    if (this.historicoChamadas.length > 10) this.historicoChamadas.pop();
  }

  reproduzirAlerta(): void {
    try {
      const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2358/2358-preview.mp3');
      audio.volume = 0.4;
      audio.play().catch(() => {});
    } catch {}
  }

  sair(): void {
    this.authService.logout();
  }

  get hasActiveCalls(): boolean {
    return !!(this.currentTriagem || this.currentMedico);
  }

  ngOnDestroy(): void {
    clearInterval(this.clockInterval);
    this.destroy$.next();
    this.destroy$.complete();
  }
}
