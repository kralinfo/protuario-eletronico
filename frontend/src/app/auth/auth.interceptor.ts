import { Injectable } from '@angular/core';
import { HttpRequest, HttpHandler, HttpEvent, HttpInterceptor, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { AuthService } from './auth.service';
import { Router } from '@angular/router';
import { MatDialog } from '@angular/material/dialog';
import { FeedbackDialogComponent } from '../shared/feedback-dialog/feedback-dialog.component';

@Injectable()
export class AuthInterceptor implements HttpInterceptor {
  constructor(
    private authService: AuthService,
    private router: Router,
    private dialog: MatDialog
  ) {}

  private isResetPasswordPage(): boolean {
    const path = window.location.pathname;
    return path.includes('redefinir-senha') || path.includes('reset-password');
  }

  intercept(request: HttpRequest<unknown>, next: HttpHandler): Observable<HttpEvent<unknown>> {
    const token = this.authService.getToken();

    // Não adicionar token para rotas de autenticação e reset de senha
    const shouldAddToken = token &&
                          !request.url.includes('/login') &&
                          !request.url.includes('/validate-reset-token') &&
                          !request.url.includes('/reset-password') &&
                          !request.url.includes('/forgot-password');

    if (shouldAddToken) {
      request = request.clone({
        setHeaders: {
          Authorization: `Bearer ${token}`
        }
      });
    }

    return next.handle(request).pipe(
      catchError((error: HttpErrorResponse) => {
        // Se estivermos na página de redefinição, nunca exibe modal
        if (this.isResetPasswordPage()) {
          return throwError(() => error);
        }

        const isLoginPage = window.location.pathname.includes('login');
        if ((error.status === 401 || error.status === 403) && !isLoginPage) {
          // Limpa sessão imediatamente para bloquear qualquer navegação posterior
          this.authService.clearSession();

          this.dialog.open(FeedbackDialogComponent, {
            data: {
              title: 'Sessão expirada',
              message: 'Sua sessão expirou. Faça login novamente.',
              type: 'error'
            },
            disableClose: true
          });

          // Redireciona imediatamente, sem esperar o modal
          this.router.navigate(['/login']);
        }

        return throwError(() => error);
      })
    );
  }
}
