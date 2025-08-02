
import {
  Component,
  OnInit,
  OnDestroy,
  Output,
  EventEmitter,
  Input,
} from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { FeedbackDialogComponent } from '../shared/feedback-dialog.component';
import { ConfirmDialogComponent } from '../shared/confirm-dialog.component';
import { Paciente } from './pacientes.component';
import { HttpClient } from '@angular/common/http';
import {
  AbstractControl,
  FormBuilder,
  FormGroup,
  ValidationErrors,
  Validators,
} from '@angular/forms';
import { Observable, of, Subject } from 'rxjs';
import {
  debounceTime,
  distinctUntilChanged,
  switchMap,
  takeUntil,
} from 'rxjs/operators';
import { environment } from '../../environments/environment';
import { AuthService } from '../auth/auth.service';
import * as jsPDF from 'jspdf';
import { formatTelefoneValue } from '../utils/telefone-util';
import { formatCepValue } from '../utils/cep-util';
import { CepService } from '../services/cep.service';
import { dataMaxHojeValidator } from '../shared/validators/data-max-hoje.validator';

@Component({
  selector: 'app-pacientes-form',
  templateUrl: './pacientes-form.component.html',
  styleUrls: ['./pacientes.component.scss'],
  standalone: false,
})
export class PacientesFormComponent
  implements OnInit, OnDestroy {
    idade: number | null = null;
  // ...existing code...
  @Output() fechar = new EventEmitter<any>();
  @Input() pacienteEditando: Paciente | null = null;
  form: FormGroup;
  loading = false;
  verificandoDuplicidade = false;
  apiUrl = environment.apiUrl + '/pacientes'; // já está correto
  private destroy$ = new Subject<void>();
  private validationSubject = new Subject<{ nome: string; mae: string }>();
  currentUser: any = null;

  // Flag para controle do erro de ano inválido
  invalidYearLength = false;

  // Para acessar o input de nascimento no DOM


  maxDate: string = '';

  // Lista de estados brasileiros
  estadosBrasileiros = [
    { sigla: 'AC', nome: 'Acre' },
    { sigla: 'AL', nome: 'Alagoas' },
    { sigla: 'AP', nome: 'Amapá' },
    { sigla: 'AM', nome: 'Amazonas' },
    { sigla: 'BA', nome: 'Bahia' },
    { sigla: 'CE', nome: 'Ceará' },
    { sigla: 'DF', nome: 'Distrito Federal' },
    { sigla: 'ES', nome: 'Espírito Santo' },
    { sigla: 'GO', nome: 'Goiás' },
    { sigla: 'MA', nome: 'Maranhão' },
    { sigla: 'MT', nome: 'Mato Grosso' },
    { sigla: 'MS', nome: 'Mato Grosso do Sul' },
    { sigla: 'MG', nome: 'Minas Gerais' },
    { sigla: 'PA', nome: 'Pará' },
    { sigla: 'PB', nome: 'Paraíba' },
    { sigla: 'PR', nome: 'Paraná' },
    { sigla: 'PE', nome: 'Pernambuco' },
    { sigla: 'PI', nome: 'Piauí' },
    { sigla: 'RJ', nome: 'Rio de Janeiro' },
    { sigla: 'RN', nome: 'Rio Grande do Norte' },
    { sigla: 'RS', nome: 'Rio Grande do Sul' },
    { sigla: 'RO', nome: 'Rondônia' },
    { sigla: 'RR', nome: 'Roraima' },
    { sigla: 'SC', nome: 'Santa Catarina' },
    { sigla: 'SP', nome: 'São Paulo' },
    { sigla: 'SE', nome: 'Sergipe' },
    { sigla: 'TO', nome: 'Tocantins' },
  ];

  pacienteService: any;
  erroCepUf = false;
  bloqueioAnoInvalido: any;

  constructor(
    private http: HttpClient,
    private fb: FormBuilder,
    private authService: AuthService,
    private dialog: MatDialog,
    private cepService: CepService
  ) {
    this.form = this.fb.group({
      nome: ['', [Validators.required]],
      mae: ['', [Validators.required]],
      nascimento: [
        '',
        [Validators.required, dataMaxHojeValidator],
      ],
      sexo: ['', [Validators.required]],
      estadoCivil: [''],
      profissao: [''],
      escolaridade: [''],
      telefone: [''], // Adicionado
      sus: [''],      // Adicionado
      raca: [''],
      endereco: ['', [Validators.required]],
      bairro: ['', [Validators.required]],
      municipio: ['', [Validators.required]],
      uf: ['', [Validators.required]],
      cep: ['', [Validators.required, Validators.pattern(/^[0-9]{5}-?[0-9]{3}$/)]]
    });

    // Patch será feito no ngOnInit para garantir que o input já foi recebido
  }

  ngOnInit() {
    // Atualiza idade ao alterar nascimento
    this.form.get('nascimento')?.valueChanges.subscribe((valor: string) => {
      if (valor) {
        const hoje = new Date();
        const nasc = new Date(valor);
        let idade = hoje.getFullYear() - nasc.getFullYear();
        const m = hoje.getMonth() - nasc.getMonth();
        if (m < 0 || (m === 0 && hoje.getDate() < nasc.getDate())) {
          idade--;
        }
        this.idade = idade >= 0 ? idade : null;
      } else {
        this.idade = null;
      }
    });
    // Depuração: loga o objeto do formulário a cada alteração
    this.form.valueChanges.subscribe(() => {
      console.log('Form value:', this.form.value);
      console.log('Form errors:', this.form.errors);
      console.log('Form status:', this.form.status);
      // Log detalhado dos erros de cada campo
      Object.keys(this.form.controls).forEach(campo => {
        const control = this.form.get(campo);
        if (control && control.invalid) {
          console.log(`Campo '${campo}' inválido:`, control.errors);
        }
      });
    });
    // Carregar informações do usuário atual
    this.authService.user$.subscribe((user) => {
      this.currentUser = user;
    });

    const yaer = new Date().getFullYear();
    this.maxDate = `${yaer}-12-31`

    // Verifica se o CEP é válido de acordo com o UF informado
    this.form
      .get('cep')
      ?.valueChanges.pipe(debounceTime(300), distinctUntilChanged())
      .subscribe((valor: string) => {
        this.erroCepUf = false;

        const cepFormatado = formatCepValue(valor || '');
        this.form.get('cep')?.setValue(cepFormatado, { emitEvent: false });

        const cepLimpo = cepFormatado.replace(/\D/g, '');
        if (cepLimpo.length === 8) {
          this.cepService.buscarCep(cepLimpo).subscribe((dados) => {
            if (dados?.erro) {
              this.form.patchValue({ municipio: '', uf: '' });
              this.erroCepUf = true;
              return;
            }

            this.form.patchValue({
              municipio: dados.localidade,
              uf: dados.uf,
            });
            // Marcar campos como touched e dirty para validação
            const municipioControl = this.form.get('municipio');
            const ufControl = this.form.get('uf');
            if (dados.localidade) {
              municipioControl?.markAsTouched();
              municipioControl?.markAsDirty();
            }
            if (dados.uf) {
              ufControl?.markAsTouched();
              ufControl?.markAsDirty();
            }
            this.erroCepUf = false;
          });
        } else {
          this.form.patchValue({ municipio: '', uf: '' });
        }
      });

    // 👉 Blindagem extra: se municipio virar objeto, converte pra string automaticamente
    this.form.get('municipio')?.valueChanges.subscribe((valor) => {
      if (typeof valor === 'object' && valor !== null) {
        this.form
          .get('municipio')
          ?.setValue(valor?.nome || '', { emitEvent: false });
      }
    });

    // Patch do pacienteEditando se existir
    if (this.pacienteEditando) {
      const patch = { ...this.pacienteEditando };

      // ✅ Sanitiza campo municipio
      if (typeof patch.municipio === 'object' && patch.municipio !== null) {
        patch.municipio = patch.municipio || '';
      } else if (typeof patch.municipio !== 'string') {
        patch.municipio = '';
      }

      // ✅ Sanitiza campo uf
      const uf = patch.uf as { sigla?: string; nome?: string } | string;
      if (typeof uf === 'object' && uf !== null) {
        patch.uf = uf.sigla ? `${uf.sigla} - ${uf.nome || ''}` : '';
      } else if (typeof uf !== 'string') {
        patch.uf = '';
      }

      // ✅ Formata data de nascimento corretamente
      if (patch.nascimento) {
        const date = new Date(patch.nascimento);
        const yyyy = date.getFullYear();
        const mm = String(date.getMonth() + 1).padStart(2, '0');
        const dd = String(date.getDate()).padStart(2, '0');
        patch.nascimento = `${yyyy}-${mm}-${dd}`;
      }

      // Garante que estadoCivil seja uma opção válida
      // Mapeia valores sem (a) para a opção correta e trata objeto
      const mapEstadoCivil: Record<string, string> = {
        'Solteiro': 'Solteiro(a)',
        'Solteira': 'Solteiro(a)',
        'Casado': 'Casado(a)',
        'Casada': 'Casado(a)',
        'Viúvo': 'Viúvo(a)',
        'Viúva': 'Viúvo(a)',
        'Divorciado': 'Divorciado(a)',
        'Divorciada': 'Divorciado(a)',
        'Ignorado': 'Ignorado',
        'Solteiro(a)': 'Solteiro(a)',
        'Casado(a)': 'Casado(a)',
        'Viúvo(a)': 'Viúvo(a)',
        'Divorciado(a)': 'Divorciado(a)',
        '': '',
      };
      let estadoCivil = patch.estadoCivil;
      if (typeof estadoCivil === 'object' && estadoCivil !== null) {
        estadoCivil = (estadoCivil as any).nome || '';
      }
      patch.estadoCivil = mapEstadoCivil[String(estadoCivil || '')] ?? '';
      this.form.patchValue(patch);
      // Marcar obrigatórios como touched
      ['nome', 'mae', 'nascimento', 'sexo', 'endereco', 'bairro', 'municipio', 'uf', 'cep'].forEach(campo => {
        this.form.get(campo)?.markAsTouched();
      });
    }

    // Configura o Subject para validação com debounce
    this.validationSubject
      .pipe(
        debounceTime(500),
        switchMap(({ nome, mae }) => {
          this.verificandoDuplicidade = true;
          const params = `?nome=${encodeURIComponent(
            nome.trim()
          )}&mae=${encodeURIComponent(mae.trim())}`;
          return this.http.get<Paciente[]>(`${this.apiUrl}${params}`);
        }),
        takeUntil(this.destroy$)
      )
      .subscribe({
        next: (pacientes) => {
          this.verificandoDuplicidade = false;
          const nomeControl = this.form.get('nome');
          if (nomeControl) {
            // Só acusa duplicidade se existir paciente com mesmo nome E mesma mãe
            const nome = this.form.get('nome')?.value?.trim().toLowerCase();
            const mae = this.form.get('mae')?.value?.trim().toLowerCase();
            const duplicado = pacientes.find(
              (p) =>
                p.nome?.trim().toLowerCase() === nome &&
                p.mae?.trim().toLowerCase() === mae &&
                (!this.pacienteEditando || p.id !== this.pacienteEditando.id)
            );

            if (duplicado) {
              nomeControl.setErrors({
                ...nomeControl.errors,
                duplicado: {
                  message: `Paciente já cadastrado: ${duplicado.nome}`,
                  paciente: duplicado,
                },
              });
            } else {
              const errors = nomeControl.errors;
              if (errors && errors['duplicado']) {
                delete errors['duplicado'];
                nomeControl.setErrors(
                  Object.keys(errors).length > 0 ? errors : null
                );
              }
            }
          }
        },
        error: () => {
          this.verificandoDuplicidade = false;
        },
      });

    // Quando os campos "nome" ou "mae" mudarem, emitir no Subject
    this.form
      .get('nome')
      ?.valueChanges.pipe(takeUntil(this.destroy$))
      .subscribe(() => {
        this.checkDuplicidade();
      });

    this.form
      .get('mae')
      ?.valueChanges.pipe(takeUntil(this.destroy$))
      .subscribe(() => {
        this.checkDuplicidade();
      });
  }

    formatTelefone(event: Event) {
    const input = event.target as HTMLInputElement;
    const value = formatTelefoneValue(input.value);
    input.value = value;
    const telefoneControl = this.form?.get('telefone');
    if (telefoneControl) {
      telefoneControl.setValue(value, { emitEvent: false });
    }
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private checkDuplicidade() {
    const nome = this.form.get('nome')?.value;
    const mae = this.form.get('mae')?.value;

    if (nome && mae && nome.trim() !== '' && mae.trim() !== '') {
      // Limpar erro anterior antes de verificar
      const nomeControl = this.form.get('nome');
      if (nomeControl?.errors?.['duplicado']) {
        const errors = { ...nomeControl.errors };
        delete errors['duplicado'];
        nomeControl.setErrors(Object.keys(errors).length > 0 ? errors : null);
      }

      this.validationSubject.next({ nome: nome.trim(), mae: mae.trim() });
    } else {
      this.verificandoDuplicidade = false;
    }
  }

  salvar() {
    // Depuração: exibe o estado do form no console
    console.log('Form value:', this.form.value);
    console.log('Form errors:', this.form.errors);
    console.log('Form status:', this.form.status);

    if (!this.authService.isAuthenticated()) {
      this.authService.logout();
      alert('Sua sessão expirou. Faça login novamente.');
      return;
    }

    if (this.form.invalid || this.form.pending || this.verificandoDuplicidade) {
      if (this.verificandoDuplicidade) {
        alert('Aguarde a verificação de duplicidade.');
        return;
      }
      this.form.markAllAsTouched();
      return;
    }

    const paciente = this.form.value;
    this.loading = true;

    if (this.pacienteEditando?.id) {
      const dialogRef = this.dialog.open(ConfirmDialogComponent, {
        data: {
          title: 'Confirmação',
          message: 'Tem certeza que deseja atualizar este registro?',
        },
      });
      dialogRef.afterClosed().subscribe((confirmado: boolean) => {
        if (confirmado) {
          this.http
            .put(`${this.apiUrl}/${this.pacienteEditando!.id}`, paciente)
            .subscribe({
              next: () => {
                this.loading = false;
                // Feedback verdinho
                const feedback = this.dialog.open(FeedbackDialogComponent, {
                  data: {
                    title: 'Sucesso',
                    message: 'Paciente atualizado com sucesso!',
                    type: 'success',
                  },
                  panelClass: 'success',
                });
                setTimeout(() => feedback.close(), 2500);
                this.fechar.emit();
              },
              error: (err) => {
                this.loading = false;
                // Feedback vermelhinho
                const feedback = this.dialog.open(FeedbackDialogComponent, {
                  data: {
                    title: 'Erro',
                    message: err?.error?.error || 'Erro ao atualizar paciente.',
                    type: 'error',
                  },
                  panelClass: 'error',
                });
                setTimeout(() => feedback.close(), 2500);
                if (
                  err?.error?.code === 'NO_TOKEN' ||
                  err?.error?.code === 'INVALID_TOKEN' ||
                  err?.status === 401 ||
                  err?.status === 403
                ) {
                  this.authService.logout();
                  alert('Sua sessão expirou. Faça login novamente.');
                }
              },
            });
        } else {
          this.loading = false;
        }
      });
    } else {
      this.http.post(this.apiUrl, paciente).subscribe({
        next: (res: any) => {
          this.loading = false;
          const dialogRef = this.dialog.open(FeedbackDialogComponent, {
            data: {
              title: 'Sucesso',
              message: 'Paciente cadastrado com sucesso!',
              type: 'success',
            },
            panelClass: 'success',
          });
          setTimeout(() => dialogRef.close(), 3000);
          // Fecha o modal após cadastrar e envia o paciente cadastrado
          this.fechar.emit(res?.data ? res.data : paciente);
        },
        error: (err) => {
          this.loading = false;
          if (
            err?.error?.code === 'NO_TOKEN' ||
            err?.error?.code === 'INVALID_TOKEN' ||
            err?.status === 401 ||
            err?.status === 403
          ) {
            this.authService.logout();
            alert('Sua sessão expirou. Faça login novamente.');
          } else {
            const dialogRef = this.dialog.open(FeedbackDialogComponent, {
              data: {
                title: 'Erro',
                message: err?.error?.error || 'Erro ao cadastrar paciente.',
                type: 'error',
              },
              panelClass: 'error',
            });
            setTimeout(() => dialogRef.close(), 3000);
          }
        },
      });
    }
  }

  // Método para gerar PDF do cadastro do paciente
  imprimirPacientePDF() {
    if (this.form.invalid) {
      alert('Por favor, preencha todos os campos obrigatórios antes de imprimir.');
      return;
    }

    const paciente = this.form.value;
    // Cria uma janela temporária para impressão
    const printWindow = window.open('', '', 'width=800,height=600');
    if (!printWindow) return;
    printWindow.document.write(`
      <html>
        <head>
          <title>Ficha de Cadastro do Paciente</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 40px; }
            h2 { color: #2563eb; }
            .section { margin-bottom: 24px; }
            .label { font-weight: bold; }
          </style>
        </head>
        <body>
          <h2>e-Prontuário Aliança-PE</h2>
          <h3>Ficha de Cadastro do Paciente</h3>
          <hr />
          <div class="section">
            <span class="label">Nome:</span> ${paciente.nome || ''}<br />
            <span class="label">Nome da Mãe:</span> ${paciente.mae || ''}<br />
            <span class="label">Data de Nascimento:</span> ${paciente.nascimento ? new Date(paciente.nascimento).toLocaleDateString('pt-BR') : ''}<br />
            <span class="label">Idade:</span> ${this.idade !== null ? this.idade + ' anos' : ''}<br />
            <span class="label">Sexo:</span> ${this.formatarSexo(paciente.sexo) || ''}<br />
            <span class="label">Telefone:</span> ${paciente.telefone || ''}<br />
            <span class="label">Cartão SUS:</span> ${paciente.sus || ''}<br />
            <span class="label">Estado Civil:</span> ${paciente.estadoCivil || ''}<br />
            <span class="label">Profissão:</span> ${paciente.profissao || ''}<br />
            <span class="label">Escolaridade:</span> ${paciente.escolaridade || ''}<br />
            <span class="label">Raça/Cor:</span> ${paciente.raca || ''}<br />
          </div>
          <div class="section">
            <span class="label">Endereço:</span> ${paciente.endereco || ''}<br />
            <span class="label">Bairro:</span> ${paciente.bairro || ''}<br />
            <span class="label">Município:</span> ${paciente.municipio || ''}<br />
            <span class="label">UF:</span> ${paciente.uf || ''}<br />
            <span class="label">CEP:</span> ${paciente.cep || ''}<br />
          </div>
          <hr />
          <div style="margin-top: 32px; color: #666; font-size: 12px;">
            Gerado em: ${new Date().toLocaleDateString('pt-BR')} às ${new Date().toLocaleTimeString('pt-BR')}<br />
            Sistema e-Prontuário Aliança-PE
          </div>
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
    printWindow.close();
  }

  private formatarSexo(sexo: string): string {
    switch (sexo) {
      case 'M':
        return 'Masculino';
      case 'F':
        return 'Feminino';
      case 'I':
        return 'Ignorado';
      default:
        return sexo;
    }
  }

  cancelar() {
    this.fechar.emit();
  }

  logout() {
    this.authService.logout();
  }
}

/* Mask de número do SUS */
export function validarCNS(control: AbstractControl): ValidationErrors | null {
  // Validação removida para teste: sempre retorna válido
  return null;
}
