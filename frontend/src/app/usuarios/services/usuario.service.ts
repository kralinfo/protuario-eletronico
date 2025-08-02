import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Usuario, UsuarioFormData } from '../models/usuario.interface';
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class UsuarioService {
  private readonly apiUrl = `${environment.apiUrl}/usuarios`;

  constructor(private readonly http: HttpClient) {}

  listarUsuarios(): Observable<Usuario[]> {
    return this.http.get<Usuario[]>(this.apiUrl);
  }

  criarUsuario(usuario: UsuarioFormData): Observable<Usuario> {
    return this.http.post<Usuario>(this.apiUrl, usuario);
  }

  atualizarUsuario(id: number, usuario: Partial<UsuarioFormData>): Observable<Usuario> {
    return this.http.put<Usuario>(`${this.apiUrl}/${id}`, usuario);
  }

  excluirUsuario(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }

  verificarEmailEmUso(email: string): Observable<Usuario[]> {
    return this.http.get<Usuario[]>(`${this.apiUrl}?email=${encodeURIComponent(email)}`);
  }

  recuperarSenha(email: string): Observable<void> {
    return this.http.post<void>(`${environment.apiUrl}/forgot-password`, { email });
  }
}
