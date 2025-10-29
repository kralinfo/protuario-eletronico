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
    
    // Apenas corrigir valores inválidos após a digitação
    if (value && value.length > 0) {
      // Se temos um valor no formato YYYY-MM-DD e o ano tem mais de 4 dígitos
      if (value.match(/^\d{5,}-/)) {
        const parts = value.split('-');
        if (parts[0].length > 4) {
          parts[0] = parts[0].substring(0, 4);
          input.value = parts.join('-');
        }
      }
    }
  }

  @HostListener('blur', ['$event'])
  onBlur(event: any): void {
    // Validação final quando o usuário sair do campo
    const input = event.target;
    let value = input.value;
    
    if (value && value.includes('-')) {
      const parts = value.split('-');
      if (parts[0] && parts[0].length > 4) {
        parts[0] = parts[0].substring(0, 4);
        input.value = parts.join('-');
        
        // Disparar evento de mudança para atualizar o formulário
        const changeEvent = new Event('input', { bubbles: true });
        input.dispatchEvent(changeEvent);
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
