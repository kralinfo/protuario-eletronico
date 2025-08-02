import { AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';
import { FORM_VALIDATION } from '../constants/usuario.constants';

export class UsuarioValidators {
  static senhasIguais(): ValidatorFn {
    return (formGroup: AbstractControl): ValidationErrors | null => {
      const senha = formGroup.get('senha')?.value;
      const repetirSenha = formGroup.get('repetirSenha')?.value;

      if (!senha || !repetirSenha) {
        return null;
      }

      return senha === repetirSenha ? null : { senhasDiferentes: true };
    };
  }

  static senhaMinima(): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
      const value = control.value;

      if (!value) {
        return null;
      }

      return value.length >= FORM_VALIDATION.MIN_PASSWORD_LENGTH
        ? null
        : { senhaMinima: { requiredLength: FORM_VALIDATION.MIN_PASSWORD_LENGTH, actualLength: value.length } };
    };
  }

  static emailValido(): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
      const value = control.value;

      if (!value) {
        return null;
      }

      return FORM_VALIDATION.EMAIL_PATTERN.test(value) ? null : { emailInvalido: true };
    };
  }

  static modulosObrigatorios(): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
      const modulos = control.value;

      if (!Array.isArray(modulos) || modulos.length === 0) {
        return { modulosObrigatorios: true };
      }

      return null;
    };
  }
}
