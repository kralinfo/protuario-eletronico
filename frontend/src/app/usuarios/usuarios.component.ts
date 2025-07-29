
import { ValidatorFn, AbstractControl } from '@angular/forms';

export const senhasIguaisValidator: ValidatorFn = (control: AbstractControl) => {
  const form = control as import('@angular/forms').FormGroup;
  const senha = form.get('senha')?.value;
  const repetirSenha = form.get('repetirSenha')?.value;
  return senha && repetirSenha && senha !== repetirSenha ? { senhasDiferentes: true } : null;
};


import { Component, OnInit } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { FeedbackDialogComponent } from '../shared/feedback-dialog.component';
import { FormBuilder, Validators, FormGroup } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../environments/environment';
import { AuthService } from '../auth/auth.service';

@Component({
  selector: 'app-usuarios',
  templateUrl: './usuarios.component.html',
  styleUrls: ['./usuarios.component.scss'],
  standalone: false
})
export class UsuariosComponent implements OnInit {
  get podeSalvarUsuario(): boolean {
    const modulos = this.usuarioForm.get('modulos')?.value;
    return this.usuarioForm.valid && Array.isArray(modulos) && modulos.length > 0 && !this.loading && !this.isVisualizador;
  }
  get emptyRows(): any[] {
    // Sempre preenche até userPageSize linhas
    const count = this.userPageSize - (this.paginatedUsuarios?.length || 0);
    return count > 0 ? Array(count) : [];
  }
  // ...existing code...

  onModuloCheckboxChange(event: any) {
    const modulosForm = this.usuarioForm.get('modulos');
    if (!modulosForm) return;
    const modulos = modulosForm.value as string[];
    if (event.target.checked) {
      if (!modulos.includes(event.target.value)) {
        modulos.push(event.target.value);
      }
    } else {
      const idx = modulos.indexOf(event.target.value);
      if (idx > -1) {
        modulos.splice(idx, 1);
      }
    }
    modulosForm.setValue([...modulos]);
    modulosForm.markAsDirty();
  }
  public modulosDisponiveis = [
    { value: 'recepcao', label: 'Recepção' },
    { value: 'triagem', label: 'Triagem' },
    { value: 'medico', label: 'Médico' },
    { value: 'admin', label: 'Administração' },
    { value: 'ambulatorio', label: 'Ambulatório' }
  ];
  cancelarEdicao() {
    this.editandoUsuario = false;
    this.selectedUser = null;
    this.usuarioForm.reset({ nivel: 'visualizador' });
    this.clearMessages();
  }

  clearMessages() {
    this.error = null;
    this.success = null;
  }
  // Paginação de usuários
  userPageSizeOptions = [5, 10, 20, 50];
  userPageSize = 10;
  userCurrentPage = 0;
  userTotalPages = 1;
  filteredUsuarios: any[] = [];
  paginatedUsuarios: any[] = [];
  showConfirmModal = false;
  showDeleteModal = false;
  editandoUsuario = false;
  usuarios: any[] = [];
  usuarioForm: FormGroup;
  loading = false;
  loadingRecuperarSenha = false;
  error: string | null = null;
  success: string | null = null;
  showSuccessModal = false;
  niveis = [
    { value: 'admin', label: 'Administrador' },
    { value: 'editor', label: 'Editor' },
    { value: 'visualizador', label: 'Visualizador' }
  ];
  isVisualizador: boolean = false;
  selectedUser: any = null;

  constructor(
    private fb: FormBuilder,
    private http: HttpClient,
    public authService: AuthService,
    private dialog: MatDialog
  ) {
    this.usuarioForm = this.fb.group({
      nome: [{value: '', disabled: false}, Validators.required],
      email: [{value: '', disabled: false}, [Validators.required, Validators.email]],
      senha: [{value: '', disabled: false}, [Validators.required, Validators.minLength(6)]],
      repetirSenha: [{value: '', disabled: false}, Validators.required],
      nivel: [{value: 'visualizador', disabled: false}, Validators.required],
      modulos: [["recepcao"]] // valor padrão
    }, { validators: senhasIguaisValidator });
    // modulosDisponiveis já está declarado como membro público acima
  }
  

  ngOnInit(): void {
    this.isVisualizador = this.authService.user?.nivel === 'visualizador';
    this.listarUsuarios();
    this.filtrarUsuarios();
    // Ao entrar na tela, desmarca todos os módulos
    if (this.usuarioForm && this.usuarioForm.get('modulos')) {
      this.usuarioForm.get('modulos')?.setValue([]);
    }
  }

  onEditUser(user: any) {
    this.selectedUser = { ...user };
    this.usuarioForm.patchValue({
      nome: user.nome,
      email: user.email,
      senha: '', // Não preenche senha por segurança
      nivel: user.nivel
    });
    // Preenche os módulos do usuário selecionado
    if (this.usuarioForm.get('modulos')) {
      this.usuarioForm.get('modulos')?.setValue(user.modulos || []);
    }
    this.editandoUsuario = true;
    // Não abre o modal aqui, só ao tentar salvar
  }

  onDeleteUser(user: any) {
    this.selectedUser = { ...user };
    this.showDeleteModal = true;
  }

  onRecuperarSenhaUsuario(): void {
    if (!this.selectedUser || !this.selectedUser.email) {
      const dialogRef = this.dialog.open(FeedbackDialogComponent, {
        data: {
          title: 'Atenção',
          message: 'Usuário ou e-mail não encontrado.',
          type: 'error'
        }
      });
      setTimeout(() => dialogRef.close(), 2500);
      return;
    }
    this.loadingRecuperarSenha = true;
    this.http.post(`${environment.apiUrl}/forgot-password`, { email: this.selectedUser.email }).subscribe({
      next: () => {
        const dialogRef = this.dialog.open(FeedbackDialogComponent, {
          data: {
            title: 'Recuperação de senha',
            message: 'E-mail de recuperação enviado com sucesso!',
            type: 'success'
          }
        });
        setTimeout(() => dialogRef.close(), 2500);
        this.loadingRecuperarSenha = false;
      },
      error: (err: any) => {
        const dialogRef = this.dialog.open(FeedbackDialogComponent, {
          data: {
            title: 'Erro',
            message: err.error?.message || 'Erro ao enviar e-mail de recuperação.',
            type: 'error'
          }
        });
        setTimeout(() => dialogRef.close(), 2500);
        this.loadingRecuperarSenha = false;
      }
    });
  }

  confirmDelete() {
    // Implemente aqui a lógica de exclusão (API, etc)
    if (!this.selectedUser) return;
    this.loading = true;
    this.http.delete(`${environment.apiUrl}/usuarios/${this.selectedUser.id}`).subscribe({
      next: () => {
        this.success = 'Usuário excluído com sucesso!';
        setTimeout(() => { this.success = null; }, 3000);
        this.listarUsuarios();
        this.loading = false;
        this.showDeleteModal = false;
        this.selectedUser = null;
      },
      error: err => {
        this.error = err.error?.message || 'Erro ao excluir usuário';
        setTimeout(() => { this.error = null; }, 3000);
        this.loading = false;
        this.showDeleteModal = false;
        this.selectedUser = null;
      }
    });
  }

  cancelDelete() {
    this.showDeleteModal = false;
    this.selectedUser = null;
  }

  listarUsuarios() {
    this.loading = true;
    this.http.get<any[]>(`${environment.apiUrl}/usuarios`).subscribe({
      next: usuarios => {
        this.usuarios = usuarios;
        this.filtrarUsuarios();
        this.loading = false;
      },
      error: err => {
        this.error = 'Erro ao carregar usuários';
        this.loading = false;
      }
    });
  }

  filtrarUsuarios() {
    // Aqui pode adicionar filtro por nome/email se desejar
    this.filteredUsuarios = [...this.usuarios];
    this.userTotalPages = Math.ceil(this.filteredUsuarios.length / this.userPageSize) || 1;
    this.userCurrentPage = Math.min(this.userCurrentPage, this.userTotalPages - 1);
    this.paginarUsuarios();
  }

  paginarUsuarios() {
    const start = this.userCurrentPage * this.userPageSize;
    const end = start + this.userPageSize;
    this.paginatedUsuarios = this.filteredUsuarios.slice(start, end);
  }

  onUserPageSizeChange(event: any) {
    this.userPageSize = +event.target.value;
    this.userTotalPages = Math.ceil(this.filteredUsuarios.length / this.userPageSize) || 1;
    this.userCurrentPage = 0;
    this.paginarUsuarios();
  }

  goToUserFirstPage() {
    this.userCurrentPage = 0;
    this.paginarUsuarios();
  }

  goToUserPreviousPage() {
    if (this.userCurrentPage > 0) {
      this.userCurrentPage--;
      this.paginarUsuarios();
    }
  }

  goToUserNextPage() {
    if (this.userCurrentPage < this.userTotalPages - 1) {
      this.userCurrentPage++;
      this.paginarUsuarios();
    }
  }

  goToUserLastPage() {
    this.userCurrentPage = this.userTotalPages - 1;
    this.paginarUsuarios();
  }

  onSubmit() {
    const modulos = this.usuarioForm.get('modulos')?.value;
    if (this.usuarioForm.invalid || !Array.isArray(modulos) || modulos.length === 0) {
      if (this.usuarioForm.errors?.['senhasDiferentes']) {
        this.error = 'As senhas não coincidem.';
      }
      if (!Array.isArray(modulos) || modulos.length === 0) {
        this.error = 'Selecione pelo menos um módulo.';
      }
      return;
    }
    if (this.editandoUsuario) {
      this.showConfirmModal = true;
    } else {
      this.cadastrarUsuario();
    }
  }

  confirmEdit() {
    this.showConfirmModal = false;
    this.cadastrarUsuario();
    this.editandoUsuario = false;
  }

  cancelEdit() {
    this.showConfirmModal = false;
  }

  cadastrarUsuario() {
    this.loading = true;
    if (this.editandoUsuario && this.selectedUser) {
      // PUT para editar
      this.http.put(`${environment.apiUrl}/usuarios/${this.selectedUser.id}`, this.usuarioForm.value).subscribe({
        next: () => {
          const dialogRef = this.dialog.open(FeedbackDialogComponent, {
            data: {
              title: 'Sucesso',
              message: 'Usuário editado com sucesso!',
              type: 'success'
            }
          });
          setTimeout(() => {
            dialogRef.close();
          }, 2500);
          this.success = 'Usuário editado com sucesso!';
          setTimeout(() => { this.success = null; }, 3000);
          this.usuarioForm.reset({ nivel: 'visualizador' });
          this.listarUsuarios();
          this.loading = false;
          this.editandoUsuario = false;
          this.selectedUser = null;
        },
        error: err => {
          let msg = 'Erro ao editar usuário';
          if (err.error?.error) {
            msg = err.error.error;
          } else if (err.error?.message) {
            msg = err.error.message;
          }
          const dialogRef = this.dialog.open(FeedbackDialogComponent, {
            data: {
              title: 'Erro',
              message: msg,
              type: 'error'
            }
          });
          setTimeout(() => {
            dialogRef.close();
          }, 2500);
          this.error = msg;
          setTimeout(() => { this.error = null; }, 3000);
          this.loading = false;
        }
      });
    } else {
      // POST para cadastrar
      this.http.post(`${environment.apiUrl}/usuarios`, this.usuarioForm.value).subscribe({
        next: () => {
          const dialogRef = this.dialog.open(FeedbackDialogComponent, {
            data: {
              title: 'Sucesso',
              message: 'Usuário cadastrado com sucesso!',
              type: 'success'
            }
          });
          setTimeout(() => {
            dialogRef.close();
          }, 2500);
          this.success = 'Usuário cadastrado com sucesso!';
          setTimeout(() => { this.success = null; }, 3000);
          this.usuarioForm.reset({ nivel: 'visualizador' });
          this.listarUsuarios();
          this.loading = false;
        },
        error: err => {
          let msg = 'Erro ao cadastrar usuário';
          if (err.error?.error) {
            msg = err.error.error;
          } else if (err.error?.message) {
            msg = err.error.message;
          }
          const dialogRef = this.dialog.open(FeedbackDialogComponent, {
            data: {
              title: 'Erro',
              message: msg,
              type: 'error'
            }
          });
          setTimeout(() => {
            dialogRef.close();
          }, 2500);
          this.error = msg;
          setTimeout(() => { this.error = null; }, 3000);
          this.loading = false;
        }
      });
    }
  }
  fecharSuccessModal() {
    this.showSuccessModal = false;
    this.success = null;
  }

  podeCadastrar() {
    return this.authService.isAdmin;
  }

  verificarEmailEmUso(email: string) {
    if (!email || !email.includes('@')) {
      // Não limpa erro de outras validações
      return;
    }
    this.http.get<any[]>(`${environment.apiUrl}/usuarios?email=${encodeURIComponent(email)}`).subscribe({
      next: (usuarios) => {
        // Se está editando, ignora o próprio usuário
        const emailEmUso = usuarios && usuarios.length > 0 && (!this.editandoUsuario || usuarios[0].id !== this.selectedUser?.id);
        if (emailEmUso) {
          if (this.error !== 'Email já está em uso') {
            this.error = 'Email já está em uso';
            setTimeout(() => {
              if (this.error === 'Email já está em uso') this.error = null;
            }, 3000);
          }
        } else {
          // Só limpa se não houver outros erros de validação
          if (this.error === 'Email já está em uso') {
            this.error = null;
          }
        }
      },
      error: () => {
        // Não sobrescreve outros erros
      }
    });
  }
}
