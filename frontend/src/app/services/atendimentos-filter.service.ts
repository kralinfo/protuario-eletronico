/**
 * AtendimentosFilterService
 * Responsabilidade: Gerenciar filtros e buscas de atendimentos
 */

import { Injectable } from '@angular/core';

export interface IAtendimento {
  paciente_nome?: string;
  paciente_id?: number;
  motivo?: string;
  status?: string;
  abandonado?: boolean;
  [key: string]: any;
}

@Injectable({
  providedIn: 'root'
})
export class AtendimentosFilterService {

  /**
   * Filtra atendimentos por texto de busca (nome ou motivo)
   */
  filterByText<T extends IAtendimento>(items: T[], searchText: string): T[] {
    if (!searchText || !searchText.trim()) {
      return items;
    }

    const lowerSearch = searchText.toLowerCase();
    return items.filter(item =>
      item.paciente_nome?.toLowerCase().includes(lowerSearch) ||
      item.motivo?.toLowerCase().includes(lowerSearch)
    );
  }

  /**
   * Filtra atendimentos por status
   */
  filterByStatus<T extends IAtendimento>(items: T[], status: string): T[] {
    if (!status) return items;
    return items.filter(item => item.status === status);
  }

  /**
   * Filtra atendimentos abandonados ou não
   */
  filterByAbandonment<T extends IAtendimento>(items: T[], showAbandoned: boolean): T[] {
    return items.filter(item => item.abandonado === showAbandoned);
  }

  /**
   * Filtra atendimentos por período de data
   */
  filterByDateRange<T extends IAtendimento>(
    items: T[],
    startDate: string,
    endDate: string,
    dateField: string = 'data_hora_atendimento'
  ): T[] {
    if (!startDate || !endDate) return items;

    const start = new Date(startDate).getTime();
    const end = new Date(endDate).getTime();

    return items.filter(item => {
      const itemDate = item[dateField];
      if (!itemDate) return false;

      const itemTime = new Date(itemDate).getTime();
      return itemTime >= start && itemTime <= end;
    });
  }

  /**
   * Aplica múltiplos filtros em sequência
   */
  applyFilters<T extends IAtendimento>(
    items: T[],
    filters: {
      searchText?: string;
      status?: string;
      showAbandoned?: boolean;
      startDate?: string;
      endDate?: string;
    }
  ): T[] {
    let filtered = items;

    if (filters.searchText) {
      filtered = this.filterByText(filtered, filters.searchText);
    }

    if (filters.status) {
      filtered = this.filterByStatus(filtered, filters.status);
    }

    if (filters.showAbandoned !== undefined) {
      filtered = this.filterByAbandonment(filtered, filters.showAbandoned);
    }

    if (filters.startDate && filters.endDate) {
      filtered = this.filterByDateRange(filtered, filters.startDate, filters.endDate);
    }

    return filtered;
  }
}
