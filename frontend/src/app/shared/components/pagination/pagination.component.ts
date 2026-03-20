import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';

type PageItem = number | 'dots';

@Component({
  selector: 'app-pagination',
  templateUrl: './pagination.component.html',
  styleUrls: ['./pagination.component.scss'],
  standalone: true,
  imports: [CommonModule]
})
export class PaginationComponent {
  @Input() current = 1; // 1-based
  @Input() total = 1;
  @Input() maxButtons = 7; // total visible buttons including first/last and dots
  @Output() change = new EventEmitter<number>();

  get pages(): PageItem[] {
    return this.buildPages(this.current, this.total, this.maxButtons);
  }

  go(page: number) {
    if (page < 1 || page > this.total || page === this.current) return;
    this.change.emit(page);
  }

  private buildPages(current: number, total: number, maxButtons: number): PageItem[] {
    const pages: PageItem[] = [];
    if (total <= maxButtons) {
      for (let i = 1; i <= total; i++) pages.push(i);
      return pages;
    }

    const sideCount = 1; // keep first and last
    const middle = maxButtons - 2; // reserve first and last
    const left = Math.max(2, current - Math.floor((middle - 1) / 2));
    const right = Math.min(total - 1, left + middle - 1);
    // adjust left if we're near the end
    const newLeft = Math.max(2, right - (middle - 1));

    pages.push(1);
    if (newLeft > 2) pages.push('dots');
    for (let i = newLeft; i <= right; i++) pages.push(i);
    if (right < total - 1) pages.push('dots');
    pages.push(total);
    return pages;
  }
}
