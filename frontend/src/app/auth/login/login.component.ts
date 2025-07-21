import { Component, OnInit, OnDestroy } from '@angular/core';
import { Subject } from 'rxjs';
import { debounceTime } from 'rxjs/operators';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../auth.service';
import { HttpClient } from '@angular/common/http';
import { environment } from 'src/environments/environment';

@Component({
    selector: 'app-login',
    templateUrl: './login.component.html',
    styleUrls: ['./login.component.scss'],
    standalone: false
})
export class LoginComponent implements OnInit, OnDestroy {
  loginForm: FormGroup;
  forgotPasswordForm: FormGroup;
  loading = false;
  errorMessage = '';
  hidePassword = true;

  // Forgot password properties
  showForgotPasswordForm = false;
  forgotPasswordLoading = false;
  forgotPasswordError = '';
  forgotPasswordSuccess = false;
  forgotPasswordSuccessMessage = '';

  availableModules: string[] = [];
  selectedModule: string | null = null;
  modulesLoaded = false;

  private emailInput$ = new Subject<string>();
  private emailInputSub?: any;

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private router: Router,
    private http: HttpClient
  ) {
    this.loginForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      senha: ['', [Validators.required, Validators.minLength(6)]],
      modulo: [{ value: '', disabled: true }, Validators.required]
    });

    this.forgotPasswordForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]]
    });

    // Debounce para busca de módulos ao digitar e-mail
    this.emailInputSub = this.emailInput$
      .pipe(debounceTime(400))
      .subscribe(email => {
        this.fetchModules(email);
      });
  }


  ngOnDestroy(): void {
    if (this.emailInputSub) {
      this.emailInputSub.unsubscribe();
    }
  }


  onEmailBlur(): void {
    const email = this.loginForm.get('email')?.value;
    this.emailInput$.next(email);
  }

  private fetchModules(email: string): void {
    if (!email || this.loginForm.get('email')?.invalid) {
      this.availableModules = [];
      this.selectedModule = null;
      this.modulesLoaded = false;
      return;
    }
    this.loading = true;
    this.http.get<{modulos: string[]}>(`${environment.apiUrl}/public/user-modules?email=${encodeURIComponent(email)}`)
      .subscribe({
        next: (resp) => {
          this.availableModules = resp.modulos || [];
          this.modulesLoaded = true;
          if (this.availableModules.length === 1) {
            this.loginForm.get('modulo')?.setValue(this.availableModules[0]);
            this.loginForm.get('modulo')?.disable();
          } else if (this.availableModules.length > 1) {
            this.loginForm.get('modulo')?.setValue('');
            this.loginForm.get('modulo')?.enable();
          } else {
            this.loginForm.get('modulo')?.setValue('');
            this.loginForm.get('modulo')?.disable();
          }
          this.loading = false;
        },
        error: () => {
          this.availableModules = [];
          this.selectedModule = null;
          this.modulesLoaded = false;
          this.loading = false;
        }
      });
  }



  ngOnInit(): void {
    // Se já estiver autenticado, redirecionar
    if (this.authService.isAuthenticated()) {
      this.router.navigate(['/']);
    }
  }


  onSubmit(): void {
    if (this.loginForm.invalid) {
      this.loginForm.markAllAsTouched();
      return;
    }

    // Se módulos ainda não foram carregados, buscar módulos do usuário
    if (!this.modulesLoaded) {
      this.loading = true;
      this.errorMessage = '';
      this.authService.login({
        email: this.loginForm.value.email,
        senha: this.loginForm.value.senha
      }).subscribe({
        next: (response) => {
          this.loading = false;
          const modulos = response.usuario.modulos || [];
          this.availableModules = modulos;
          this.modulesLoaded = true;
          if (modulos.length === 1) {
            this.selectedModule = modulos[0];
          } else {
            this.selectedModule = null;
          }
        },
        error: (error) => {
          this.loading = false;
          if (error.status === 401) {
            this.errorMessage = 'Email ou senha inválidos.';
          } else if (error.status === 500) {
            this.errorMessage = 'Erro interno do servidor. Tente novamente.';
          } else {
            this.errorMessage = 'Erro de conexão. Verifique sua internet.';
          }
        }
      });
      return;
    }

    // Se módulos já carregados, prosseguir com login definitivo
    const moduloSelecionado = this.loginForm.get('modulo')?.value;
    if (!moduloSelecionado) {
      this.errorMessage = 'Selecione o módulo para continuar.';
      return;
    }
    this.authService.setSelectedModule(moduloSelecionado);
    this.router.navigate(['/']);
  }

  // Método legado removido: selectModuleAndProceed

  getEmailErrorMessage(): string {
    const emailControl = this.loginForm.get('email');
    if (emailControl?.hasError('required')) {
      return 'Email é obrigatório';
    }
    if (emailControl?.hasError('email')) {
      return 'Email inválido';
    }
    return '';
  }

  getSenhaErrorMessage(): string {
    const senhaControl = this.loginForm.get('senha');
    if (senhaControl?.hasError('required')) {
      return 'Senha é obrigatória';
    }
    if (senhaControl?.hasError('minlength')) {
      return 'Senha deve ter pelo menos 6 caracteres';
    }
    return '';
  }

  getForgotEmailErrorMessage(): string {
    const emailControl = this.forgotPasswordForm.get('email');
    if (emailControl?.hasError('required')) {
      return 'E-mail é obrigatório';
    }
    if (emailControl?.hasError('email')) {
      return 'Digite um e-mail válido';
    }
    return '';
  }

  toggleForgotPassword(): void {
    this.showForgotPasswordForm = !this.showForgotPasswordForm;
    this.forgotPasswordError = '';
    this.forgotPasswordSuccess = false;
    this.errorMessage = '';

    if (this.showForgotPasswordForm) {
      // Pré-preencher o email se já foi digitado no login
      const loginEmail = this.loginForm.get('email')?.value;
      if (loginEmail && this.loginForm.get('email')?.valid) {
        this.forgotPasswordForm.patchValue({ email: loginEmail });
      }
    }
  }

  onForgotPasswordSubmit(): void {
    if (this.forgotPasswordForm.invalid) {
      this.forgotPasswordForm.markAllAsTouched();
      return;
    }

    this.forgotPasswordLoading = true;
    this.forgotPasswordError = '';
    this.forgotPasswordSuccess = false;

    const email = this.forgotPasswordForm.get('email')?.value;

    this.authService.forgotPassword(email).subscribe({
      next: (response) => {
        this.forgotPasswordLoading = false;
        this.forgotPasswordSuccess = true;
        this.forgotPasswordSuccessMessage = response.message ||
          'As instruções para recuperação de senha foram enviadas para seu e-mail.';

        // Após 5 segundos, voltar para o login
        setTimeout(() => {
          this.toggleForgotPassword();
        }, 5000);
      },
      error: (error) => {
        this.forgotPasswordLoading = false;
        this.forgotPasswordError = error.error?.message ||
          'Erro ao enviar e-mail de recuperação. Tente novamente.';
      }
    });
  }

  showForgotPassword(): void {
    // Método mantido para compatibilidade com testes existentes
    this.toggleForgotPassword();
  }
}
