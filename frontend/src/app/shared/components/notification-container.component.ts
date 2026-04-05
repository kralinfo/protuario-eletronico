/**
 * NotificationContainerComponent
 * Componente central que exibe notificações toast
 * Deve ser incluído uma vez no app.component
 * 
 * Uso no app.component.html:
 * <app-notification-container></app-notification-container>
 */

import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { trigger, transition, style, animate, state } from '@angular/animations';
import { NotificationService, Notification } from '../../services/notification.service';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

@Component({
  selector: 'app-notification-container',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="notification-container">
      <div *ngFor="let notification of notifications" 
           [ngClass]="['notification', 'notification-' + notification.type]"
           [@slideIn]
           (@slideIn.done)="onAnimationComplete($event, notification.id)">
        
        <div class="notification-icon">
          <span [innerHTML]="getIcon(notification.type)"></span>
        </div>

        <div class="notification-content">
          <div class="notification-title">{{ notification.title }}</div>
          <div class="notification-message">{{ notification.message }}</div>
        </div>

        <div class="notification-actions" *ngIf="notification.action">
          <button (click)="executeAction(notification)" class="action-btn">
            {{ notification.action.label }}
          </button>
        </div>

        <button (click)="dismiss(notification.id)" class="close-btn">
          ×
        </button>
      </div>

      <div class="notification-badge-container" *ngIf="badges.size > 0">
        <div *ngFor="let badge of badges | keyvalue" 
             [ngClass]="['badge', 'badge-' + badge.value.severity]">
          <span class="badge-module">{{ badge.value.module }}</span>
          <span class="badge-count">{{ badge.value.count }}</span>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .notification-container {
      position: fixed;
      top: 20px;
      right: 20px;
      z-index: 9999;
      max-width: 400px;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
    }

    .notification {
      display: flex;
      align-items: flex-start;
      gap: 12px;
      padding: 16px;
      margin-bottom: 12px;
      border-radius: 8px;
      background: white;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
      border-left: 4px solid;
      animation: slideIn 0.3s ease-out;
    }

    .notification-success {
      border-left-color: #28a745;
      background: linear-gradient(135deg, #f0f9f4 0%, #ffffff 100%);
    }

    .notification-error {
      border-left-color: #dc3545;
      background: linear-gradient(135deg, #fef5f5 0%, #ffffff 100%);
    }

    .notification-warning {
      border-left-color: #ffc107;
      background: linear-gradient(135deg, #fffbf0 0%, #ffffff 100%);
    }

    .notification-info {
      border-left-color: #17a2b8;
      background: linear-gradient(135deg, #f0f7fb 0%, #ffffff 100%);
    }

    .notification-icon {
      font-size: 20px;
      flex-shrink: 0;
      margin-top: 2px;
    }

    .notification-content {
      flex: 1;
      min-width: 0;
    }

    .notification-title {
      font-weight: 600;
      font-size: 14px;
      margin-bottom: 4px;
      color: #333;
    }

    .notification-message {
      font-size: 13px;
      color: #666;
      line-height: 1.4;
      word-break: break-word;
    }

    .notification-actions {
      display: flex;
      gap: 8px;
      margin-top: 8px;
      flex-shrink: 0;
    }

    .action-btn {
      padding: 4px 12px;
      background: rgba(0, 0, 0, 0.05);
      border: 1px solid rgba(0, 0, 0, 0.1);
      border-radius: 4px;
      cursor: pointer;
      font-size: 12px;
      font-weight: 500;
      transition: all 0.2s;
    }

    .action-btn:hover {
      background: rgba(0, 0, 0, 0.1);
    }

    .close-btn {
      background: none;
      border: none;
      font-size: 24px;
      color: #999;
      cursor: pointer;
      padding: 0;
      width: 24px;
      height: 24px;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
      transition: color 0.2s;
    }

    .close-btn:hover {
      color: #333;
    }

    .notification-badge-container {
      position: fixed;
      bottom: 20px;
      right: 20px;
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    .badge {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 8px 12px;
      border-radius: 20px;
      font-size: 12px;
      font-weight: 600;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
      animation: slideInBadge 0.3s ease-out;
    }

    .badge-high {
      background: #dc3545;
      color: white;
    }

    .badge-normal {
      background: #ffc107;
      color: #333;
    }

    .badge-low {
      background: #17a2b8;
      color: white;
    }

    .badge-module {
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    .badge-count {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 24px;
      height: 24px;
      background: rgba(0, 0, 0, 0.2);
      border-radius: 50%;
    }

    @keyframes slideIn {
      from {
        transform: translateX(400px);
        opacity: 0;
      }
      to {
        transform: translateX(0);
        opacity: 1;
      }
    }

    @keyframes slideInBadge {
      from {
        transform: translateX(100px);
        opacity: 0;
      }
      to {
        transform: translateX(0);
        opacity: 1;
      }
    }

    @media (max-width: 600px) {
      .notification-container {
        max-width: calc(100% - 20px);
        width: calc(100% - 20px);
        right: 10px;
        left: 10px;
      }

      .notification {
        margin-bottom: 8px;
        padding: 12px;
      }

      .notification-title {
        font-size: 13px;
      }

      .notification-message {
        font-size: 12px;
      }
    }
  `],
  animations: [
    trigger('slideIn', [
      transition(':enter', [
        style({ transform: 'translateX(400px)', opacity: 0 }),
        animate('300ms ease-out', style({ transform: 'translateX(0)', opacity: 1 }))
      ]),
      transition(':leave', [
        animate('300ms ease-in', style({ transform: 'translateX(400px)', opacity: 0 }))
      ])
    ])
  ]
})
export class NotificationContainerComponent implements OnInit, OnDestroy {
  notifications: Notification[] = [];
  badges = new Map<string, any>();
  private destroy$ = new Subject<void>();

  constructor(private notificationService: NotificationService) {}

  ngOnInit(): void {
    // Subscribe to notifications
    this.notificationService.getNotifications()
      .pipe(takeUntil(this.destroy$))
      .subscribe(notifications => {
        this.notifications = notifications;
      });

    // Subscribe to badges
    this.notificationService.getBadges()
      .pipe(takeUntil(this.destroy$))
      .subscribe(badges => {
        this.badges = badges;
      });
  }

  dismiss(id: string): void {
    this.notificationService.dismiss(id);
  }

  executeAction(notification: Notification): void {
    if (notification.action) {
      notification.action.callback();
      this.dismiss(notification.id);
    }
  }

  getIcon(type: string): string {
    const icons: { [key: string]: string } = {
      success: '✅',
      error: '❌',
      warning: '⚠️',
      info: 'ℹ️'
    };

    return icons[type] || 'ℹ️';
  }

  onAnimationComplete(event: any, id: string): void {
    // Pode ser usado para lógica adicional se necessário
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
