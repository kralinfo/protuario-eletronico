import { Component, Input, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';

type Cor = 'red' | 'blue' | 'green' | 'orange' | 'purple' | 'gray';

// Mapa estático — garante que o Tailwind não purgue as classes
const COR: Record<Cor, { bg: string; icon: string; valor: string; ring: string }> = {
  red:    { bg: 'bg-red-100',    icon: 'text-red-500',    valor: 'text-red-600',    ring: 'ring-red-200'    },
  blue:   { bg: 'bg-blue-100',   icon: 'text-blue-500',   valor: 'text-blue-600',   ring: 'ring-blue-200'   },
  green:  { bg: 'bg-green-100',  icon: 'text-green-500',  valor: 'text-green-600',  ring: 'ring-green-200'  },
  orange: { bg: 'bg-orange-100', icon: 'text-orange-500', valor: 'text-orange-600', ring: 'ring-orange-200' },
  purple: { bg: 'bg-purple-100', icon: 'text-purple-500', valor: 'text-purple-600', ring: 'ring-purple-200' },
  gray:   { bg: 'bg-gray-100',   icon: 'text-gray-500',   valor: 'text-gray-700',   ring: 'ring-gray-200'   },
};

@Component({
  selector: 'app-dashboard-kpi-card',
  templateUrl: './dashboard-kpi-card.component.html',
  standalone: true,
  imports: [CommonModule, MatIconModule, MatProgressSpinnerModule]
})
export class DashboardKpiCardComponent implements OnChanges {
  @Input() titulo = '';
  @Input() valor: number | string = 0;
  @Input() icone = 'info';
  @Input() cor: Cor = 'blue';
  @Input() subtitulo = '';
  @Input() carregando = false;

  classes = COR.blue;

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['cor']) {
      this.classes = COR[this.cor] ?? COR.blue;
    }
  }
}
