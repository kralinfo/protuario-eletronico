import { Component, OnInit } from '@angular/core';

@Component({
  selector: 'app-politica-privacidade',
  templateUrl: './politica-privacidade.component.html',
  styleUrls: ['./politica-privacidade.component.scss']
})
export class PoliticaPrivacidadeComponent implements OnInit {
  versao = '1.0.0';
  dataAtualizacao = '08/04/2026';

  constructor() { }

  ngOnInit(): void { }
}
