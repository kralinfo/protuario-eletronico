import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../environments/environment';

@Component({
  selector: 'app-redefinir-senha',
  templateUrl: './redefinir-senha.component.html',
  styleUrls: ['./redefinir-senha.component.scss'],
  standalone: false
})
export class RedefinirSenhaComponent implements OnInit {
  redefinirForm: FormGroup;
  token: string = '';
  error: string | null = null;
  success: string | null = null;
  loading = false;
  tokenValido = false;

  constructor(
    private fb: FormBuilder,
    private route: ActivatedRoute,
    private http: HttpClient,
    private router: Router
  ) {
    this.redefinirForm = this.fb.group({
      senha: ['', [Validators.required, Validators.minLength(6)]],
      repetirSenha: ['', Validators.required]
    }, { validators: this.senhasIguaisValidator });
  }

  ngOnInit(): void {
    this.route.queryParams.subscribe(params => {
      this.token = params['token'] || '';
      if (this.token) {
        this.validarToken();
      } else {
        this.error = 'Token de redefinição ausente.';
      }
    });
  }

  senhasIguaisValidator(form: FormGroup) {
    const senha = form.get('senha')?.value;
    const repetirSenha = form.get('repetirSenha')?.value;
    return senha && repetirSenha && senha !== repetirSenha ? { senhasDiferentes: true } : null;
  }

  validarToken() {
    this.loading = true;
    this.http.post(`${environment.apiUrl}/validate-reset-token`, { token: this.token }).subscribe({
      next: () => {
        this.tokenValido = true;
        this.loading = false;
      },
      error: err => {
        // Se o erro for de link já utilizado, mostra mensagem de expirado
        if (err.error?.error?.includes('já foi utilizado')) {
          this.error = 'Este link de redefinição de senha já foi utilizado ou expirou.';
        } else {
          this.error = err.error?.message || 'Token inválido ou expirado.';
        }
        this.loading = false;
      }
    });
  }

  onSubmit() {
    if (this.redefinirForm.invalid) {
      if (this.redefinirForm.errors?.['senhasDiferentes']) {
        this.error = 'As senhas não coincidem.';
      }
      return;
    }
    this.loading = true;
    this.http.post(`${environment.apiUrl}/reset-password`, {
      token: this.token,
      senha: this.redefinirForm.value.senha
    }).subscribe({
      next: () => {
        this.success = 'Senha redefinida com sucesso!';
        // Encerra qualquer sessão aberta
        localStorage.removeItem('auth_token');
        localStorage.removeItem('auth_user');
        localStorage.removeItem('selected_module');
        setTimeout(() => {
          this.router.navigate(['/login']);
        }, 2000);
        this.loading = false;
      },
      error: err => {
        this.error = err.error?.message || 'Erro ao redefinir senha.';
        this.loading = false;
      }
    });
  }
}
