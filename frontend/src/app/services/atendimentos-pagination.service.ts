/**
 * AtendimentosPaginationService
 * Responsabilidade: Gerenciar paginação de atendimentos
 */

import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class AtendimentosPaginationService {
  private paginaAtual = 1;
  private itensPorPagina = 10;
  private totalPaginas = 1;
  readonly pageSizeOptions = [10, 25, 50];

  /**
   * Inicializa ou reinicia a paginação
   */
  reset(): void {
    this.paginaAtual = 1;
    this.totalPaginas = 1;
  }

  /**
   * Calcula total de páginas baseado no número de itens
   */
  calculateTotalPages(totalItems: number): number {
    this.totalPaginas = Math.max(1, Math.ceil(totalItems / this.itensPorPagina));
    return this.totalPaginas;
  }

  /**
   * Obtém o slice de items para a página atual
   */
  paginate<T>(items: T[]): T[] {
    const inicio = (this.paginaAtual - 1) * this.itensPorPagina;
    const fim = inicio + this.itensPorPagina;
    return items.slice(inicio, fim);
  }

  /**
   * Navega para página anterior
   */
  previousPage(): void {
    if (this.paginaAtual > 1) {
      this.paginaAtual--;
    }
  }

  /**
   * Navega para próxima página
   */
  nextPage(): void {
    if (this.paginaAtual < this.totalPaginas) {
      this.paginaAtual++;
    }
  }

  /**
   * Vai para primeira página
   */
  goToFirstPage(): void {
    this.paginaAtual = 1;
  }

  /**
   * Vai para última página
   */
  goToLastPage(): void {
    this.paginaAtual = this.totalPaginas;
  }

  /**
   * Muda quantidade de itens por página
   */
  setPageSize(size: number): void {
    this.itensPorPagina = size;
    this.paginaAtual = 1;
  }

  // Getters
  get currentPage(): number {
    return this.paginaAtual;
  }

  get pageSize(): number {
    return this.itensPorPagina;
  }

  get totalPages(): number {
    return this.totalPaginas;
  }

  get canPrevious(): boolean {
    return this.paginaAtual > 1;
  }

  get canNext(): boolean {
    return this.paginaAtual < this.totalPaginas;
  }
}
