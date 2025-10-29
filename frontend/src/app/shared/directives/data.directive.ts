import {
  Directive,
  ElementRef,
  OnInit,
  Renderer2,
  HostListener
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

  @HostListener('input', ['$event'])
  onInput(event: any): void {
    const input = event.target;
    let value = input.value;
    
    // Se o valor tem mais de 10 caracteres (formato YYYY-MM-DD), limitar
    if (value && value.length > 10) {
      value = value.substring(0, 10);
      input.value = value;
    }
    
    // Verificar se o ano tem mais de 4 dígitos
    const datePattern = /^(\d{1,4})-(\d{1,2})-(\d{1,2})$/;
    const match = value.match(datePattern);
    
    if (match && match[1].length > 4) {
      // Limitar o ano a 4 dígitos
      const year = match[1].substring(0, 4);
      const month = match[2];
      const day = match[3];
      input.value = `${year}-${month}-${day}`;
    }
  }

  @HostListener('keydown', ['$event'])
  onKeyDown(event: KeyboardEvent): void {
    const input = event.target as HTMLInputElement;
    const value = input.value;
    
    // Permitir teclas especiais (backspace, delete, arrows, tab, etc.)
    const allowedKeys = ['Backspace', 'Delete', 'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Tab', 'Enter'];
    if (allowedKeys.includes(event.key)) {
      return;
    }
    
    // Se o valor atual já tem 10 caracteres (formato completo YYYY-MM-DD), bloquear entrada
    if (value && value.length >= 10) {
      event.preventDefault();
      return;
    }
    
    // Verificar se estamos digitando na parte do ano e já temos 4 dígitos
    const cursorPosition = input.selectionStart || 0;
    if (cursorPosition <= 4 && value.length >= 4 && !value.includes('-')) {
      // Estamos na parte do ano e já temos 4 dígitos, bloquear mais dígitos
      if (/\d/.test(event.key)) {
        event.preventDefault();
      }
    }
  }

  private dataMax(): string {
    const dataAtual = new Date();
    const dia = String(dataAtual.getDate()).padStart(2, '0');
    const mes = String(dataAtual.getMonth() + 1).padStart(2, '0');
    const ano = dataAtual.getFullYear();
    return `${ano}-${mes}-${dia}`;
  }
}