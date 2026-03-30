import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { RouterModule } from '@angular/router';
import { AlertaCritico } from '../../../services/dashboard.service';

@Component({
  selector: 'app-dashboard-critical-list',
  templateUrl: './dashboard-critical-list.component.html',
  standalone: true,
  imports: [CommonModule, MatIconModule, MatPaginatorModule, RouterModule]
})
export class DashboardCriticalListComponent {
  @Input() alertas: AlertaCritico[] = [];
  @Input() carregando = false;

  // Paginação
  pageSize = 5;
  pageIndex = 0;
  pageSizeOptions = [5, 10, 15, 25, 50];

  get alertasPaginados(): AlertaCritico[] {
    const start = this.pageIndex * this.pageSize;
    const end = start + this.pageSize;
    return (this.alertas || []).slice(start, end);
  }

  onPageChange(event: PageEvent): void {
    this.pageSize = event.pageSize;
    this.pageIndex = event.pageIndex;
  }

  getCorClassificacao(c: string): string {
    switch ((c || '').toLowerCase()) {
      case 'vermelho': return '#ef4444';
      case 'laranja':  return '#f97316';
      default:         return '#d1d5db';
    }
  }

  getBadgeClass(c: string): string {
    switch ((c || '').toLowerCase()) {
      case 'vermelho': return 'bg-red-100 text-red-700 border border-red-200';
      case 'laranja':  return 'bg-orange-100 text-orange-700 border border-orange-200';
      default:         return 'bg-gray-100 text-gray-700 border border-gray-200';
    }
  }

  trackByAlerta(_: number, a: AlertaCritico): number { return a.id; }
}
