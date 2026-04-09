import { Component, OnInit, OnDestroy } from '@angular/core';
import { Subject } from 'rxjs';
import { debounceTime } from 'rxjs/operators';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../auth.service';
import { HttpClient } from '@angular/common/http';
import { environment } from 'src/environments/environment';
import { MatDialog } from '@angular/material/dialog';
import { FeedbackDialogComponent } from '../../shared/feedback-dialog/feedback-dialog.component';

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
    private http: HttpClient,
    private dialog: MatDialog
  ) {
    this.loginForm = this.fb.group({
      user_email: ['', [Validators.required, Validators.email]],
      user_senha: ['', [Validators.required, Validators.minLength(6)]],
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

    // Garante que o form seja revalidado ao selecionar módulo
    this.loginForm.get('modulo')?.valueChanges.subscribe(() => {
      this.loginForm.updateValueAndValidity();
    });

    // Habilita/desabilita o campo módulo conforme senha válida
    this.loginForm.get('user_senha')?.valueChanges.subscribe(() => {
      const senhaValida = this.loginForm.get('user_senha')?.valid;
      const moduloControl = this.loginForm.get('modulo');
      if (senhaValida) {
        if (this.availableModules.length === 1) {
          moduloControl?.setValue(this.availableModules[0]);
          moduloControl?.enable();
        } else if (this.availableModules.length > 1) {
          moduloControl?.setValue('');
          moduloControl?.enable();
        } else {
          moduloControl?.setValue('');
          moduloControl?.disable();
        }
      } else {
        moduloControl?.setValue('');
        moduloControl?.disable();
      }
    });
  }


  ngOnDestroy(): void {
    if (this.emailInputSub) {
      this.emailInputSub.unsubscribe();
    }
  }


  onEmailBlur(): void {
    const email = this.loginForm.get('user_email')?.value;
    this.emailInput$.next(email);
  }

  private fetchModules(email: string): void {
  if (!email || this.loginForm.get('user_email')?.invalid) {
    this.availableModules = [];
    this.selectedModule = '';
    this.modulesLoaded = false;
    this.loginForm.get('modulo')?.setValue('');
    this.loginForm.get('modulo')?.disable();
    return;
  }

  this.loading = true;
  this.errorMessage = ''; // limpa mensagens anteriores

  this.http.get<{modulos: string[]}>(`${environment.apiUrl}/public/user-modules?email=${encodeURIComponent(email)}`)
    .subscribe({
      next: (resp) => {
        this.availableModules = resp.modulos || [];
        this.modulesLoaded = true;

        if (this.availableModules.length === 0) {
          // força mensagem quando não há módulos (email não cadastrado)
          this.errorMessage = 'E-mail não encontrado na base de dados.';
        }

        const senhaValida = this.loginForm.get('user_senha')?.valid;
        const moduloControl = this.loginForm.get('modulo');
        if (senhaValida) {
          if (this.availableModules.length === 1) {
            moduloControl?.setValue(this.availableModules[0]);
            moduloControl?.enable();
          } else if (this.availableModules.length > 1) {
            moduloControl?.setValue('');
            moduloControl?.enable();
          } else {
            moduloControl?.setValue('');
            moduloControl?.disable();
          }
        } else {
          moduloControl?.setValue('');
          moduloControl?.disable();
        }

        this.selectedModule = '';
        this.loading = false;
      },
      error: (error) => {
        this.availableModules = [];
        this.selectedModule = '';
        this.modulesLoaded = false;
        this.loginForm.get('modulo')?.setValue('');
        this.loginForm.get('modulo')?.disable();
        this.loading = false;

        if (error.status === 404 && error.error?.code === 'EMAIL_NOT_FOUND') {
          this.errorMessage = 'E-mail não encontrado na base de dados.';
        } else {
          this.errorMessage = 'Erro ao buscar módulos. Tente novamente.';
        }
      }
    });
}



  ngOnInit(): void {
    // Se já estiver autenticado, redirecionar
    if (this.authService.isAuthenticated()) {
      this.router.navigate(['/']);
    }
    // Exibe mensagem de erro vinda da redefinição de senha (link expirado)
    this.router.routerState.root.queryParams.subscribe(params => {
      if (params['error']) {
        this.errorMessage = params['error'];
        // Remove o parâmetro da URL para evitar reexibição
        this.router.navigate([], { queryParams: { error: null }, queryParamsHandling: 'merge' });
      }
    });
    // Garante seleção automática do módulo se só houver uma opção ao iniciar
    setTimeout(() => {
      const senhaValida = this.loginForm.get('user_senha')?.valid;
      if (senhaValida) {
        if (this.availableModules && this.availableModules.length === 1) {
          this.loginForm.get('modulo')?.setValue(this.availableModules[0]);
          this.loginForm.get('modulo')?.disable();
        } else if (this.availableModules && this.availableModules.length > 1) {
          this.loginForm.get('modulo')?.enable();
          this.loginForm.get('modulo')?.setValue('');
        } else {
          this.loginForm.get('modulo')?.setValue('');
          this.loginForm.get('modulo')?.disable();
        }
      } else {
        this.loginForm.get('modulo')?.setValue('');
        this.loginForm.get('modulo')?.disable();
      }
    }, 0);
  }

  // Habilita módulo só após blur do campo senha
  onSenhaBlur(): void {
    const senhaValida = this.loginForm.get('user_senha')?.valid;
    const moduloControl = this.loginForm.get('modulo');
    if (senhaValida) {
      if (this.availableModules.length === 1) {
        moduloControl?.setValue(this.availableModules[0]);
        moduloControl?.enable();
      } else if (this.availableModules.length > 1) {
        moduloControl?.setValue('');
        moduloControl?.enable();
      } else {
        moduloControl?.setValue('');
        moduloControl?.disable();
      }
    } else {
      moduloControl?.setValue('');
      moduloControl?.disable();
    }
  }


  // Removido: toda habilitação do campo módulo é feita via valueChanges da senha (handleSenhaChange)


  onSubmit(): void {
    if (this.loginForm.invalid) {
      this.loginForm.markAllAsTouched();
      return;
    }

    const email = this.loginForm.value.user_email;
    const senha = this.loginForm.value.user_senha;
  const moduloSelecionado = this.loginForm.get('modulo')?.value;
  console.log('DEBUG moduloSelecionado:', moduloSelecionado);

    // O botão de entrar só será habilitado se o campo módulo estiver preenchido (form válido)
    this.loading = true;
    this.errorMessage = '';
    const permanente = moduloSelecionado === 'fila';
    this.authService.login({ email, senha, permanente }).subscribe({
      next: (response) => {
        this.loading = false;
        this.authService.setSelectedModule(moduloSelecionado);
        // Redireciona para o módulo selecionado
        if (moduloSelecionado === 'ambulatorio') {
          this.router.navigate(['/ambulatorio']);
        } else if (moduloSelecionado === 'recepcao') {
          this.router.navigate(['/']);
        } else if (moduloSelecionado && moduloSelecionado.toLowerCase().includes('admin')) {
          this.router.navigate(['/administracao']);
        } else if (moduloSelecionado) {
          this.router.navigate(['/' + moduloSelecionado]);
        } else {
          this.router.navigate(['/']);
        }
      },
      error: (error) => {
        this.loading = false;
        if (error.status === 409 && error.error && error.error.code === 'SESSION_EXISTS') {
          // Exibe modal informativo de sessão já aberta
          this.dialog.open(FeedbackDialogComponent, {
            width: '350px',
            disableClose: true,
            data: {
              title: 'Sessão já aberta',
              message: 'Já existe uma sessão ativa para este usuário em outro navegador ou dispositivo.',
              type: 'error'
            }
          });
        } else if (error.status === 401) {
          this.errorMessage = 'Senha incorreta ou email inválido.';
        } else if (error.status === 500) {
          this.errorMessage = 'Erro interno do servidor. Tente novamente.';
        } else {
          this.errorMessage = 'Erro de conexão. Verifique sua internet.';
        }
      }
    });
  }

  // Método legado removido: selectModuleAndProceed

  getEmailErrorMessage(): string {
    const emailControl = this.loginForm.get('user_email');
    if (emailControl?.hasError('required')) {
      return 'Email é obrigatório';
    }
    if (emailControl?.hasError('email')) {
      return 'Email inválido';
    }
    return '';
  }

  getSenhaErrorMessage(): string {
    const senhaControl = this.loginForm.get('user_senha');
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
