import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable } from 'rxjs';
import { map, tap } from 'rxjs/operators';
import { Router } from '@angular/router';
import { environment } from '../../environments/environment';

export interface LoginCredentials {
  email: string;
  senha: string;
}

export interface LoginResponse {
  token: string;
  usuario: {
    id: number;
    email: string;
    nome?: string;
    nivel: 'admin' | 'editor' | 'visualizador';
    modulos: string[];
  };
}

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private baseUrl = environment.apiUrl;
  private tokenKey = 'auth_token';
  private userSubject = new BehaviorSubject<any>(null);
  public user$ = this.userSubject.asObservable();
  private selectedModule: string | null = null;

  /**
   * Retorna o usuário logado (objeto completo)
   */
  get user() {
    return this.userSubject.value;
  }

  /**
   * Retorna true se o usuário for admin
   */
  get isAdmin() {
    return this.user && this.user.nivel === 'admin';
  }

  /**
   * Retorna true se o usuário for editor
   */
  get isEditor() {
    return this.user && (this.user.nivel === 'admin' || this.user.nivel === 'editor');
  }

  constructor(private http: HttpClient, private router: Router) {
    this.loadStoredUser();
    // Sempre recupera o módulo selecionado do localStorage ao inicializar
    this.selectedModule = localStorage.getItem('selected_module');
    // Se não houver, mas o usuário só tem um módulo, já define automaticamente
    const userStr = localStorage.getItem('auth_user');
    if (!this.selectedModule && userStr) {
      try {
        const user = JSON.parse(userStr);
        if (user && user.modulos && user.modulos.length === 1) {
          this.setSelectedModule(user.modulos[0]);
        }
      } catch {}
    }
  }

  login(credentials: LoginCredentials): Observable<LoginResponse> {
    return this.http.post<LoginResponse>(`${environment.apiUrl}/login`, credentials)
      .pipe(
        tap(response => {
          localStorage.setItem(this.tokenKey, response.token);
          localStorage.setItem('auth_user', JSON.stringify(response.usuario));
          this.userSubject.next(response.usuario);
          // Limpa módulo selecionado ao novo login
          localStorage.removeItem('selected_module');
          this.selectedModule = null;
          // LOG para depuração
          console.log('[AuthService] Token salvo:', response.token);
          console.log('[AuthService] Usuário salvo:', response.usuario);
        })
      );
  }

  setSelectedModule(module: string) {
    this.selectedModule = module;
    if (module) {
      localStorage.setItem('selected_module', module);
      console.log('[AuthService] Módulo selecionado salvo:', module);
    } else {
      localStorage.removeItem('selected_module');
      console.log('[AuthService] Módulo selecionado removido');
    }
  }

  getSelectedModule(): string | null {
    // Sempre tenta recuperar do localStorage para garantir persistência
    if (!this.selectedModule) {
      this.selectedModule = localStorage.getItem('selected_module');
    }
    return this.selectedModule;
  }

  logout(): void {
    localStorage.removeItem(this.tokenKey);
    localStorage.removeItem('auth_user');
    localStorage.removeItem('selected_module');
    this.selectedModule = null;
    this.userSubject.next(null);
    this.router.navigate(['/login']);
  }

  getToken(): string | null {
    return localStorage.getItem(this.tokenKey);
  }

  isAuthenticated(): boolean {
    const token = this.getToken();
    if (!token) return false;

    // Verificar se o token é um JWT válido e não expirou
    try {
      const parts = token.split('.');
      if (parts.length !== 3) return false;
      const payload = JSON.parse(atob(parts[1]));
      if (!payload || typeof payload !== 'object') return false;
      if (!payload.exp) return false;
      // exp é em segundos desde epoch
      const now = Math.floor(Date.now() / 1000);
      return payload.exp > now;
    } catch (e) {
      return false;
    }
  }

  private loadStoredUser(): void {
    const token = this.getToken();
    const userStr = localStorage.getItem('auth_user');
    if (token && this.isAuthenticated() && userStr) {
      try {
        const user = JSON.parse(userStr);
        this.userSubject.next(user);
      } catch {
        this.logout();
      }
    }
  }

  forgotPassword(email: string): Observable<any> {
    return this.http.post(`${environment.apiUrl}/forgot-password`, { email });
  }
}
