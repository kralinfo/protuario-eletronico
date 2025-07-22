import { Component, OnInit } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { FeedbackDialogComponent } from '../shared/feedback-dialog.component';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
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
  cancelarEdicao() {
    this.editandoUsuario = false;
    this.selectedUser = null;
    this.usuarioForm.reset({ nivel: 'visualizador' });
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
      nivel: [{value: 'visualizador', disabled: false}, Validators.required]
    });
  }

  ngOnInit(): void {
    this.isVisualizador = this.authService.user?.nivel === 'visualizador';
    this.listarUsuarios();
    this.filtrarUsuarios();
  }

  onEditUser(user: any) {
    this.selectedUser = { ...user };
    this.usuarioForm.patchValue({
      nome: user.nome,
      email: user.email,
      senha: '', // Não preenche senha por segurança
      nivel: user.nivel
    });
    this.editandoUsuario = true;
    // Não abre o modal aqui, só ao tentar salvar
  }

  onDeleteUser(user: any) {
    this.selectedUser = { ...user };
    this.showDeleteModal = true;
  }

  confirmDelete() {
    // Implemente aqui a lógica de exclusão (API, etc)
    if (!this.selectedUser) return;
    this.loading = true;
    this.http.delete(`${environment.apiUrl}/usuarios/${this.selectedUser.id}`).subscribe({
      next: () => {
        this.success = 'Usuário excluído com sucesso!';
        this.listarUsuarios();
        this.loading = false;
        this.showDeleteModal = false;
        this.selectedUser = null;
      },
      error: err => {
        this.error = err.error?.message || 'Erro ao excluir usuário';
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
    if (this.usuarioForm.invalid) return;
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
    if (!email || !email.includes('@')) return;
    this.http.get<any[]>(`${environment.apiUrl}/usuarios?email=${encodeURIComponent(email)}`).subscribe({
      next: (usuarios) => {
        if (usuarios && usuarios.length > 0 && (!this.editandoUsuario || usuarios[0].id !== this.selectedUser?.id)) {
          this.error = 'Email já está em uso';
        } else {
          this.error = null;
        }
      },
      error: () => {
        this.error = null;
      }
    });
  }
}
