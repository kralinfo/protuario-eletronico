import {
  Directive,
  ElementRef,
  OnInit,
  Renderer2
} from '@angular/core';

@Directive({
  selector: '[appDateInputLimiter]',
})
export class DateInputLimiterDirective implements OnInit {

  constructor(
    private el: ElementRef,
    private renderer: Renderer2
  ) {}

  ngOnInit(): void {
    const maxDate = this.dataMax();
    this.renderer.setAttribute(this.el.nativeElement, 'max', maxDate);
    // Definir o mínimo de ano para 1900 para evitar anos inválidos
    this.renderer.setAttribute(this.el.nativeElement, 'min', '1900-01-01');
  }

  private dataMax(): string {
    const dataAtual = new Date();
    const dia = String(dataAtual.getDate()).padStart(2, '0');
    const mes = String(dataAtual.getMonth() + 1).padStart(2, '0');
    const ano = dataAtual.getFullYear();
    return `${ano}-${mes}-${dia}`;
  }
}
