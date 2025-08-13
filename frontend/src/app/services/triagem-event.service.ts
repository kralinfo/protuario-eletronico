import { Injectable } from '@angular/core';
import { BehaviorSubject, Subject } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class TriagemEventService {
  // Subject para notificar novo atendimento
  private novoAtendimentoSource = new Subject<void>();
  public novoAtendimento$ = this.novoAtendimentoSource.asObservable();
  // Subject para notificar quando uma triagem é finalizada
  private triagemFinalizadaSource = new Subject<void>();
  public triagemFinalizada$ = this.triagemFinalizadaSource.asObservable();

  // Subject para forçar atualização da dashboard
  private atualizarDashboardSource = new Subject<void>();
  public atualizarDashboard$ = this.atualizarDashboardSource.asObservable();

  // Subject para atualizar fila de triagem
  private atualizarFilaSource = new Subject<void>();
  public atualizarFila$ = this.atualizarFilaSource.asObservable();

  constructor() {}

  // Método chamado quando uma triagem é finalizada
  notificarTriagemFinalizada() {
    console.log('TriagemEventService: Notificando triagem finalizada');
    this.triagemFinalizadaSource.next();
    this.atualizarDashboardSource.next();
    this.atualizarFilaSource.next();
  }

  // Método chamado quando uma triagem é iniciada
  notificarTriagemIniciada() {
    console.log('TriagemEventService: Notificando triagem iniciada');
    this.atualizarDashboardSource.next();
    this.atualizarFilaSource.next();
  }

  // Método chamado quando um novo atendimento é criado
  notificarNovoAtendimento() {
    console.log('TriagemEventService: Notificando novo atendimento');
    this.novoAtendimentoSource.next();
    this.atualizarDashboardSource.next();
    this.atualizarFilaSource.next();
  }

  // Forçar atualização geral
  forcarAtualizacao() {
    console.log('TriagemEventService: Forçando atualização geral');
    this.atualizarDashboardSource.next();
    this.atualizarFilaSource.next();
  }
}
