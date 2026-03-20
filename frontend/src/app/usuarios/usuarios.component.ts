import { Component, OnInit, OnDestroy, signal, computed, inject, DestroyRef, ViewChild, TemplateRef } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatDialog } from '@angular/material/dialog';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { debounceTime, distinctUntilChanged, switchMap, EMPTY, catchError, of } from 'rxjs';

import { FeedbackDialogComponent } from '../shared/feedback-dialog/feedback-dialog.component';
import { AuthService } from '../auth/auth.service';
import { UsuarioService } from './services/usuario.service';
import { UsuarioValidators } from './validators/usuario.validators';
import {
  Usuario,
  UsuarioFormData,
  UsuarioTableConfig,
  ModalState,
  LoadingState,
  MessageState
} from './models/usuario.interface';
import {
  NIVEIS_ACESSO,
  MODULOS_DISPONIVEIS,
  PAGINATION_CONFIG
} from './constants/usuario.constants';

@Component({
  selector: 'app-usuarios',
  templateUrl: './usuarios.component.html',
  styleUrls: ['./usuarios.component.scss', '../shared/styles/table-footer.css'],
  standalone: false
})

export class UsuariosComponent implements OnInit, OnDestroy {

  hidePassword = true;
  hideRepetirSenha = true;
  // Injeção de dependências usando inject()
  private readonly fb = inject(FormBuilder);
  private readonly dialog = inject(MatDialog);
  private readonly authService = inject(AuthService);
  private readonly usuarioService = inject(UsuarioService);
  private readonly destroyRef = inject(DestroyRef);

  // Signals para estado reativo
  readonly usuarios = signal<Usuario[]>([]);
  readonly filteredUsuarios = signal<Usuario[]>([]);
  readonly paginatedUsuarios = signal<Usuario[]>([]);
  readonly selectedUser = signal<Usuario | null>(null);
  readonly editandoUsuario = signal<boolean>(false);

  // Estados usando signals
  readonly modalState = signal<ModalState>({
    showConfirmModal: false,
    showDeleteModal: false,
    showSuccessModal: false
  });

  readonly loadingState = signal<LoadingState>({
    loading: false,
    loadingRecuperarSenha: false
  });

  readonly messageState = signal<MessageState>({
    error: null,
    success: null
  });

  readonly tableConfig = signal<UsuarioTableConfig>({
    pageSize: PAGINATION_CONFIG.DEFAULT_PAGE_SIZE,
    pageSizeOptions: [...PAGINATION_CONFIG.PAGE_SIZE_OPTIONS],
    currentPage: 0,
    totalPages: 1
  });

  // Computed properties usando signals
  readonly isVisualizador = computed(() => this.authService.user?.nivel === 'visualizador');
  readonly podeCadastrar = computed(() => this.authService.isAdmin);
  readonly emptyRows = computed(() => {
    const count = this.tableConfig().pageSize - this.paginatedUsuarios().length;
    return count > 0 ? Array(count).fill({}) : [];
  });

  get podeSalvarUsuario() {
  const form = this.usuarioForm;
  if (!form) return false;
  const isLoading = this.loadingState().loading;
  const isVisualizador = this.isVisualizador();
  return form.valid === true && isLoading === false && isVisualizador === false;
  }

  get podeAtualizarUsuario() {
    const form = this.usuarioForm;
    if (!form) return false;
    const isLoading = this.loadingState().loading;
    const isVisualizador = this.isVisualizador();
    // Considera apenas os campos obrigatórios para edição (exclui senha e repetirSenha)
    const nomeValido = form.get('nome')?.valid;
    const emailValido = form.get('email')?.valid;
    const nivelValido = form.get('nivel')?.valid;
    const modulosValido = form.get('modulos')?.valid;
    return nomeValido && emailValido && nivelValido && modulosValido && isLoading === false && isVisualizador === false;
  }

  // Método simples para verificar se pode salvar
  canSave(): boolean {
    if (!this.usuarioForm) return false;

    const form = this.usuarioForm;
    const modulos = form.get('modulos')?.value;
    const isLoading = this.loadingState().loading;

    return form.valid &&
           Array.isArray(modulos) &&
           modulos.length > 0 &&
           !isLoading;
  }

  // Constantes públicas para template
  public readonly niveisAcesso = [
    { value: 'visualizador', label: 'Visualizador' },
    { value: 'editor', label: 'Editor' },
    { value: 'administrador', label: 'Administrador' } // Novo nível de acesso adicionado
  ];
  readonly modulosDisponiveis = MODULOS_DISPONIVEIS;
  readonly paginationConfig = PAGINATION_CONFIG;

  // Form group
  usuarioForm!: FormGroup;
  @ViewChild('usuarioDialog') usuarioDialog!: TemplateRef<any>;
  dialogRef: any = null;
  // Campo de busca
  searchTerm: string = '';

  ngOnInit(): void {
    this.initializeForm();
    this.loadUsuarios();
    this.setupEmailValidation();
  }

  openCreateDialog(): void {
    this.resetForm();
    this.dialogRef = this.dialog.open(this.usuarioDialog, {
      width: '900px',
      maxHeight: '90vh'
    });
  }

  ngOnDestroy(): void {
    // Cleanup automático com takeUntilDestroyed
  }

  private initializeForm(): void {
    this.usuarioForm = this.fb.group({
      nome: ['', [Validators.required, Validators.minLength(2)]],
      email: ['', [Validators.required, UsuarioValidators.emailValido()]],
      senha: [''],
      repetirSenha: [''],
      nivel: ['visualizador', Validators.required],
      modulos: [['recepcao'], UsuarioValidators.modulosObrigatorios()]
    });

    // Aplicar validadores condicionais baseados no modo de edição
    // Usar effect em vez de subscribe para signals
    this.updateFormValidators(false);
  }
  filterUsuarios(): void {
    // Implementação de filtro se necessário
    this.updateFilteredUsuarios();
  }

  private updateFormValidators(isEditing: boolean): void {
    const senhaControl = this.usuarioForm.get('senha');
    const repetirSenhaControl = this.usuarioForm.get('repetirSenha');

    if (isEditing) {
      // Em modo de edição, senha não é obrigatória
      senhaControl?.clearValidators();
      repetirSenhaControl?.clearValidators();
      this.usuarioForm.clearValidators();
    } else {
      // Em modo de criação, senha é obrigatória
      senhaControl?.setValidators([Validators.required, UsuarioValidators.senhaMinima()]);
      repetirSenhaControl?.setValidators([Validators.required]);
      this.usuarioForm.setValidators([UsuarioValidators.senhasIguais()]);
    }

    // IMPORTANTE: Atualizar validity após mudança de validadores
    senhaControl?.updateValueAndValidity();
    repetirSenhaControl?.updateValueAndValidity();
    this.usuarioForm.updateValueAndValidity();
  }

  private setupEmailValidation(): void {
    this.usuarioForm.get('email')?.valueChanges
      .pipe(
        debounceTime(500),
        distinctUntilChanged(),
        switchMap(email => {
          if (!email || !email.includes('@')) {
            return EMPTY;
          }
          return this.usuarioService.verificarEmailEmUso(email).pipe(
            catchError(() => of([]))
          );
        }),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe(usuarios => {
        this.handleEmailValidation(usuarios);
      });
  }

  private handleEmailValidation(usuarios: Usuario[]): void {
    const isEditing = this.editandoUsuario();
    const selectedUserId = this.selectedUser()?.id;
    const emailEmUso = usuarios.length > 0 &&
                      (!isEditing || usuarios[0].id !== selectedUserId);

    if (emailEmUso) {
      this.setError('Email já está em uso');
    } else {
      this.clearError('Email já está em uso');
    }
  }

  private loadUsuarios(): void {
    this.setLoading(true);

    this.usuarioService.listarUsuarios()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (usuarios) => {
          this.usuarios.set(usuarios);
          this.updateFilteredUsuarios();
          this.setLoading(false);
        },
        error: () => {
          this.setError('Erro ao carregar usuários');
          this.setLoading(false);
        }
      });
  }

  private updateFilteredUsuarios(): void {
    const term = (this.searchTerm || '').trim().toLowerCase();
    if (!term) {
      this.filteredUsuarios.set([...this.usuarios()]);
    } else {
      const filtered = this.usuarios().filter(u => {
        return (u.nome || '').toLowerCase().includes(term) ||
               (u.email || '').toLowerCase().includes(term) ||
               (u.nivel || '').toLowerCase().includes(term);
      });
      this.filteredUsuarios.set(filtered);
    }
    this.updatePagination();
  }

  onSearchChange(value: string): void {
    this.searchTerm = value || '';
    this.updateFilteredUsuarios();
  }

  private updatePagination(): void {
    const filtered = this.filteredUsuarios();
    const config = this.tableConfig();
    const totalPages = Math.ceil(filtered.length / config.pageSize) || 1;
    const currentPage = Math.min(config.currentPage, totalPages - 1);

    this.tableConfig.update(current => ({
      ...current,
      totalPages,
      currentPage
    }));

    this.updatePaginatedUsuarios();
  }

  private updatePaginatedUsuarios(): void {
    const config = this.tableConfig();
    const filtered = this.filteredUsuarios();
    const start = config.currentPage * config.pageSize;
    const end = start + config.pageSize;

    this.paginatedUsuarios.set(filtered.slice(start, end));
  }

  // Métodos públicos para template
  onEditUser(user: Usuario): void {
    this.selectedUser.set({ ...user });
    this.editandoUsuario.set(true);

    this.usuarioForm.patchValue({
      nome: user.nome,
      email: user.email,
      senha: '',
      nivel: user.nivel,
      modulos: user.modulos || []
    });

    // Atualizar validadores para modo de edição (senha não obrigatória)
    this.updateFormValidators(true);

    this.clearMessages();
    // Abrir diálogo de edição
    this.dialogRef = this.dialog.open(this.usuarioDialog, {
      width: '900px',
      maxHeight: '90vh'
    });
  }

  onDeleteUser(user: Usuario): void {
    this.selectedUser.set({ ...user });
    this.modalState.update(state => ({ ...state, showDeleteModal: true }));
  }

  onModuloCheckboxChange(event: Event): void {
    const target = event.target as HTMLInputElement;
    const modulosControl = this.usuarioForm.get('modulos');

    if (!modulosControl) return;

    const modulos = [...modulosControl.value] as string[];

    if (target.checked) {
      if (!modulos.includes(target.value)) {
        modulos.push(target.value);
      }
    } else {
      const index = modulos.indexOf(target.value);
      if (index > -1) {
        modulos.splice(index, 1);
      }
    }

    modulosControl.setValue(modulos);
    modulosControl.markAsDirty();
  }

  onSubmit(): void {
    const modulos = this.usuarioForm.get('modulos')?.value;

    if (this.usuarioForm.invalid || !Array.isArray(modulos) || modulos.length === 0) {
      this.handleFormErrors();
      return;
    }

    if (this.editandoUsuario()) {
      this.modalState.update(state => ({ ...state, showConfirmModal: true }));
    } else {
      this.saveUsuario();
    }
  }

  confirmEdit(): void {
    this.modalState.update(state => ({ ...state, showConfirmModal: false }));
    this.saveUsuario();
  }

  cancelEdit(): void {
    this.modalState.update(state => ({ ...state, showConfirmModal: false }));
  }

  confirmDelete(): void {
    const user = this.selectedUser();
    if (!user?.id) return;

    this.setLoading(true);

    this.usuarioService.excluirUsuario(user.id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.showSuccessDialog('Usuário excluído com sucesso!');
          this.loadUsuarios();
          this.setLoading(false);
          this.cancelDelete();
        },
        error: (err) => {
          this.handleError(err, 'Erro ao excluir usuário');
          this.setLoading(false);
          this.cancelDelete();
        }
      });
  }

  cancelDelete(): void {
    this.modalState.update(state => ({ ...state, showDeleteModal: false }));
    this.selectedUser.set(null);
  }

  recuperarSenha(): void {
    const user = this.selectedUser();
    if (!user?.email) {
      this.showErrorDialog('Usuário ou e-mail não encontrado.');
      return;
    }

    this.setLoadingRecuperarSenha(true);

    this.usuarioService.recuperarSenha(user.email)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.showSuccessDialog('E-mail de recuperação enviado com sucesso!');
          this.setLoadingRecuperarSenha(false);
        },
        error: (err) => {
          this.handleError(err, 'Erro ao enviar e-mail de recuperação.');
          this.setLoadingRecuperarSenha(false);
        }
      });
  }

  cancelarEdicao(): void {
    this.editandoUsuario.set(false);
    this.selectedUser.set(null);
    this.usuarioForm.reset({ nivel: 'visualizador', modulos: ['recepcao'] });

    // Voltar validadores para modo de criação (senha obrigatória)
    this.updateFormValidators(false);

    this.clearMessages();
    // Fechar diálogo se aberto
    if (this.dialogRef) {
      try { this.dialogRef.close(); } catch (e) {}
      this.dialogRef = null;
    }
  }

  // Métodos de paginação
  onPageSizeChange(event: Event): void {
    const target = event.target as HTMLSelectElement;
    const pageSize = +target.value;

    this.tableConfig.update(config => ({
      ...config,
      pageSize,
      currentPage: 0
    }));

    this.updatePagination();
  }

  goToFirstPage(): void {
    this.tableConfig.update(config => ({ ...config, currentPage: 0 }));
    this.updatePaginatedUsuarios();
  }

  goToPreviousPage(): void {
    this.tableConfig.update(config => ({
      ...config,
      currentPage: Math.max(0, config.currentPage - 1)
    }));
    this.updatePaginatedUsuarios();
  }

  goToNextPage(): void {
    this.tableConfig.update(config => ({
      ...config,
      currentPage: Math.min(config.totalPages - 1, config.currentPage + 1)
    }));
    this.updatePaginatedUsuarios();
  }

  goToLastPage(): void {
    this.tableConfig.update(config => ({
      ...config,
      currentPage: config.totalPages - 1
    }));
    this.updatePaginatedUsuarios();
  }

  // Handler usado pelo componente de paginação compartilhado
  onPageChange(pageOneBased: number): void {
    const page = Math.max(0, pageOneBased - 1);
    this.tableConfig.update(config => ({ ...config, currentPage: page }));
    this.updatePaginatedUsuarios();
  }

  // Métodos privados de apoio
  private saveUsuario(): void {
    this.setLoading(true);
    let formData = this.usuarioForm.value as UsuarioFormData;

    // Se estiver editando e a senha estiver vazia, remover do objeto
    if (this.editandoUsuario() && (!formData.senha || formData.senha.trim() === '')) {
      const { senha, repetirSenha, ...dataWithoutPassword } = formData;
      formData = dataWithoutPassword as UsuarioFormData;
    }

    const operation = this.editandoUsuario() && this.selectedUser()?.id
      ? this.usuarioService.atualizarUsuario(this.selectedUser()!.id!, formData)
      : this.usuarioService.criarUsuario(formData);

    operation
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          const message = this.editandoUsuario()
            ? 'Usuário editado com sucesso!'
            : 'Usuário cadastrado com sucesso!';

          this.showSuccessDialog(message);
          this.resetForm();
          this.loadUsuarios();
          this.setLoading(false);
          // Fechar diálogo se estiver aberto
          if (this.dialogRef) {
            try { this.dialogRef.close(); } catch (e) {}
            this.dialogRef = null;
          }
        },
        error: (err) => {
          this.handleError(err, this.editandoUsuario() ? 'Erro ao editar usuário' : 'Erro ao cadastrar usuário');
          this.setLoading(false);
        }
      });
  }

  public resetForm(): void {
    this.usuarioForm.reset({ nivel: 'visualizador', modulos: ['recepcao'] });
    this.editandoUsuario.set(false);
    this.selectedUser.set(null);

    // Voltar validadores para modo de criação (senha obrigatória)
    this.updateFormValidators(false);

    this.clearMessages();
  }

  formatDate(date: Date | string): string {
  if (!date) return '';

  const dateObj = typeof date === 'string' ? new Date(date) : date;
  return dateObj.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

  private handleFormErrors(): void {
    const formErrors = this.usuarioForm.errors;
    const modulosControl = this.usuarioForm.get('modulos');

    if (formErrors?.['senhasDiferentes']) {
      this.setError('As senhas não coincidem.');
      return;
    }

    if (!modulosControl?.value?.length) {
      this.setError('Selecione pelo menos um módulo.');
      return;
    }

    // Se chegou aqui, mostrar erro genérico
    this.setError('Preencha todos os campos obrigatórios corretamente.');
  }

  private handleError(error: any, defaultMessage: string): void {
    const message = error.error?.error || error.error?.message || defaultMessage;
    this.showErrorDialog(message);
    this.setError(message);
  }

  private showSuccessDialog(message: string): void {
    const dialogRef = this.dialog.open(FeedbackDialogComponent, {
      data: { title: 'Sucesso', message, type: 'success' }
    });
    setTimeout(() => dialogRef.close(), 2500);
  }

  private showErrorDialog(message: string): void {
    const dialogRef = this.dialog.open(FeedbackDialogComponent, {
      data: { title: 'Erro', message, type: 'error' }
    });
    setTimeout(() => dialogRef.close(), 2500);
  }

  private setLoading(loading: boolean): void {
    this.loadingState.update(state => ({ ...state, loading }));
  }

  private setLoadingRecuperarSenha(loading: boolean): void {
    this.loadingState.update(state => ({ ...state, loadingRecuperarSenha: loading }));
  }

  private setError(error: string): void {
    this.messageState.update(state => ({ ...state, error }));
    setTimeout(() => this.clearError(error), 3000);
  }

  private clearError(specificError?: string): void {
    this.messageState.update(state => ({
      ...state,
      error: specificError && state.error === specificError ? null : state.error
    }));
  }

  private setSuccess(success: string): void {
    this.messageState.update(state => ({ ...state, success }));
    setTimeout(() => this.clearSuccess(), 3000);
  }

  private clearSuccess(): void {
    this.messageState.update(state => ({ ...state, success: null }));
  }

  private clearMessages(): void {
    this.messageState.set({ error: null, success: null });
  }

  // Métodos auxiliares para template
  trackByUserId(index: number, usuario: Usuario): number {
    return usuario.id || index;
  }

  getInitials(nome: string): string {
    return nome
      .split(' ')
      .map(part => part.charAt(0))
      .join('')
      .substring(0, 2)
      .toUpperCase();
  }

  getNivelLabel(nivel: string): string {
    const nivelObj = this.niveisAcesso.find(n => n.value === nivel);
    return nivelObj?.label || nivel;
  }

  getModuloLabel(modulo: string): string {
    const moduloObj = this.modulosDisponiveis.find(m => m.value === modulo);
    return moduloObj?.label || modulo;
  }

  getDisplayRange(): string {
    const config = this.tableConfig();
    const start = config.currentPage * config.pageSize + 1;
    const end = Math.min((config.currentPage + 1) * config.pageSize, this.filteredUsuarios().length);
    return `${start} - ${end}`;
  }
}
