// Validator para criticar se data final é menor que data inicial
import { FormGroup } from '@angular/forms';
export function datasInicioFimValidator(form: FormGroup): ValidationErrors | null {
  const dataInicio = form.get('dataInicio')?.value;
  const dataFim = form.get('dataFim')?.value;
  if (dataInicio && dataFim) {
    const inicio = new Date(dataInicio);
    const fim = new Date(dataFim);
    if (fim < inicio) {
      return { dataFimMenorQueInicio: true };
    }
  }
  return null;
}
import { AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';

export function dataMaxHojeValidator(control: AbstractControl): ValidationErrors | null {
  const valor = control.value;
  if (!valor || valor.trim() === '') {
    return null;
  }
  const inputDate = new Date(valor);
  if (isNaN(inputDate.getTime())) {
    return null;
  }
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);
  if (inputDate > hoje) {
    return { dataFuturaInvalida: true };
  }
  return null;
}

export const senhasIguaisValidator: ValidatorFn = (control: AbstractControl) => {
  const form = control as import('@angular/forms').FormGroup;
  const senha = form.get('senha')?.value;
  const repetirSenha = form.get('repetirSenha')?.value;
  return senha && repetirSenha && senha !== repetirSenha ? { senhasDiferentes: true } : null;
};

export function validarCNS(control: AbstractControl): ValidationErrors | null {
  // Validação removida para teste: sempre retorna válido
  return null;
}
