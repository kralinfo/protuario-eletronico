import { Injectable } from '@angular/core';
import { HttpRequest, HttpHandler, HttpEvent, HttpInterceptor, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { AuthService } from './auth.service';
import { Router } from '@angular/router';
import { MatDialog } from '@angular/material/dialog';
import { FeedbackDialogComponent } from '../shared/feedback-dialog.component';

@Injectable()
export class AuthInterceptor implements HttpInterceptor {
  constructor(
    private authService: AuthService,
    private router: Router,
    private dialog: MatDialog
  ) {}

  intercept(request: HttpRequest<unknown>, next: HttpHandler): Observable<HttpEvent<unknown>> {
    const token = this.authService.getToken();
    // Adicionar token apenas se existir e a requisição for para a API (não para login)
    if (token && !request.url.includes('/api/login')) {
      request = request.clone({
        setHeaders: {
          Authorization: `Bearer ${token}`
        }
      });
    }
    return next.handle(request).pipe(
      catchError((error: HttpErrorResponse) => {
        if ((error.status === 401 || error.status === 403)) {
          // Verifica se é erro de recuperação de senha (token expirado ou já utilizado)
          const isResetTokenError = request.url.includes('/validate-reset-token') || request.url.includes('/reset-password');
          const msg = error.error?.message || error.error?.error || '';
          if (isResetTokenError && (msg.includes('expirado') || msg.includes('utilizado'))) {
            // Não exibe dialog de sessão expirada, deixa o fluxo do componente tratar
            return throwError(() => error);
          }
          // Caso contrário, exibe dialog de sessão expirada
          const dialogRef = this.dialog.open(FeedbackDialogComponent, {
            data: {
              title: 'Sessão expirada',
              message: 'Sua sessão expirou. Faça login novamente.',
              type: 'error'
            },
            disableClose: true
          });
          setTimeout(() => {
            dialogRef.close();
            this.router.navigate(['/login']);
          }, 2000);
        }
        return throwError(() => error);
      })
    );
  }
}
