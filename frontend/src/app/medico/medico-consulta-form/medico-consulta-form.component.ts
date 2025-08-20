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
  atendimentoId: string = '';

  constructor(private route: ActivatedRoute, private medicoService: MedicoService) {}

  ngOnInit() {
    this.atendimentoId = this.route.snapshot.paramMap.get('id') || '';
    this.medicoService.getConsulta(this.atendimentoId).subscribe((data: any) => {
      this.consulta = data || {};
    });
  }

  salvarConsulta() {
    this.medicoService.salvarConsulta(this.atendimentoId, this.consulta).subscribe();
  }
}
