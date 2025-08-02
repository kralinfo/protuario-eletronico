export interface Usuario {
  id?: number;
  nome: string;
  email: string;
  senha?: string;
  nivel: NivelAcesso;
  modulos: ModuloAcesso[];
  created_at?: string;
  updated_at?: string;
  ultimoAcesso?: Date; // Adicione esta linha (opcional)
  criadoEm?: Date;
}

export interface UsuarioFormData {
  nome: string;
  email: string;
  senha: string;
  repetirSenha: string;
  nivel: NivelAcesso;
  modulos: ModuloAcesso[];
}

export type NivelAcesso = 'admin' | 'editor' | 'visualizador';

export type ModuloAcesso = 'recepcao' | 'triagem' | 'medico' | 'admin' | 'ambulatorio';

export interface UsuarioTableConfig {
  pageSize: number;
  pageSizeOptions: number[];
  currentPage: number;
  totalPages: number;
  searchTerm?: string;
}

export interface ModalState {
  showConfirmModal: boolean;
  showDeleteModal: boolean;
  showSuccessModal: boolean;
}

export interface LoadingState {
  loading: boolean;
  loadingRecuperarSenha: boolean;
}

export interface MessageState {
  error: string | null;
  success: string | null;
}
