import { AbstractControl, ValidationErrors } from '@angular/forms';

export function dataMaxHojeValidator(control: AbstractControl): ValidationErrors | null {
  const valor = control.value;

  // Verifica se o valor é uma string vazia ou null
  if (!valor || valor.trim() === '') {
    return null;
  }

  const inputDate = new Date(valor);

  // Verifica se é uma data válida
  if (isNaN(inputDate.getTime())) {
    return null;
  }

  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0); // Ignora hora da comparação

  if (inputDate > hoje) {
    return { dataFuturaInvalida: true };
  }

  return null;
}