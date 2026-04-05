/**
 * NotificationService
 * Serviço centralizado para gerenciar notificações
 * Suporta múltiplos tipos de notificações:
 * - Toast (mensagens temporárias)
 * - Badge (contador no ícone)
 * - Sound (áudio)
 * - Desktop (notificações do sistema)
 */

import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';

export interface Notification {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  title: string;
  message: string;
  icon?: string;
  duration?: number; // em ms, 0 = permanente
  action?: {
    label: string;
    callback: () => void;
  };
  timestamp: Date;
  read: boolean;
}

export interface Badge {
  module: string;
  count: number;
  severity: 'high' | 'normal' | 'low';
}

@Injectable({
  providedIn: 'root'
})
export class NotificationService {
  private notifications$ = new BehaviorSubject<Notification[]>([]);
  private badges$ = new BehaviorSubject<Map<string, Badge>>(new Map());
  private unreadCount$ = new BehaviorSubject<number>(0);

  private notificationId = 0;
  private audioEnabled = true;
  private desktopNotificationsEnabled = false;

  constructor() {
    this._requestDesktopPermission();
  }

  /**
   * Adiciona notificação
   */
  notify(
    type: 'success' | 'error' | 'warning' | 'info',
    title: string,
    message: string,
    options: Partial<Notification> = {}
  ): string {
    const id = `notification-${++this.notificationId}`;

    const notification: Notification = {
      id,
      type,
      title,
      message,
      icon: options.icon,
      duration: options.duration !== undefined ? options.duration : 5000,
      action: options.action,
      timestamp: new Date(),
      read: false
    };

    const current = this.notifications$.value;
    this.notifications$.next([...current, notification]);

    // Incrementar unread count
    this.unreadCount$.next(this.unreadCount$.value + 1);

    // Play áudio se habilitado
    if (this.audioEnabled) {
      this._playNotificationSound(type);
    }

    // Desktop notification
    if (this.desktopNotificationsEnabled) {
      this._sendDesktopNotification(notification);
    }

    // Auto-remover após duração
    if (notification.duration && notification.duration > 0) {
      setTimeout(() => this.dismiss(id), notification.duration);
    }

    console.log(`🔔 Notificação [${type}]: ${title}`);

    return id;
  }

  /**
   * Notificação de sucesso
   */
  success(title: string, message: string, options?: Partial<Notification>): string {
    return this.notify('success', title, message, options);
  }

  /**
   * Notificação de erro
   */
  error(title: string, message: string, options?: Partial<Notification>): string {
    return this.notify('error', title, message, { duration: 8000, ...options });
  }

  /**
   * Notificação de aviso
   */
  warning(title: string, message: string, options?: Partial<Notification>): string {
    return this.notify('warning', title, message, { duration: 6000, ...options });
  }

  /**
   * Notificação de informação
   */
  info(title: string, message: string, options?: Partial<Notification>): string {
    return this.notify('info', title, message, options);
  }

  /**
   * Paciente chegou (notificação especializada)
   */
  patientArrived(patientName: string, module: string, classification: string): string {
    return this.notify('success', 'Novo Paciente', 
      `${patientName} chegou no ${module} (Classificação: ${classification})`,
      {
        duration: 10000,
        icon: '👥',
        action: {
          label: 'Ver',
          callback: () => {
            console.log('Navigating to patient:', patientName);
          }
        }
      }
    );
  }

  /**
   * Triagem finalizada (notificação especializada)
   */
  triagemFinished(patientName: string, classification: string): string {
    return this.notify('success', 'Triagem Concluída',
      `Triagem de ${patientName} finalizada. Classificação: ${classification}`,
      {
        duration: 7000,
        icon: '✅'
      }
    );
  }

  /**
   * Atendimento iniciado (notificação especializada)
   */
  atendimentoStarted(patientName: string, module: string): string {
    return this.notify('info', 'Atendimento Iniciado',
      `Atendimento de ${patientName} foi iniciado em ${module}`,
      {
        duration: 5000,
        icon: '🏥'
      }
    );
  }

  /**
   * Marca notificação como lida
   */
  markAsRead(id: string): void {
    const notifications = this.notifications$.value.map(n => 
      n.id === id ? { ...n, read: true } : n
    );

    this.notifications$.next(notifications);

    const unread = notifications.filter(n => !n.read).length;
    this.unreadCount$.next(unread);
  }

  /**
   * Marca todas as notificações como lidas
   */
  markAllAsRead(): void {
    const notifications = this.notifications$.value.map(n => ({ ...n, read: true }));
    this.notifications$.next(notifications);
    this.unreadCount$.next(0);
  }

  /**
   * Descarta notificação
   */
  dismiss(id: string): void {
    const notifications = this.notifications$.value.filter(n => n.id !== id);
    this.notifications$.next(notifications);
  }

  /**
   * Limpa todas as notificações
   */
  clearAll(): void {
    this.notifications$.next([]);
    this.unreadCount$.next(0);
  }

  /**
   * Adiciona badge para módulo
   */
  addBadge(module: string, count: number, severity: 'high' | 'normal' | 'low' = 'normal'): void {
    const badges = new Map(this.badges$.value);
    badges.set(module, { module, count, severity });
    this.badges$.next(badges);

    console.log(`🔴 Badge adicionado: ${module} (${count})`);
  }

  /**
   * Remove badge
   */
  removeBadge(module: string): void {
    const badges = new Map(this.badges$.value);
    badges.delete(module);
    this.badges$.next(badges);
  }

  /**
   * Incrementa badge
   */
  incrementBadge(module: string, amount: number = 1): void {
    const badges = new Map(this.badges$.value);
    const badge = badges.get(module);

    if (badge) {
      badge.count += amount;
    } else {
      badges.set(module, { module, count: amount, severity: 'normal' });
    }

    this.badges$.next(badges);
  }

  /**
   * Decrementa badge
   */
  decrementBadge(module: string, amount: number = 1): void {
    const badges = new Map(this.badges$.value);
    const badge = badges.get(module);

    if (badge && badge.count > 0) {
      badge.count -= amount;
      if (badge.count === 0) {
        badges.delete(module);
      }
    }

    this.badges$.next(badges);
  }

  /**
   * Obtém observable de notificações
   */
  getNotifications(): Observable<Notification[]> {
    return this.notifications$.asObservable();
  }

  /**
   * Obtém observable de badges
   */
  getBadges(): Observable<Map<string, Badge>> {
    return this.badges$.asObservable();
  }

  /**
   * Obtém observable de contagem de não lidas
   */
  getUnreadCount(): Observable<number> {
    return this.unreadCount$.asObservable();
  }

  /**
   * Ativa/desativa áudio de notificação
   */
  setAudioEnabled(enabled: boolean): void {
    this.audioEnabled = enabled;
  }

  /**
   * Toca som de notificação
   * @private
   */
  private _playNotificationSound(type: string): void {
    try {
      // Usar Web Audio API para tocar som simples
      const audioContext = new (window as any).AudioContext();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);

      // Diferentes tons para diferentes tipos
      const frequencies: { [key: string]: number } = {
        success: 800,
        error: 400,
        warning: 600,
        info: 900
      };

      oscillator.frequency.value = frequencies[type] || 600;
      gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.2);

      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.2);
    } catch (error) {
      // AudioContext pode não estar disponível, ignorar silenciosamente
    }
  }

  /**
   * Envia notificação desktop do sistema
   * @private
   */
  private _sendDesktopNotification(notification: Notification): void {
    if ('Notification' in window && this.desktopNotificationsEnabled) {
      try {
        new (window as any).Notification(notification.title, {
          body: notification.message,
          icon: this._getIconUrl(notification.type),
          tag: notification.id
        });
      } catch (error) {
        console.warn('Não foi possível enviar notificação desktop:', error);
      }
    }
  }

  /**
   * Solicita permissão para notificações desktop
   * @private
   */
  private _requestDesktopPermission(): void {
    if ('Notification' in window) {
      if ((window as any).Notification.permission === 'granted') {
        this.desktopNotificationsEnabled = true;
      } else if ((window as any).Notification.permission !== 'denied') {
        (window as any).Notification.requestPermission().then((permission: string) => {
          this.desktopNotificationsEnabled = permission === 'granted';
        });
      }
    }
  }

  /**
   * Obtém URL do ícone baseado no tipo
   * @private
   */
  private _getIconUrl(type: string): string {
    const icons: { [key: string]: string } = {
      success: '✅',
      error: '❌',
      warning: '⚠️',
      info: 'ℹ️'
    };

    return icons[type] || 'ℹ️';
  }
}
