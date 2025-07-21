import {
  Component,
  OnInit,
  OnDestroy,
  AfterViewInit,
  ViewChild,
  ElementRef,
  Output,
  EventEmitter,
  Input,
} from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { FeedbackDialogComponent } from '../shared/feedback-dialog.component';
import { ConfirmDialogComponent } from '../shared/confirm-dialog.component';
import { Paciente } from './pacientes.component';
import { Router } from '@angular/router';
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
import { CepService } from '../services/cep.service';

@Component({
  selector: 'app-pacientes-form',
  templateUrl: './pacientes-form.component.html',
  styleUrls: ['./pacientes.component.scss'],
  standalone: false,
})
export class PacientesFormComponent
  implements OnInit, OnDestroy, AfterViewInit
{
  // ...existing code...
  @Output() fechar = new EventEmitter<void>();
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
  @ViewChild('nascimentoInput', { static: false })
  nascimentoInput!: ElementRef<HTMLInputElement>;

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

  constructor(
    private router: Router,
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
        [Validators.required, Validators.pattern(/^\d{5}-?\d{3}$/)],
      ],
      sexo: ['', [Validators.required]],
      estadoCivil: [''],
      profissao: [''],
      escolaridade: [''],
      raca: [''],
      endereco: [''],
      bairro: [''],
      municipio: [{ value: '', disable: true }, Validators.required],
      uf: ['', [Validators.required]],
      cep: ['', [Validators.pattern(/^[0-9]{5}-?[0-9]{3}$/)]],
      acompanhante: [''],
      procedencia: [''],
    });

    // Patch será feito no ngOnInit para garantir que o input já foi recebido
  }

  ngOnInit() {
    // Carregar informações do usuário atual
    this.authService.user$.subscribe((user) => {
      this.currentUser = user;
    });

    // Verifica se o CEP é válido de acordo com o UF informado
    this.form.get('cep')?.valueChanges
  .pipe(debounceTime(300), distinctUntilChanged())
  .subscribe((valor: string) => {
    this.erroCepUf = false;

    
    const cepLimpo = valor?.replace(/\D/g, '') || '';

    
    let cepFormatado = cepLimpo;
    if (cepLimpo.length > 5) {
      cepFormatado = `${cepLimpo.substring(0, 5)}-${cepLimpo.substring(5, 8)}`;
    }

    
    this.form.get('cep')?.setValue(cepFormatado, { emitEvent: false });

    
    if (cepLimpo.length === 8) {
      this.cepService.buscarCep(cepLimpo).subscribe((dados) => {
        if (dados?.erro) {
          this.form.patchValue({ municipio: '', uf: '' });
          this.erroCepUf = true;
          return;
        }

        
        const estadoCompleto = this.estadosBrasileiros.find(
          (e) => e.sigla === dados.uf
        );
        const ufFormatado = estadoCompleto
          ? `${estadoCompleto.sigla} - ${estadoCompleto.nome}`
          : dados.uf;

        
        this.form.patchValue({
          municipio: dados.localidade,
          uf: ufFormatado,
        });

        this.erroCepUf = false;
      });
    } else {
      this.form.patchValue({ municipio: '', uf: '' });
    }
  });

    // Patch do pacienteEditando se existir
    if (this.pacienteEditando) {
      const patch = { ...this.pacienteEditando };
      if (patch.nascimento) {
        const date = new Date(patch.nascimento);
        const yyyy = date.getFullYear();
        const mm = String(date.getMonth() + 1).padStart(2, '0');
        const dd = String(date.getDate()).padStart(2, '0');
        patch.nascimento = `${yyyy}-${mm}-${dd}`;
      }
      // Garante que estadoCivil seja uma opção válida
      // Mapeia valores sem (a) para a opção correta
      const mapEstadoCivil = {
        Solteiro: 'Solteiro(a)',
        Casado: 'Casado(a)',
        Viúvo: 'Viúvo(a)',
        Divorciado: 'Divorciado(a)',
        Ignorado: 'Ignorado',
        'Solteiro(a)': 'Solteiro(a)',
        'Casado(a)': 'Casado(a)',
        'Viúvo(a)': 'Viúvo(a)',
        'Divorciado(a)': 'Divorciado(a)',
        '': '',
      };
      patch.estadoCivil = (mapEstadoCivil as any)[patch.estadoCivil] ?? '';
      this.form.patchValue(patch);
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

  ngAfterViewInit() {
    // Adiciona um listener para corrigir ano com mais de 4 dígitos e limpar
    const inputEl = this.nascimentoInput.nativeElement;

    inputEl.addEventListener('input', () => {
      const rawValue = inputEl.value;
      const parts = rawValue.split('-');

      let year = parts[0];
      const month = parts[1] ?? '';
      const day = parts[2] ?? '';

      if (year && year.length > 4) {
        year = year.slice(0, 4);
        const newValue = [year, month, day].filter(Boolean).join('-');

        inputEl.value = newValue;

        this.invalidYearLength = true;

        this.form.get('nascimento')?.setValue(newValue, { emitEvent: false });
        this.form.get('nascimento')?.setErrors({ invalidYearLength: true });
      } else {
        this.invalidYearLength = false;
        const control = this.form.get('nascimento');
        if (control?.hasError('invalidYearLength')) {
          const errors = { ...control.errors };
          delete errors['invalidYearLength'];
          control.setErrors(Object.keys(errors).length ? errors : null);
          control.updateValueAndValidity();
        }
      }
    });
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
        next: () => {
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
          // Fecha o modal após cadastrar
          this.fechar.emit();
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
      alert(
        'Por favor, preencha todos os campos obrigatórios antes de gerar o PDF.'
      );
      return;
    }

    const paciente = this.form.value;
    const doc = new jsPDF.jsPDF();

    // Configuração das fontes e cores
    doc.setFontSize(20);
    doc.setTextColor(40);

    // Cabeçalho
    doc.text('e-Prontuário Aliança-PE', 20, 20);
    doc.setFontSize(14);
    doc.text('Ficha de Cadastro do Paciente', 20, 30);

    // Linha separadora
    doc.setLineWidth(0.5);
    doc.line(20, 35, 190, 35);

    // Dados do paciente
    doc.setFontSize(12);
    doc.setTextColor(0);

    let yPosition = 50;
    const lineHeight = 8;

    // Dados pessoais
    doc.setFont('helvetica', 'bold');
    doc.text('DADOS PESSOAIS', 20, yPosition);
    yPosition += lineHeight + 2;

    doc.setFont('helvetica', 'normal');
    if (paciente.nome) {
      doc.text(`Nome: ${paciente.nome}`, 20, yPosition);
      yPosition += lineHeight;
    }

    if (paciente.mae) {
      doc.text(`Nome da Mãe: ${paciente.mae}`, 20, yPosition);
      yPosition += lineHeight;
    }

    if (paciente.nascimento) {
      doc.text(
        `Data de Nascimento: ${new Date(paciente.nascimento).toLocaleDateString(
          'pt-BR'
        )}`,
        20,
        yPosition
      );
      yPosition += lineHeight;
    }

    if (paciente.sexo) {
      doc.text(`Sexo: ${this.formatarSexo(paciente.sexo)}`, 20, yPosition);
      yPosition += lineHeight;
    }

    if (paciente.estadoCivil) {
      doc.text(`Estado Civil: ${paciente.estadoCivil}`, 20, yPosition);
      yPosition += lineHeight;
    }

    if (paciente.profissao) {
      doc.text(`Profissão: ${paciente.profissao}`, 20, yPosition);
      yPosition += lineHeight;
    }

    if (paciente.escolaridade) {
      doc.text(`Escolaridade: ${paciente.escolaridade}`, 20, yPosition);
      yPosition += lineHeight;
    }

    if (paciente.raca) {
      doc.text(`Raça/Cor: ${paciente.raca}`, 20, yPosition);
      yPosition += lineHeight + 5;
    }

    // Endereço
    doc.setFont('helvetica', 'bold');
    doc.text('ENDEREÇO', 20, yPosition);
    yPosition += lineHeight + 2;

    doc.setFont('helvetica', 'normal');
    if (paciente.endereco) {
      doc.text(`Endereço: ${paciente.endereco}`, 20, yPosition);
      yPosition += lineHeight;
    }

    if (paciente.bairro) {
      doc.text(`Bairro: ${paciente.bairro}`, 20, yPosition);
      yPosition += lineHeight;
    }

    if (paciente.municipio) {
      doc.text(`Município: ${paciente.municipio}`, 20, yPosition);
      yPosition += lineHeight;
    }

    if (paciente.uf) {
      doc.text(`UF: ${paciente.uf}`, 20, yPosition);
      yPosition += lineHeight;
    }

    if (paciente.cep) {
      doc.text(`CEP: ${paciente.cep}`, 20, yPosition);
      yPosition += lineHeight + 5;
    }

    // Informações adicionais
    if (paciente.acompanhante || paciente.procedencia) {
      doc.setFont('helvetica', 'bold');
      doc.text('INFORMAÇÕES ADICIONAIS', 20, yPosition);
      yPosition += lineHeight + 2;

      doc.setFont('helvetica', 'normal');
      if (paciente.acompanhante) {
        doc.text(`Acompanhante: ${paciente.acompanhante}`, 20, yPosition);
        yPosition += lineHeight;
      }

      if (paciente.procedencia) {
        doc.text(`Procedência: ${paciente.procedencia}`, 20, yPosition);
        yPosition += lineHeight;
      }
    }

    // Rodapé
    const pageHeight = doc.internal.pageSize.height;
    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text(
      `Gerado em: ${new Date().toLocaleDateString(
        'pt-BR'
      )} às ${new Date().toLocaleTimeString('pt-BR')}`,
      20,
      pageHeight - 20
    );
    doc.text('Sistema e-Prontuário Aliança-PE', 20, pageHeight - 10);

    // Salvar arquivo com timestamp para evitar sobrescrita
    const nomeArquivo = `paciente_${(paciente.nome || 'novo')
      .replace(/\s+/g, '_')
      .toLowerCase()}_${new Date().getTime()}.pdf`;
    doc.save(nomeArquivo);
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

  nascimentoValidator(control: AbstractControl): ValidationErrors | null {
    const value = control.value;

    if (!value) return null;

    // Verifica se o valor segue o formato yyyy-mm-dd
    const regex = /^\d{4}-\d{2}-\d{2}$/;
    if (!regex.test(value)) return { invalidDateFormat: true };

    const year = Number(value.split('-')[0]);
    const currentYear = new Date().getFullYear();

    if (year > currentYear) {
      return { futureYear: true };
    }

    return null;
  }
}
