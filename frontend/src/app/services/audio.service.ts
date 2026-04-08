import { Injectable } from '@angular/core';

/**
 * Serviço singleton que gerencia o AudioContext do browser.
 * O AudioContext precisa ser desbloqueado após uma interação do usuário.
 * Ao registrar o listener no AppComponent, qualquer clique no app
 * (incluindo o login) já desbloqueia o som para a tela de fila.
 */
@Injectable({ providedIn: 'root' })
export class AudioService {
  private ctx: AudioContext | null = null;
  private desbloqueado = false;

  constructor() {
    try {
      this.ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    } catch {}
  }

  /** Chama este método no primeiro clique/toque de qualquer componente raiz */
  desbloquear(): void {
    if (this.desbloqueado) return;
    if (!this.ctx) {
      try {
        this.ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      } catch {}
    }
    if (this.ctx?.state === 'suspended') {
      this.ctx.resume().then(() => { this.desbloqueado = true; }).catch(() => {});
    } else {
      this.desbloqueado = true;
    }
  }

  get pronto(): boolean {
    return this.desbloqueado && !!this.ctx && this.ctx.state === 'running';
  }

  tocarAlerta(): void {
    const ctx = this.ctx;
    if (!ctx) return;

    const tocar = () => {
      const nota = (freq: number, delay: number) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, ctx.currentTime + delay);
        gain.gain.setValueAtTime(0, ctx.currentTime + delay);
        gain.gain.linearRampToValueAtTime(0.6, ctx.currentTime + delay + 0.01);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + delay + 1.4);
        osc.start(ctx.currentTime + delay);
        osc.stop(ctx.currentTime + delay + 1.4);
      };
      nota(880, 0);
      nota(1108, 0.4);
      nota(880, 0.8);
    };

    if (ctx.state === 'suspended') {
      ctx.resume().then(tocar).catch(() => {});
    } else {
      tocar();
    }
  }
}
