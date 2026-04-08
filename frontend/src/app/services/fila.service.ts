import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class FilaService {
  private baseUrl = `${environment.apiUrl}/fila`;

  constructor(private http: HttpClient) {}

  chamarPaciente(patientId: number, destino: 'triagem' | 'medico'): Observable<any> {
    return this.http.post(`${this.baseUrl}/chamar`, { patientId, destino });
  }
}
