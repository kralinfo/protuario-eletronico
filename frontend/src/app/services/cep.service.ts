import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class CepService {

  constructor(private http: HttpClient) { }

  buscarCep(cep: string): Observable<any> {
    const cepLimpo = cep.replace(/\D/g, '');
    return this.http.get(`https://viacep.com.br/ws/${cepLimpo}/json/`)

  }
}
