import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-politica-privacidade',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './politica-privacidade.component.html',
  styleUrls: ['./politica-privacidade.component.scss']
})
export class PoliticaPrivacidadeComponent implements OnInit {
  versao = '1.0.0';
  dataAtualizacao = '08/04/2026';

  constructor() { }

  ngOnInit(): void { }
}
