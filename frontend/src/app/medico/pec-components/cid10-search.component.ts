import { Component, EventEmitter, Output, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { CID10_TABLE, CID10Entry } from '../../utils/cid10-table';

@Component({
  selector: 'app-cid10-search',
  standalone: true,
  imports: [CommonModule, FormsModule, MatIconModule, MatProgressSpinnerModule],
  templateUrl: './cid10-search.component.html',
  styleUrls: ['./cid10-search.component.scss']
})
export class Cid10SearchComponent implements OnInit {
  @Output() cidSelecionado = new EventEmitter<{code: string, description: string}>();
  @Output() fechar = new EventEmitter<void>();

  termoBusca = '';
  resultados: CID10Entry[] = [];
  mostrandoResultados = false;
  carregando = false;

  ngOnInit() {
    // Focar no input ao abrir
    setTimeout(() => {
      const input = document.getElementById('cid10-input') as HTMLInputElement;
      if (input) input.focus();
    }, 100);
  }

  onBuscaChange(): void {
    if (this.termoBusca.length < 2) {
      this.resultados = [];
      this.mostrandoResultados = false;
      return;
    }

    this.carregando = true;
    const termo = this.termoBusca.toLowerCase().trim();

    // Busca por codigo ou descricao
    this.resultados = CID10_TABLE.filter((entry: CID10Entry) =>
      entry.code.toLowerCase().includes(termo) ||
      entry.description.toLowerCase().includes(termo)
    ).slice(0, 50); // Limita a 50 resultados

    this.mostrandoResultados = this.resultados.length > 0;
    this.carregando = false;
  }

  selecionar(entry: CID10Entry): void {
    this.cidSelecionado.emit({ code: entry.code, description: entry.description });
    this.fechar.emit();
  }

  fecharBusca(): void {
    this.fechar.emit();
  }
}
