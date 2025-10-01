import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { MedicoService } from 'src/app/medico/medico.service';

@Component({
  selector: 'app-medico-consulta-form',
  templateUrl: './medico-consulta-form.component.html',
  styleUrls: ['./medico-consulta-form.component.scss'],
  standalone: true,
  imports: [FormsModule]
})
export class MedicoConsultaFormComponent implements OnInit {
  consulta: any = {};
  triagem: any = {};
  atendimentoId: string = '';

  constructor(private route: ActivatedRoute, private medicoService: MedicoService) {}

  ngOnInit() {
    console.log('[MedicoConsultaForm] ngOnInit chamado!');
    this.atendimentoId = this.route.snapshot.paramMap.get('id') || '';
    console.log('[MedicoConsultaForm] atendimentoId:', this.atendimentoId);
    this.medicoService.getConsulta(this.atendimentoId).subscribe({
      next: (data: any) => {
        console.log('[MedicoConsultaForm] Dados recebidos da API:', data);
        this.consulta = data?.consulta || {};
        this.triagem = data?.triagem || {};
      },
      error: (err) => {
        console.error('[MedicoConsultaForm] Erro ao carregar consulta:', err);
      }
    });
  }

  salvarConsulta() {
    this.medicoService.salvarConsulta(this.atendimentoId, this.consulta).subscribe();
  }
}
