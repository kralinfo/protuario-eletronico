import { Component } from '@angular/core';

@Component({
  selector: 'sessao-expirada-dialog',
  template: `<div style="text-align:center;padding:24px">
    <h2>Sessão expirada</h2>
    <p>Por segurança, sua sessão foi encerrada.<br>Você será redirecionado para o login.</p>
  </div>`
})
export class SessaoExpiradaDialog {}
