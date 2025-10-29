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
    
    // Verificar e corrigir se o ano tem mais de 4 dígitos
    // Isso pode acontecer se o usuário colar um valor ou em casos raros
    if (value.includes('-')) {
      const parts = value.split('-');
      if (parts[0] && parts[0].length > 4) {
        parts[0] = parts[0].substring(0, 4);
        input.value = parts.join('-');
      }
    } else if (value.length > 4) {
      // Se não tem hífen ainda mas tem mais de 4 dígitos, limitar a 4
      input.value = value.substring(0, 4);
    }
  }

  @HostListener('keydown', ['$event'])
  onKeyDown(event: KeyboardEvent): void {
    const input = event.target as HTMLInputElement;
    const value = input.value;
    const cursorPosition = input.selectionStart || 0;
    
    // Permitir teclas especiais (backspace, delete, arrows, tab, etc.)
    const allowedKeys = ['Backspace', 'Delete', 'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Tab', 'Enter', 'Home', 'End'];
    if (allowedKeys.includes(event.key)) {
      return;
    }
    
    // Se não é um dígito, bloquear (exceto teclas especiais já permitidas)
    if (!/\d/.test(event.key)) {
      event.preventDefault();
      return;
    }
    
    // Se o valor atual já tem 10 caracteres (formato completo YYYY-MM-DD), bloquear entrada
    if (value && value.length >= 10) {
      event.preventDefault();
      return;
    }
    
    // Lógica específica para limitação do ano (primeiros 4 caracteres)
    if (cursorPosition <= 4) {
      // Contar quantos dígitos já existem na parte do ano (antes do primeiro hífen ou nos primeiros 4 caracteres)
      const yearPart = value.split('-')[0] || value.substring(0, 4);
      
      // Se já temos 4 dígitos no ano e o cursor está na posição do ano, bloquear
      if (yearPart.length >= 4 && cursorPosition <= yearPart.length) {
        event.preventDefault();
        return;
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