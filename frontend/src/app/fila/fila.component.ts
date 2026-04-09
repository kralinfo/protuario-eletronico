import { Component, OnInit, OnDestroy } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { RealtimeService } from '../services/realtime.service';
import { AudioService } from '../services/audio.service';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { CommonModule } from '@angular/common';
import { HttpClientModule } from '@angular/common/http';
import { Router } from '@angular/router';
import { AuthService } from '../auth/auth.service';
import { environment } from '../../environments/environment';

interface ChamadaAtiva {
  patientId: number;
  patientName: string;
  target: 'triagem' | 'medico';
  classificationRisk?: string | null;
  timestamp: Date;
  displayedAt: Date;
}

@Component({
  selector: 'app-fila',
  imports: [CommonModule, HttpClientModule],
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

  historicoChamadas: ChamadaAtiva[] = [];

  constructor(
    private http: HttpClient,
    private realtimeService: RealtimeService,
    private audioService: AudioService,
    private router: Router,
    public authService: AuthService
  ) {}

  ngOnInit(): void {
    this.carregarEstadoDoBackend();
    this.clockInterval = setInterval(() => { this.now = new Date(); }, 1000);
    this.realtimeService.connect('fila');
    this.realtimeService.onPatientCalled()
      .pipe(takeUntil(this.destroy$))
      .subscribe(data => this.receberChamada(data));

    this.realtimeService.onPatientCleared()
      .pipe(takeUntil(this.destroy$))
      .subscribe(data => this.limparCard(data));

    this.realtimeService.onHistoricoUpdated()
      .pipe(takeUntil(this.destroy$))
      .subscribe(data => {
        this.historicoChamadas = data.map((h: any) => ({
          ...h,
          timestamp: new Date(h.timestamp),
          displayedAt: new Date(h.displayedAt)
        }));
      });
  }

  receberChamada(data: any): void {
    const chamada: ChamadaAtiva = {
      patientId: data.patientId,
      patientName: data.patientName || 'Paciente não identificado',
      target: data.target,
      classificationRisk: data.classificationRisk || null,
      timestamp: new Date(),
      displayedAt: new Date()
    };

    // Histórico é gerenciado exclusivamente pelo backend via fila:update_historico
    if (chamada.target === 'triagem') {
      this.exibir(chamada, 'triagem');
    } else {
      this.exibir(chamada, 'medico');
    }
  }

  private carregarEstadoDoBackend(): void {
    this.http.get<any>(`${environment.apiUrl}/fila/estado`).subscribe({
      next: (res) => {
        const data = res.data;
        if (data.currentTriagem) {
          this.currentTriagem = {
            ...data.currentTriagem,
            timestamp: new Date(data.currentTriagem.timestamp),
            displayedAt: new Date(data.currentTriagem.displayedAt)
          };
        }
        if (data.currentMedico) {
          this.currentMedico = {
            ...data.currentMedico,
            timestamp: new Date(data.currentMedico.timestamp),
            displayedAt: new Date(data.currentMedico.displayedAt)
          };
        }
        if (Array.isArray(data.historico)) {
          this.historicoChamadas = data.historico.map((h: any) => ({
            ...h,
            timestamp: new Date(h.timestamp),
            displayedAt: new Date(h.displayedAt)
          }));
        }
      },
      error: (err) => {
        console.warn('[Fila] Não foi possível carregar estado do backend:', err.message);
      }
    });
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

  ativarSom(): void {
    this.audioService.desbloquear();
    this.audioService.tocarAlerta();
  }

  get somAtivado(): boolean {
    return this.audioService.pronto;
  }

  private reproduzirAlerta(): void {
    this.audioService.tocarAlerta();
  }

  limparCard(data: any): void {
    if (data.target === 'triagem') {
      this.currentTriagem = null;
    } else if (data.target === 'medico') {
      this.currentMedico = null;
    }
  }

  getRiskClass(risk?: string | null): string {
    if (!risk) return '';
    return `tv-card--${risk.toLowerCase()}`;
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
