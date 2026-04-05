/**
 * RealtimeStatusComponent
 * Componente que exibe status de conexão WebSocket
 * Deve ser incluído no header/navbar da aplicação
 * 
 * Uso: <app-realtime-status></app-realtime-status>
 */

import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { trigger, style, animate, transition } from '@angular/animations';
import { RealtimeService, RealtimeConnection } from '../../services/realtime.service';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

@Component({
  selector: 'app-realtime-status',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="realtime-status" 
         [ngClass]="{ 'connected': connection.connected, 'disconnected': !connection.connected }">
      
      <span class="status-indicator" 
            [ngClass]="{ 'pulse': connection.connected }"></span>
      
      <span class="status-text">
        {{ connection.connected ? 'Conectado' : 'Desconectado' }}
      </span>

      <span class="module-info" *ngIf="connection.module !== 'idle'">
        • {{ connection.module }}
      </span>

      <div class="status-tooltip">
        <div>Status: {{ connection.connected ? 'Online' : 'Offline' }}</div>
        <div *ngIf="connection.socketId">ID: {{ connection.socketId | slice:0:8 }}...</div>
        <div *ngIf="connection.module && connection.module !== 'idle'">Módulo: {{ connection.module }}</div>
        <div>Última atualização: {{ connection.lastUpdate | date:'short' }}</div>
      </div>
    </div>
  `,
  styles: [`
    .realtime-status {
      display: flex;
      align-items: center;
      gap: 6px;
      padding: 4px 12px;
      border-radius: 4px;
      font-size: 12px;
      font-weight: 500;
      transition: all 0.3s ease;
      position: relative;
      cursor: help;
    }

    .connected {
      background: rgba(40, 167, 69, 0.1);
      color: #28a745;
    }

    .disconnected {
      background: rgba(220, 53, 69, 0.1);
      color: #dc3545;
    }

    .status-indicator {
      display: inline-block;
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background: currentColor;
    }

    .status-indicator.pulse {
      animation: pulse 2s infinite;
    }

    @keyframes pulse {
      0%, 100% {
        opacity: 1;
      }
      50% {
        opacity: 0.5;
      }
    }

    .status-text {
      font-size: 11px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    .module-info {
      font-size: 11px;
      opacity: 0.8;
    }

    .status-tooltip {
      position: absolute;
      bottom: -140px;
      left: 50%;
      transform: translateX(-50%);
      background: #333;
      color: white;
      padding: 10px 12px;
      border-radius: 4px;
      font-size: 11px;
      white-space: nowrap;
      opacity: 0;
      pointer-events: none;
      transition: opacity 0.3s;
      z-index: 1000;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
    }

    .status-tooltip::before {
      content: '';
      position: absolute;
      top: -4px;
      left: 50%;
      transform: translateX(-50%);
      width: 0;
      height: 0;
      border-left: 4px solid transparent;
      border-right: 4px solid transparent;
      border-bottom: 4px solid #333;
    }

    .status-tooltip div {
      margin: 2px 0;
      line-height: 1.4;
    }

    .realtime-status:hover .status-tooltip {
      opacity: 1;
      pointer-events: auto;
    }

    @media (max-width: 600px) {
      .status-text {
        display: none;
      }

      .module-info {
        display: none;
      }

      .status-tooltip {
        bottom: -120px;
      }
    }
  `]
})
export class RealtimeStatusComponent implements OnInit, OnDestroy {
  connection: RealtimeConnection = {
    connected: false,
    socketId: '',
    module: 'idle',
    lastUpdate: new Date()
  };

  private destroy$ = new Subject<void>();

  constructor(private realtimeService: RealtimeService) {}

  ngOnInit(): void {
    this.realtimeService.getConnectionStatus()
      .pipe(takeUntil(this.destroy$))
      .subscribe(connection => {
        this.connection = connection;
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
